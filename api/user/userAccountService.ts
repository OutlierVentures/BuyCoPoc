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
    saveAccounts = (accessToken: string, col: userModel.IBlockchainAccountCollection): Promise<userModel.IUser> => {
        var t = this;

        return Promise<userModel.IUser>((resolve, reject) => {
            userRepo.getUserByAccessToken2(accessToken)
                .then(user => {
                    // Never lose an account. In case somehow an account was in the backup but 
                    // not in the new set from the client, we don't want to lose that. Merge them.
                    if (user.blockchainAccounts) {
                        for (var i = 0; i < col.accounts.length; i++) {
                            var acct = col.accounts[i];

                            var isExisting = false;

                            for (var j = 0; j < user.blockchainAccounts.accounts.length; j++) {
                                var existingAcct = user.blockchainAccounts.accounts[j];
                                if (existingAcct.address == acct.address) {
                                    // Existing address, replace
                                    user.blockchainAccounts.accounts[j] = acct;
                                    isExisting = true;
                                    break;
                                }
                            }

                            if (!isExisting) {
                                // New address, add
                                user.blockchainAccounts.accounts.push(acct);
                            }
                        }
                        user.blockchainAccounts.selected = col.selected;
                    }
                    else
                        user.blockchainAccounts = col;

                    // Ensure an account is set as selected.
                    if (user.blockchainAccounts
                        && !user.blockchainAccounts.selected
                        && user.blockchainAccounts.accounts.length > 0)
                        user.blockchainAccounts.selected = user.blockchainAccounts.accounts[0].address;

                    // There could be other cases where the accounts data is corrupted. 
                    // In that case this code will crash. 
                    // TODO: realize a graceful way to continue. I.e. save old accounts content somewhere
                    // and provide user with an empty collection, or provide message "call support"

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
                    // Do some normalization / fixes on the account.
                    // Ensure an account is set as selected.
                    if (user.blockchainAccounts
                        && !user.blockchainAccounts.selected
                        && user.blockchainAccounts.accounts.length > 0)
                        user.blockchainAccounts.selected = user.blockchainAccounts.accounts[0].address;

                    // Ensure each of the accounts has enough funds to transact. 
                    // Note If funds are added, this will not be included in the 
                    // balance computed below as the transaction will not have 
                    // been processed.
                    t.ensureMinFunds(user)
                        .then(u => {
                            // Get balance for each of the addresses.
                            if (user.blockchainAccounts) {
                                for (var i = 0; i < user.blockchainAccounts.accounts.length; i++) {
                                    var account = user.blockchainAccounts.accounts[i];
                                    account.balance = web3plus.web3.fromWei(web3plus.web3.eth.getBalance(account.address), "ether").toNumber();
                                };
                            }
                            resolve(user.blockchainAccounts);
                        },
                        err => { }
                        );


                },
                userErr => { reject(userErr) });
        })
    };
}

