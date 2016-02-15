import express = require("express");
import proposalModel = require('../../models/proposalModel');
import userModel = require('../../models/userModel');
import cachedProposalService = require('../../services/cachedProposalService');
import serviceFactory = require('../../services/serviceFactory');
import upholdService = require('../../services/upholdService');
import configurationModel = require('../../models/configModel');

import web3plus = require('../../node_modules/web3plus/lib/web3plus');

import _ = require('underscore');
import Q = require('q');

interface IBuyCoStatistics {
    totalDepositsAmount: number,
    totalPaidOutAmount: number,
    totalBalance: number,
}


interface IAuditList {
    items: IAuditListItem[],
    totals: IBuyCoStatistics
}

interface IAuditListItem {
    proposal: proposalModel.IProposal,
    statistics: IBuyCoStatistics
}

interface IAuditDetails {
    proposal: proposalModel.IProposal,
    statistics: IBuyCoStatistics,
}

interface IVaultStatistics {
    balance: number,
    transactions: upholdService.IUpholdTransaction[]
    totals: {
        debitAmount: number,
        creditAmount: number
    }
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string,
        //smartContractSourceCode: string,
        genesisBlock: any
    }
}

/**
 * Controller for Proposal membership operations.
 */
export class AuditController {
    constructor() {

    }

    getList = (req: express.Request, res: express.Response) => {
        // This is an anonymous method.
        // var token = req.header("AccessToken");
        serviceFactory.createCachedProposalService()
            .then(cs => {

                // Load all proposals
                proposalModel.Proposal.find({}).exec()
                    .then(function (proposals) {
                        // Load stats for all of them.

                        var getStatsPromises = new Array<Q.Promise<IBuyCoStatistics>>();

                        _(proposals).each((proposal) => {
                            function getEmptyStats() {
                                var deferred = Q.defer<IBuyCoStatistics>();
                                deferred.resolve(<IBuyCoStatistics>{});
                                return deferred.promise;
                            }
                            
                            // TODO: implement get...statistics

                            //if (circle.contractAddress)
                            //    getStatsPromises.push(cs.getCircleContractStatistics(circle, null));
                            //else
                                getStatsPromises.push(getEmptyStats());

                        });

                        Q.all(getStatsPromises)
                            .then((statsRes) => {
                                var auditItems = Array<IAuditListItem>();

                                // The stats results arrive in an array in the same sequence as the proposals 
                                // themselves. Map each stats results to the proposal ID.
                                proposals.map(function (p, i) {
                                    auditItems.push({
                                        proposal: p,
                                        statistics: statsRes[i]
                                    });
                                });

                                // Compute totals for all the items.
                                var totals: IBuyCoStatistics = {
                                    totalDepositsAmount: 0,
                                    totalPaidOutAmount: 0,
                                    totalBalance: 0,
                                };

                                for (var k in totals) {
                                    totals[k] = _(auditItems).reduce(function (memo, item) {
                                        // As some of the items might be undefined, we use "value || 0".
                                        return memo + (item.statistics[k] || 0);
                                    }, 0);
                                }

                                var list: IAuditList = {
                                    items: auditItems,
                                    totals: totals
                                };

                                res.send(list);
                            })
                            .catch((statsErr) => {
                                res.status(500).json({
                                    "error": statsErr,
                                    "error_location": "loading statistics for proposals"
                                });
                            });
                    },
                    function (getProposalErr) {
                        res.status(500).json({
                            "error": getProposalErr,
                            "error_location": "loading proposals"
                        });
                    });
            })
            .catch(err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "initializing proposal service"
                });
            });
    }

    getVaultData = (req: express.Request, res: express.Response) => {

        var config = serviceFactory.getConfiguration();

        var adminAccount = config.uphold.vaultAccount.userName;
        var t = this;

        // Get global Proposal Vault account
        userModel.User.findOne({ externalId: adminAccount }).exec()
            .then((adminUserRes) => {
                // Create Uphold connector for global admin user.
                var brs = serviceFactory.createUpholdService(adminUserRes.accessToken);

                // Get the proposal vault card.
                brs.getCards((cardsErr, cardsRes) => {
                    if (cardsErr) {
                        res.status(500).json({
                            "error": cardsErr,
                            "error_location": "getting cards"
                        });
                        return;
                    }

                    var vaultCard = _(cardsRes).find((p) => {
                        return p.address.bitcoin == config.uphold.vaultAccount.cardBitcoinAddress;
                    });

                    if (vaultCard == null) {
                        res.status(500).json({
                            "error": "can't find proposal vault card",
                            "error_location": "getting proposal vault card"
                        });
                        return;
                    }

                    var stats = <IVaultStatistics>{};
                    stats.balance = vaultCard.balance;

                    brs.getCardTransactions(vaultCard.id, (transErr, transactions) => {
                        if (cardsErr) {
                            res.status(500).json({
                                "error": transErr,
                                "error_location": "getting transactions"
                            });
                            return;
                        }

                        // Anonymize the data. The data contains user names because it's executed as an authenticated
                        // user.
                        // Also enhance the data and compute totals.
                        var totalDebit = 0;
                        var totalCredit = 0;

                        _(transactions).each(function (t) {
                            // Mark it as a debit or credit transaction
                            if (t.origin.username == adminAccount) {
                                t["debitcredit"] = "D";
                                t["debitAmount"] = t.origin.amount;
                                totalDebit += parseFloat(t.origin.amount.toString());
                            }
                            else {
                                t["debitcredit"] = "C";
                                t["creditAmount"] = t.destination.amount;
                                totalCredit += parseFloat(t.destination.amount.toString());
                            }

                            t.origin.description = undefined;
                            t.origin.username = undefined;
                            t.destination.description = undefined;
                            t.destination["username"] = undefined;
                        });

                        stats.transactions = transactions;
                        stats.totals = {
                            debitAmount: totalDebit,
                            creditAmount: totalCredit
                        };

                        res.json(stats);

                    });
                });
            }, function (adminUserErr) {
                res.status(500).json({
                    "error": adminUserErr,
                    "error_location": "getting proposal vault card"
                });
            });
    }

    getInfo = (req: express.Request, res: express.Response) => {
        var sourceCode: string;

        var t = this;

        var config = serviceFactory.getConfiguration();

        // Don't expose contract source code in POC phase.

        //web3plus.loadContractSourceCodeFromFile('Proposal.sol', function (sourceCodeErr, sourceCode) {
        //    if (sourceCodeErr) {
        //        res.status(500).json({
        //            "error": sourceCodeErr,
        //            "error_location": "loading smart contract source code"
        //        });
        //        return;
        //    }

        // TODO: get real genesis block from blockchain config file
        var genesisBlock = {
            "nonce": "0x0000000000000042",
            "difficulty": "0x40000",
            "alloc": {
            },
            "mixhash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "coinbase": "0x0000000000000000000000000000000000000000",
            "timestamp": "0x00",
            "parentHash": "0x0000000000000000000000000000000000000000000000000000000000000000",
            "extraData": "0x",
            "gasLimit": "0x4c4b40"
        }

        var info: IApplicationInfo = {
            blockchain: {
                nodeUrl: config.ethereum.nodeUrl,
                //smartContractSourceCode: sourceCode,
                genesisBlock: genesisBlock
            }
        }
        res.json(info);


        //});
    }
}