/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

class FabCar extends Contract {

    async initLedger(Ctx) {
     return "success";
    }



    async newData(ctx, nric, password, nric_name, email, mobile, amount, interest, payee_account_number,
                  payee_account_name, transaction_date, status) {
      const deposit = {
        nric,
        docType: 'm3loan',
        password,
        nric_name,
        email,
        mobile,
        amount,
        interest,
        payee_account_number,
        payee_account_name,
        transaction_date,
        status
      };

    await ctx.stub.putState(nric, Buffer.from(JSON.stringify(deposit)));
    }

    async queryData(ctx, nric) {
      const nricInBytes = await ctx.stub.getState(nric);
      var result = "";
      if (!nricInBytes || nricInBytes.length === 0) {
        result = "";  //nric + " does not exist";
      } else {
        result = JSON.parse(nricInBytes.toString());
      }
      console.log(result);
      return (result);
    }

    async changeData(ctx, nric, new_password, new_email, new_mobile, new_amount, new_interest, 
                     new_payee_account_number, new_payee_account_name, new_transaction_date, new_status) {

      // note: nric and nric_name cannot be changed once created.

      const nricInBytes = await ctx.stub.getState(nric); 
      var result = "";
      if (!nricInBytes || nricInBytes.length === 0) {
          result = "";   //nric + " does not exist";
      } else {
        result = JSON.parse(nricInBytes.toString());
        result.password = new_password;
        result.email = new_email;
        result.mobile = new_mobile;
        result.amount = new_amount;
        result.interest = new_interest;
        result.payee_account_number = new_payee_account_number;
        result.payee_account_name = new_payee_account_name;
        result.transaction_date = new_transaction_date;
        result.status = new_status;

        await ctx.stub.putState(nric, Buffer.from(JSON.stringify(result)));
        result = new_status + " updated!";
      }
      console.log(result);
      return (result);
    }
}

module.exports = FabCar;