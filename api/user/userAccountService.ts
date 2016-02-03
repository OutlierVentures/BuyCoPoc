import serviceFactory = require('../../services/serviceFactory');
import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');

import configurationModel = require('../../models/configModel');
import userModel = require('../../models/userModel');

import Q = require('q');
import {Promise} from 'q';

var userRepo = new userModel.UserRepository();

/**
 * The minimum balance of a user account. If a user submits an account  
 * with a balance below this (e.g. a new one), we will send it
 * "ether" up to this amount.
 */
var MINIMUM_USER_ACCOUNT_BALANCE = 10;

/**
 * Get and save information from user accounts
 */
export class UserAccountService {
    config: configurationModel.IApplicationConfig;

    registryContract;

    constructor() {
    }

    /**
     * Initialize the service by loading the registry contract.
     */
    initialize(): Promise<void> {
        return Promise<void>((resolve, reject) => {
            this.config = serviceFactory.getConfiguration();
            resolve(null);
        });
    }

    /**
     * Save the user's blockchain accounts to our storage. The private keys are encrypted,
     * so this serves only as a backup.
     */
    saveAccounts = (accessToken: string, accounts: userModel.IBlockchainAccountCollection): Promise<userModel.IUser> => {
        var t = this;

        return Promise<userModel.IUser>((resolve, reject) => {
            userRepo.getUserByAccessToken2(accessToken)
                .then(user => {
                    // Save the user
                    user.blockchainAccounts = accounts;
                    user.save((saveErr, saveRes) => {
                        if (saveErr) {
                            reject(saveErr);
                            return;
                        }

                        // Ensure each of the accounts has enough funds to transact.
                        resolve(t.ensureMinFunds(user));
                    });
                },
                err => {
                    reject(err);
                })
        });
    };

    /**
     * Ensure each of the accounts of a user has enough funds to transact.
     * This makes sense in a private blockchain without a token of value. On 
     * a public blockchain (e.g. the public Ethereum blockchain) this
     * should not be done as we would be giving away free Ether to all of
     * our users.
     */
    private ensureMinFunds = (user: userModel.IUser): Promise<userModel.IUser> => {
        var t = this;
        return Promise<userModel.IUser>((resolve, reject) => {

            var accountPromises = new Array<Promise<userModel.IBlockchainAccount>>();

            if (user.blockchainAccounts) {
                for (var i = 0; i < user.blockchainAccounts.accounts.length; i++) {
                    var account = user.blockchainAccounts.accounts[i];
                    accountPromises.push(t.ensureMinFundsForAddress(account));
                }
            }

            Q.all(accountPromises)
                .then(accounts=> {
                    resolve(user);
                },
                err => { reject(err); });
        });
    }

    private ensureMinFundsForAddress = (account: userModel.IBlockchainAccount): Promise<userModel.IBlockchainAccount> => {
        return Promise<userModel.IBlockchainAccount>((accountResolve, accountReject) => {
            web3plus.web3.eth.getBalance(account.address, function (err, balanceRes) {
                if (err) {
                    accountReject(err);
                    return;
                }
                if (web3plus.web3.fromWei(balanceRes, "ether").toNumber() >= MINIMUM_USER_ACCOUNT_BALANCE) {
                    // Already enough funds.
                    accountResolve(account);
                    return;
                }

                // Check whether our account has enough to send.
                var ourBalance = web3plus.web3.eth.getBalance(web3plus.web3.eth.coinbase);
                if (web3plus.web3.fromWei(ourBalance, "ether").toNumber() < MINIMUM_USER_ACCOUNT_BALANCE) {
                    accountReject("Insufficient funds");
                    return;
                }

                web3plus.web3.eth.sendTransaction({
                    from: web3plus.web3.eth.coinbase,
                    to: account.address,
                    // TODO: compute the amount to send to get up to the required amount.
                    // Now we just send the minimum amount every time.
                    value: web3plus.web3.toWei(MINIMUM_USER_ACCOUNT_BALANCE, 'ether')
                }, function (sendErr, sendRes) {
                    if (sendErr) accountReject(sendErr);
                    else accountResolve(account);
                });

            });
        })
    }

    /**
     * Get the user's blockchain accounts, with the encrypted private key.
     */
    getAccounts = (accessToken: string): Promise<userModel.IBlockchainAccountCollection> => {
        var t = this;
        return Promise<userModel.IBlockchainAccountCollection>((resolve, reject) => {
            userRepo.getUserByAccessToken2(accessToken)
                .then(user => {
                    // Get balance for each of the addresses.
                    // Does this run synchronously? Better use promises and Q.all() anyway.
                    if (user.blockchainAccounts) {
                        for (var i = 0; i < user.blockchainAccounts.accounts.length; i++) {
                            var account = user.blockchainAccounts.accounts[i];
                            account.balance = web3plus.web3.fromWei(web3plus.web3.eth.getBalance(account.address), "ether").toNumber();
                        };
                    }
                    resolve(user.blockchainAccounts);
                },
                userErr => { reject(userErr) });
        })
    };
}

