import request from 'axios';

class TransactionsAPI {

    static transactionHistoryEndpoint = "https://shakepay.github.io/programming-exercise/web/transaction_history.json";
    static exchangeRateEndpoint = "https://api.shakepay.co/rates";

    static getTransactionData = (url) => {

        const apiCompletionPromise = request({
            method: 'get',
            url,
        });

        return apiCompletionPromise;
    };

}

export default TransactionsAPI;