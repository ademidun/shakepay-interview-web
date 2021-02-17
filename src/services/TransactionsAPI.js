import request from 'axios';

class TransactionsAPI {

    static transactionHistoryEndpoint = "https://shakepay.github.io/programming-exercise/web/transaction_history.json";
    static exchangeRateEndpoint = "https://shakepay.github.io/programming-exercise/web/rates_CAD_BTC.json";

    static getTransactionData = (url) => {

        const apiCompletionPromise = request({
            method: 'get',
            url,
        });

        return apiCompletionPromise;
    };

    static getExchangeRate = (currency) => {

        const apiCompletionPromise = request({
            method: 'get',
            url: `https://shakepay.github.io/programming-exercise/web/rates_CAD_${currency}.json`,
        });

        return apiCompletionPromise;
    };

}

export default TransactionsAPI;