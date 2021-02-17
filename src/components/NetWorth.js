import React from 'react';
import {Line} from 'react-chartjs-2';
import TransactionsAPI from '../services/TransactionsAPI';
import { EXCHANGE_RATES } from '../data/Currency';




class NetWorth extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            transactions: [],
            BTCRatesOverTime: [],
            ETHRatesOverTime: [],
            netWorthHistory: [],
            useTransactionTimeExchangeRate: true,
        }
    }

    componentDidMount() {
        this.getTransactions()
    }

    /**
     * Get a list of transactions and exchange rate information from the ShakePay API.
     * Alternatively, since this information is static, we could theoretically also just
     * save it to a JSON file and access it locally.
     */
    getTransactions = () =>  {
        TransactionsAPI.getTransactionData(TransactionsAPI.transactionHistoryEndpoint)
        .then(transactionHistoryResponse=> {
            console.log({transactionHistoryResponse});

            let transactions = transactionHistoryResponse.data;
            transactions.sort((a,b) => new Date(a.createdAt) - new Date(b.createdAt))
            console.log({transactions});
            this.setState({transactions}, () => {
                this.calculateBalances();
            })
        })
    }

    /**
     * Given a list of transactions and information about the exchange rate, find the user's
     * net worth over time.
     */
    calculateBalances = () => {
        const { transactions, useTransactionTimeExchangeRate } = this.state;
        
        let netWorthHistory = []
        transactions.forEach((transaction, index) => {
            

            let previousBalances, date, change;
            if (netWorthHistory.length===0) {
                previousBalances = {
                    CAD: 0,
                    BTC: 0,
                    ETH: 0,
                };
                console.log("first previousBalances", previousBalances);
            } else {
                // Previous amount is relative to the most recent amount in the networth history
                previousBalances = netWorthHistory[index-1].balances;
            }



            if (index ===0) {
                console.log({netWorthHistory, transaction, previousBalances});
                console.log("netWorthHistory.length", netWorthHistory.length)
            }

            
            // like the shoe company ;) Use Object.assign to avoid passing by reference and all balances would reference the most recent balance
            const newBalances = Object.assign({},previousBalances);
            date = transaction.createdAt;
            if (transaction.type === "conversion") {
                newBalances[transaction.from.currency] = previousBalances[transaction.from.currency] - transaction.from.amount;
                newBalances[transaction.to.currency] = previousBalances[transaction.to.currency] + transaction.to.amount;

            } else {
                change = transaction.direction === "credit" ? transaction.amount : transaction.amount * -1;
                newBalances[transaction.currency] = previousBalances[transaction.currency] + change;
                

            }
            const netWorth = {
                balances: newBalances,
                date
            }
            netWorthHistory.push(netWorth);

        })

        console.log({netWorthHistory});
        this.setState({netWorthHistory}, () => {
            this.calculateNetWorth(useTransactionTimeExchangeRate);
        });

    }


    calculateDailyNetWorth = (useTransactionTimeExchangeRate=true) => {
        const { netWorthHistory } = this.state;
        let netWorthAmount;

        if (useTransactionTimeExchangeRate) {
            const { BTCRatesOverTime, ETHRatesOverTime } = this.state;

            if (BTCRatesOverTime.length === 0 || ETHRatesOverTime.length === 0) {
                TransactionsAPI.getExchangeRate("BTC")
                .then(BTCResponse => {
                    console.log({BTCResponse});
                    this.setState({BTCRatesOverTime: BTCResponse.data}, () => {
                        TransactionsAPI.getExchangeRate("ETH")
                        .then(ETHResponse => {
                            console.log({ETHResponse});
                            this.setState({ETHRatesOverTime: ETHResponse.data});
                            this.calculateDailyNetWorth(true);
                        })
                    });
                    
                })
            } else {
                this.calculateDailyNetWorth(true);
            }

        } else {
            this.calculateDailyNetWorth(false);
        }

        
    }

    getExchangeRatesOnGivenDay = (netWorth) => {
        const { BTCRatesOverTime, ETHRatesOverTime } = this.state;

        /**
         * The API uses the pair `CAD_BTC` but the constant exchange rate uses `BTC_CAD`
         * so we will stick with `BTC_CAD` to stay consistent.
         */
        const exchangeRatesOnGivenDay = {
            "BTC_CAD": "",
            "ETH_CAD": "",
        }
        const transactionDay = netWorth.date.substring(0,10);

        for (var i = 0; i < BTCRatesOverTime.length; i++) {
            const rateDay = BTCRatesOverTime[i].createdAt.substring(0,10)
            if(transactionDay === rateDay) {
                exchangeRatesOnGivenDay["BTC_CAD"] = BTCRatesOverTime[i]["midMarketRate"];
                break
            }
        }

        for (var i = 0; i < ETHRatesOverTime.length; i++) {
            const rateDay = ETHRatesOverTime[i].createdAt.substring(0,10)
            if(transactionDay === rateDay) {
                exchangeRatesOnGivenDay["ETH_CAD"] = ETHRatesOverTime[i]["midMarketRate"];
                break
            }
        }

        return exchangeRatesOnGivenDay;



    }

    convertBalancesToFiat = (balances, exchangeRates) => {

        const netWorthAmount = balances["CAD"] + (balances["BTC"] * exchangeRates["BTC_CAD"]) + (balances["ETH"] * exchangeRates["ETH_CAD"]);

        return netWorthAmount;
    }

    calculateNetWorth = (useTransactionTimeExchangeRate=true) => {

        const { netWorthHistory } = this.state;

        netWorthHistory.forEach(netWorth => {
            
            let netWorthAmount;
            if (useTransactionTimeExchangeRate) {
                const exchangeRatesOnGivenDay = this.getExchangeRatesOnGivenDay(netWorth)
                netWorthAmount = this.convertBalancesToFiat(netWorth.balances, exchangeRatesOnGivenDay);
            } else {
                netWorthAmount = this.convertBalancesToFiat(netWorth.balances, EXCHANGE_RATES);
            }
            netWorth.netWorth = netWorthAmount
        })

        this.setState({netWorthHistory});
    }

    render() {

        const { netWorthHistory } = this.state

        const data = {
            labels: netWorthHistory.map(netWorth => netWorth.date),
            datasets: [
              {
                label: 'Net Worth',
                fill: false,
                lineTension: 0.1,
                backgroundColor: 'rgba(75,192,192,0.4)',
                borderColor: 'rgba(75,192,192,1)',
                borderCapStyle: 'butt',
                borderDash: [],
                borderDashOffset: 0.0,
                borderJoinStyle: 'miter',
                pointBorderColor: 'rgba(75,192,192,1)',
                pointBackgroundColor: '#fff',
                pointBorderWidth: 1,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: 'rgba(75,192,192,1)',
                pointHoverBorderColor: 'rgba(220,220,220,1)',
                pointHoverBorderWidth: 2,
                pointRadius: 1,
                pointHitRadius: 10,
                data: netWorthHistory.map(netWorth => netWorth.netWorth)
              }
            ]
          };

        return (
          <div>
            <h2>Net Worth</h2>
            <Line data={data} />
          </div>
        );
    }
}

export default NetWorth;