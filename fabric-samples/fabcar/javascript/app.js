const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const nodemailer = require('nodemailer');
const niceware = require('niceware');

app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));


// Setting for Hyperledger Fabric
const { Gateway, Wallets } = require('fabric-network');
const path = require('path');
const fs = require('fs');
const { nextTick } = require("process");
const { info } = require("console");



const interestBorrow = 0.05;    // Loan interest is 5%
const interestDeposit = 0.03;   // Deposit interest is 3%
const senderEmail = "BCI1Group3@outlook.com";
const senderPassword = "Blockchain123?";

var Members = [
  { NRIC : "", 
    NRIC_NAME : "", 
    EMAIL : "",
    MOBILE : "", 
    AMOUNT: "", 
    INTEREST : "",
    PAYEE_ACCOUNT_NUMBER : "",
    PAYEE_ACCOUNT_NAME : "",
    TRANSACTION_DATE : "", 
    STATUS : ""
  }];

app.get("/", function (req, res) {
  res.render("home");
});

app.get("/backToLogin", function (req, res) {
  res.render("backToLogin", {STATUS: Members.STATUS});
})

app.get("/login", function (req, res) {
  res.render("login", {STATUS: Members.STATUS});
});

app.post("/login", async function(req, res) {
  const nric = req.body.nric;
  const password = req.body.password;
  const reset = req.body.reset;

  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    //console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
        console.log('An identity for the user "appUser" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    const result = await contract.evaluateTransaction("queryData", nric);
    if (result.length > 0) {
      const r = JSON.parse(result.toString());
      if (reset != null) {
        var email = r.email;
        const passphrase = niceware.generatePassphrase(8);   // the number of bytes must be even
        var new_password = passphrase[0];                        // retrieve the 1st password from the array
        
        await contract.submitTransaction("changeData", nric, new_password, r.email, r.mobile, r.amount, r.interest,
        r.payee_account_number, r.payee_account_name, r.transaction_date, r.status);

        const transporter = nodemailer.createTransport({
          service: 'hotmail',
          auth: {
            user: senderEmail,
            pass: senderPassword
          }
        });

        const Options = {
          from: senderEmail,
          to: email,
          subject: 'Password Reset',
          text: 'Your new password is ' + new_password
        };

        transporter.sendMail(Options, function (Mailerr, info) {
          if (Mailerr) {
            console.log(Mailerr);
            return;
          }
          console.log("New password = " + new_password);
          res.render("backToLogin", {STATUS: "Your new password has been send to your email"});
        });


      } else {
        if (password === r.password) {
          if (r.status === "New User") {
            res.render("changePassword", {NRIC: r.nric, NRIC_NAME: r.nric_name, PASSWORD: r.password, 
                                          STATUS:"Please change your password"});
          } else if (r.status === "Registration") {

            res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
              MOBILE : r.mobile, BORROW_AMOUNT: "0", BORROW_INTEREST : (interestBorrow*100).toString(),
              BORROW_ACCOUNT_NAME : r.nric_name, BORROW_ACCOUNT_NUMBER : "0",
              DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
              DEPOSIT_ACCOUNT_NAME : r.nric_name, DEPOSIT_ACCOUNT_NUMBER : "0",
              TRANSACTION_DATE : r.transaction_date, STATUS : r.status});
          } else {
            res.render("displayLedger", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
                                        MOBILE : r.mobile, AMOUNT: r.amount, INTEREST : r.interest,
                                        PAYEE_ACCOUNT_NUMBER : r.payee_account_number,
                                        PAYEE_ACCOUNT_NAME : r.payee_account_name,
                                        TRANSACTION_DATE : r.transaction_date, STATUS : r.status});
          }
        } else {
          res.render("backToLogin", {STATUS: "Invalid Password"});
        }
      }
    } else {
      res.render("backToLogin", {STATUS: "Invalid NRIC"});
    }

    // Disconnect from the gateway.
    await gateway.disconnect();    
  } catch (error) {
     console.error(`Failed to evaluate transaction: ${error}`);
     process.exit(1);
  }
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.post("/register", async function (req, res) {
  const nric = req.body.nric;
  var nric_name = req.body.nric_name;
  var email = req.body.email;
  var mobile = req.body.mobile;
  var status = "";

  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    //console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
      console.log('An identity for the user "appUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    var result = await contract.evaluateTransaction("queryData", nric);

    if (!result || result.length === 0) {
      console.log("Contacting Credit Bureau API. Checking credit rating ...");
      status = "New User";

      var amount = "";
      var interest = "";
      var payee_account_number = "";
      var payee_account_name = "";
      registration_date = new Date();
      registration_date = registration_date.toDateString();
      const passphrase = niceware.generatePassphrase(8);   // the number of bytes must be even
      var password = passphrase[0];                        // retrieve the 1st password from the array

      console.log("Credit approved! ...");

      await contract.submitTransaction("newData", nric, password, nric_name, email, mobile, amount,
        interest, payee_account_number, payee_account_name,
        registration_date, status);

      console.log("Registration successful!");

      const transporter = nodemailer.createTransport({
        service: 'hotmail',
        auth: {
          user: senderEmail,
          pass: senderPassword
        }
      });
    
      const Options = {
        from: senderEmail,
        to: email,
        subject: 'Your Password',
        text: 'Your password is ' + password
      }

      transporter.sendMail(Options, function (err, info) {
       if (err) {
         console.log(err);
         return;
       }
      });

      console.log("Password send to email! Password is " + password);
      res.render("backToLogin", {STATUS: "Password has been sent to your email"});
    } else {
      res.render("backToLogin", {STATUS: "You have registered previously!"});
    }

    // Disconnect from the gateway.
    await gateway.disconnect();

  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    process.exit(1);
  }
});

app.post("/lenderBorrower", async function (req, res) {
  const nric = req.body.nric;
  var borrow_amount = parseInt(req.body.borrow_amount);
  if (isNaN(borrow_amount)) {
    borrow_amount = 0;
  }
  var borrow_payee_account_name = req.body.borrow_payee_account_name;
  var borrow_payee_account_number = parseInt(req.body.borrow_payee_account_number);
  if (isNaN(borrow_payee_account_number)) {
    borrow_payee_account_number = 0;
  }
  var deposit_amount = parseInt(req.body.deposit_amount);
  if (isNaN(deposit_amount)) {
    deposit_amount = 0;
  }
  var deposit_payee_account_name = req.body.deposit_payee_account_name;
  var deposit_payee_account_number = parseInt(req.body.deposit_payee_account_number);
  if (isNaN(deposit_payee_account_number)) {
    deposit_payee_account_number = 0;
  }

  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    //console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
      console.log('An identity for the user "appUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    const result = await contract.evaluateTransaction("queryData", nric);
    if (result.length > 0) {
      const r = JSON.parse(result.toString());

      if (borrow_amount > 0 && deposit_amount > 0) {
        //console.log ("Please select either borrower or depositer");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          TRANSACTION_DATE : r.transaction_date, STATUS : "Please select either borrower or depositer"});
      } else if (borrow_amount === 0 && deposit_amount === 0) {
        //console.log ("Invalid amount");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          TRANSACTION_DATE : r.transaction_date, STATUS : "Invalid Amount"});
      } else if (borrow_amount > 0 && borrow_amount > 2000) {
        //console.log ("Maximum loan allowed is $2,000");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : "", DEPOSIT_ACCOUNT_NUMBER : "0",
          TRANSACTION_DATE : r.transaction_date, STATUS : "Maximum loan allowed is $2,000"});
      } else if (borrow_amount > 0 && borrow_amount < 500) {
        //console.log ("Minimum loan allowed is $500");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : "", DEPOSIT_ACCOUNT_NUMBER : "0",
          TRANSACTION_DATE : r.transaction_date, STATUS : "Minimum loan allowed is $500"});
      } else if (borrow_amount > 0 && (borrow_payee_account_name === "" || borrow_payee_account_number === 0)) {
        //console.log ("Borrower's Bank Account is invalid");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : "", DEPOSIT_ACCOUNT_NUMBER : "0",
          TRANSACTION_DATE : r.transaction_date, STATUS : "Borrower's Bank Account is invalid"});
      } else if (deposit_amount > 0 && deposit_amount > 30000) {
        //console.log("Maximum deposit allowed is $30,000");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: "0", BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : "", BORROW_ACCOUNT_NUMBER : "0",
          DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          TRANSACTION_DATE : r.transaction_date, STATUS : "Maximum deposit allowed is $30,000"});
      } else if (deposit_amount > 0 && deposit_amount < 5000) {
        //console.log("Minimum deposit allowed is $5,000");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: "0", BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : "", BORROW_ACCOUNT_NUMBER : "0",
          DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          TRANSACTION_DATE : r.transaction_date, STATUS : "Minimum deposit allowed is $5,000"});
      } else if (deposit_amount > 0 && (deposit_payee_account_name === "" || deposit_payee_account_number === 0)) {
        //console.log("Depositer's Bank Account is invalid");
        res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          MOBILE : r.mobile, BORROW_AMOUNT: "0", BORROW_INTEREST : (interestBorrow*100).toString(),
          BORROW_ACCOUNT_NAME : "", BORROW_ACCOUNT_NUMBER : "0",
          DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          TRANSACTION_DATE : r.transaction_date, STATUS : "Depositer's Bank Account is invalid"});
      } else {

        var new_transaction_date = new Date();   // today date
        var new_amount = "";
        var new_interest = "";
        var new_payee_account_name = "";
        var new_payee_account_number = "";
        var new_status = "";
  
        if (borrow_amount > 0) {
          new_amount = (borrow_amount + (borrow_amount*interestBorrow)).toString();
          new_interest = (Math.round(new_amount / 6)).toString();
          new_payee_account_name = borrow_payee_account_name;
          new_payee_account_number = borrow_payee_account_number;
          new_transaction_date.setMonth(new_transaction_date.getMonth() + 1);   // monthly premium collection
          new_transaction_date = new_transaction_date.toDateString();
          new_status = "next payment date and amount";

          await contract.submitTransaction("changeData", nric, r.password, r.email, r.mobile, new_amount,
            new_interest, new_payee_account_number, new_payee_account_name,
            new_transaction_date, new_status);
          
          //console.log("next payment date and amount");
          // res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          //   MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
          //   BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
          //   DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          //   DEPOSIT_ACCOUNT_NAME : "", DEPOSIT_ACCOUNT_NUMBER : "0",
          //   TRANSACTION_DATE : r.transaction_date, STATUS : "Record updated!"});
            res.render("backToLogin", {STATUS: "Record updated!"});

        } else if (deposit_amount > 0) {
          new_interest = (Math.round(deposit_amount * interestDeposit)).toString();
          new_payee_account_name = deposit_payee_account_name;
          new_payee_account_number = deposit_payee_account_number;
          new_transaction_date.setFullYear(new_transaction_date.getFullYear() + 1);   // yearly payout
          new_transaction_date = new_transaction_date.toDateString();
          new_status = "Maturity";

          await contract.submitTransaction("changeData", nric, r.password, r.email, r.mobile, deposit_amount,
            new_interest, new_payee_account_number, new_payee_account_name,
            new_transaction_date, new_status);

          //console.log("Maturity");

          // res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
          //   MOBILE : r.mobile, BORROW_AMOUNT: "0", BORROW_INTEREST : (interestBorrow*100).toString(),
          //   BORROW_ACCOUNT_NAME : "", BORROW_ACCOUNT_NUMBER : "0",
          //   DEPOSIT_AMOUNT: "0", DEPOSIT_INTEREST : (interestDeposit*100).toString(),
          //   DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
          //   TRANSACTION_DATE : r.transaction_date, STATUS : "Record updated!"});
            res.render("backToLogin", {STATUS: "Record updated!"});
        } else {
          res.render("lenderBorrower", {NRIC : nric, NRIC_NAME : r.nric_name, EMAIL : r.email,
            MOBILE : r.mobile, BORROW_AMOUNT: borrow_amount, BORROW_INTEREST : (interestBorrow*100).toString(),
            BORROW_ACCOUNT_NAME : borrow_payee_account_name, BORROW_ACCOUNT_NUMBER : borrow_payee_account_number,
            DEPOSIT_AMOUNT: deposit_amount, DEPOSIT_INTEREST : (interestDeposit*100).toString(),
            DEPOSIT_ACCOUNT_NAME : deposit_payee_account_name, DEPOSIT_ACCOUNT_NUMBER : deposit_payee_account_number,
            TRANSACTION_DATE : r.transaction_date, STATUS : "Unknown error. Please try again later"});  
        }
      }
    }
    // Disconnect from the gateway.
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    process.exit(1);
  }
});

app.post("/changePassword", async function (req, res) {
  const nric = req.body.nric;
  const password = req.body.password;
  const new_password = req.body.new_password;
  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
      console.log('An identity for the user "appUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    const result = await contract.evaluateTransaction("queryData", nric);
    if (result.length > 0) {
      const r = JSON.parse(result.toString());
      var status = r.status;
      var nric_name = r.nric_name;
      if (password === r.password && new_password.trim().length > 0) {
        if (status === "New User") {
          new_status = "Registration";
        }
        await contract.submitTransaction("changeData", nric, new_password, r.email, r.mobile, r.amount, r.interest,
          r.payee_account_number, r.payee_account_name, r.transaction_date, new_status);

        //res.render("changePassword", {NRIC: r.nric, NRIC_NAME: r.nric_name, PASSWORD: new_password, STATUS: "Password updated!"});
        res.render("backToLogin", {STATUS: "Password updated!"});
      } else {
        //res.render("changePassword", {NRIC: r.nric, NRIC_NAME: r.nric_name, PASSWORD: new_password, STATUS: "Invalid password"});
        res.render("backToLogin", {STATUS: "Invalid password"});
      }
    } else {
      //res.render("changePassword", {NRIC: r.nric, NRIC_NAME: r.nric_name, PASSWORD: new_password, STATUS: "Invalid NRIC"});
      res.render("backToLogin", {STATUS: "Invalid NRIC"});
    }
    // Disconnect from the gateway.
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    process.exit(1);
  }
});

app.post("/displayLedger", async function (req, res) {
  const update = req.body.update;
  const withdraw = req.body.withdraw;
  var nric = "";
  if (update != null) {
    nric = update;
  }
  if (withdraw != null) {
    nric = withdraw;
  }

  if (nric != "") {
    try {
      // load the network configuration
      const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
      let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);

      // Check to see if we've already enrolled the user.
      const identity = await wallet.get('appUser');
      if (!identity) {
        console.log('An identity for the user "appUser" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
      }

      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

      // Get the network (channel) our contract is deployed to.
      const network = await gateway.getNetwork('mychannel');

      // Get the contract from the network.
      const contract = network.getContract('fabcar');

      const result = await contract.evaluateTransaction("queryData", nric);
      if (result.length > 0) {
        const r = JSON.parse(result.toString());

        if (update != null) {
          res.render("updateInfo", {
            NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
            MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
            PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
            PAYEE_ACCOUNT_NAME: r.payee_account_name,
            TRANSACTION_DATE: r.transaction_date, STATUS: ""
          });

        }
        if (withdraw != null) {
          res.render("withdraw", {
            NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
            MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
            PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
            PAYEE_ACCOUNT_NAME: r.payee_account_name,
            TRANSACTION_DATE: r.transaction_date, STATUS: "Note: Interest will be forfeited for prematured withdrawal."
          });

        }
      } else {
        next();
      }
      // Disconnect from the gateway.
      await gateway.disconnect();
    } catch (error) {
      console.error(`Failed to evaluate transaction: ${error}`);
      process.exit(1);
    }
  }
});

app.post("/withdraw", async function (req, res) {
  const nric = req.body.nric;
  if (nric != "") {
    try {
      // load the network configuration
      const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
      let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

      // Create a new file system based wallet for managing identities.
      const walletPath = path.join(process.cwd(), 'wallet');
      const wallet = await Wallets.newFileSystemWallet(walletPath);
      //console.log(`Wallet path: ${walletPath}`);

      // Check to see if we've already enrolled the user.
      const identity = await wallet.get('appUser');
      if (!identity) {
        console.log('An identity for the user "appUser" does not exist in the wallet');
        console.log('Run the registerUser.js application before retrying');
        return;
      }

      // Create a new gateway for connecting to our peer node.
      const gateway = new Gateway();
      await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

      // Get the network (channel) our contract is deployed to.
      const network = await gateway.getNetwork('mychannel');

      // Get the contract from the network.
      const contract = network.getContract('fabcar');

      const result = await contract.evaluateTransaction("queryData", nric);
      if (result.length > 0) {
        const r = JSON.parse(result.toString());
        if (r.status === "Maturity") {
          var new_transaction_date = new Date();
          new_transaction_date = new_transaction_date.toDateString();
          const new_status = "Prematured withdrawal"
          await contract.submitTransaction("changeData", nric, r.password, r.email, r.mobile, r.amount,
            r.interest, r.payee_account_number, r.payee_account_name,
            new_transaction_date, new_status);
          
          // res.render("withdraw", {
          //   NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
          //   MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
          //   PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
          //   PAYEE_ACCOUNT_NAME: r.payee_account_name,
          //   TRANSACTION_DATE: r.transaction_date, STATUS: "Withdraw successful"
          // });
          res.render("backToLogin", {STATUS: "Withdraw successful"});
        } else {
          // nothing to withdraw
          res.render("withdraw", {
            NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
            MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
            PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
            PAYEE_ACCOUNT_NAME: r.payee_account_name,
            TRANSACTION_DATE: r.transaction_date, STATUS: ""
          });
        }
      }
      // Disconnect from the gateway.
      await gateway.disconnect();
    } catch (error) {
      console.error(`Failed to evaluate transaction: ${error}`);
      process.exit(1);
    }
  }
});

app.post("/updateInfo", async function (req, res) {
  const nric = req.body.nric;
  const old_password = req.body.old_password;
  const new_password = req.body.new_password;
  const new_email = req.body.new_email;
  const new_mobile = req.body.new_mobile;
  const new_payee_account_name = req.body.new_payee_account_name;
  const new_payee_account_number = req.body.new_payee_account_number;

  try {
    // load the network configuration
    const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
    let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);
    //console.log(`Wallet path: ${walletPath}`);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get('appUser');
    if (!identity) {
      console.log('An identity for the user "appUser" does not exist in the wallet');
      console.log('Run the registerUser.js application before retrying');
      return;
    }

    // Create a new gateway for connecting to our peer node.
    const gateway = new Gateway();
    await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

    // Get the network (channel) our contract is deployed to.
    const network = await gateway.getNetwork('mychannel');

    // Get the contract from the network.
    const contract = network.getContract('fabcar');

    const result = await contract.evaluateTransaction("queryData", nric);
    //console.log(result.toString());
    if (result.length > 0) {
      const r = JSON.parse(result.toString());
      if (r.password === old_password) {
        var nric_name = r.nric_name;
        var password_update = r.password;
        var email_update = r.email;
        var mobile_update = r.mobile;
        var payee_account_name_update = r.payee_account_name;
        var payee_account_number_update = r.payee_account_number;
        var UpdateNeeded = false;

        if (new_password != "") {
          password_update = new_password;
          UpdateNeeded = true;
        }
        if (new_email != "") {
          email_update = new_email;
          UpdateNeeded = true;
        }
        if (new_mobile != "") {
          mobile_update = new_mobile;
          UpdateNeeded = true;
        }
        if (new_payee_account_name != "") {
          payee_account_name_update = new_payee_account_name;
          UpdateNeeded = true;
        }
        if (new_payee_account_number != "") {
          payee_account_number_update = new_payee_account_number;
          UpdateNeeded = true;
        }
        if (UpdateNeeded) {
          var status_update = "Information updated";
          var transaction_date_update = new Date();
          transaction_date_update = transaction_date_update.toDateString();
          if (r.status.startsWith("Maturity") || r.status.startsWith("Prematured")) {
            transaction_date_update = r.transaction_date;  // if Status = maturity or prematured withdrawal,
            status_update = r.status;                      //    don't update its status.
          }
          await contract.submitTransaction("changeData", nric, password_update, email_update, mobile_update, r.amount,
          r.interest, payee_account_number_update, payee_account_name_update,
          transaction_date_update, status_update);

          // res.render("updateInfo", { 
          //   NRIC: nric, NRIC_NAME: nric_name, EMAIL: new_email,
          //   MOBILE: new_mobile, AMOUNT: r.amount, INTEREST: r.interest,
          //   PAYEE_ACCOUNT_NUMBER: new_payee_account_number,
          //   PAYEE_ACCOUNT_NAME: new_payee_account_name,
          //   TRANSACTION_DATE: transaction_date_update, STATUS: "Record updated!"
          // });
          res.render("backToLogin", {STATUS: "Record updated!"});
        } else {
          // nothing to update
          res.render("updateInfo", { 
            NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
            MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
            PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
            PAYEE_ACCOUNT_NAME: r.payee_account_name,
            TRANSACTION_DATE: r.transaction_date, STATUS: ""
          }); 
        }
      } else {
        res.render("updateInfo", {
          NRIC: nric, NRIC_NAME: r.nric_name, EMAIL: r.email,
          MOBILE: r.mobile, AMOUNT: r.amount, INTEREST: r.interest,
          PAYEE_ACCOUNT_NUMBER: r.payee_account_number,
          PAYEE_ACCOUNT_NAME: r.payee_account_name,
          TRANSACTION_DATE: r.transaction_date, STATUS: "Invalid password"
        });
      }
    }
    // Disconnect from the gateway.
    await gateway.disconnect();
  } catch (error) {
    console.error(`Failed to evaluate transaction: ${error}`);
    process.exit(1);
  }

});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});