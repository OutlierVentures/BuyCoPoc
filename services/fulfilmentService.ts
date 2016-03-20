import request = require('request');
import domain = require('domain');

import userModel = require('../models/userModel');
import proposalModel = require('../models/proposalModel');
import proposalBackingModel = require('../models/proposalBackingModel');
import offerModel = require('../models/offerModel');
import sellerModel = require('../models/sellerModel');
import contractInterfaces = require('../contracts/contractInterfaces');

import serviceFactory = require('../services/serviceFactory');
import proposalService = require('../services/proposalService');
import upholdService = require('../services/upholdService');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import tools = require('../lib/tools');
import configurationService = require('./configurationService');
import contractService = require('./contractService');

import _ = require('underscore');
import { Promise } from 'q';
import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

var userRepo = new userModel.UserRepository();
var sellerRepo = new sellerModel.SellerRepository();

/**
 * Service for dealing with buying proposals on the blockchain. All functions
 * return promises.
 */
export class FulfilmentService {
    config = new configurationService.ConfigurationService().getConfiguration();
    contractService: contractService.ContractService;

    registryContract: contractInterfaces.IProposalRegistryContract;
    proposalService: proposalService.ProposalService;

    constructor() {
    }

    /**
     * Initialize the service.
     */
    initialize(): Promise<void> {
        var defer = Q.defer<void>();
        var t = this;

        serviceFactory.createProposalService()
            .then(ps => {
                t.proposalService = ps;
                return serviceFactory.getContractService();
            })
            .then(cs => {
                t.contractService = cs;
                defer.resolve(null);
            })
            .catch(err => {
                defer.reject(err);
            });

        return defer.promise;
    }


    /*
     * Execute any pending payments for a proposal in the blockchain.
     * @param proposalId the address of the proposal
     * @return The proposal
     */
    processPayments(proposalId: string): Promise<proposalModel.IProposal> {
        var t = this;

        var proposalContract: contractInterfaces.IProposalContract;
        return Promise<proposalModel.IProposal>((resolve, reject) => {
            t.contractService.getProposalContractAt(proposalId)
                .then(p => {
                    proposalContract = p;

                    // The real meat of the method. We process two chains of events in parallel:
                    // 1. Closing of the deal: start payments / start payout
                    // 2. After delivery: end payments / end payout
                    // The methods called check whether the conditions for payments apply, execute
                    // payments as neccesary and update the contracts.
                    // As the events in the lifecycle of the contract are mutually exclusive, we
                    // can safely execute them in parallel for optimal performance. For any 
                    // BuyCo contract, either one of them will provide some activity or none at all.
                    return Q.all([
                        t.processStartPayments(p)
                            .then(pRes => {
                                return t.processStartPayout(p);
                            }),
                        t.processEndPayments(p)
                            .then(pRes => {
                                return t.processEndPayout(p);
                            })
                    ]);
                })
                .then(pRes => {
                    // All done. Convert to object and resolve.
                    return t.proposalService.proposalContractToObject(proposalContract);
                })
                .then(po => {
                    resolve(po);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**
     * Ensure that the start payments which should be paid, are paid.
     *
     * @param proposalContract
     */
    processStartPayments(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Checks preventing the start payment
            if (
                // Not closed? Nothing to do here.
                !proposalContract.isClosed()
                // Is the start payment already complete? Then there's nothing to do here.
                || proposalContract.isStartPaymentComplete()
                // No accepted offer? Closed but no deal.
                // TODO: refund payments
                || proposalContract.acceptedOffer() == "0x0000000000000000000000000000000000000000") {
                resolve(proposalContract);
                return;
            }
                
            // Start payments should be taken. Go through all the backers, check if they paid,
            // if not, pay.
            var paymentPromises = new Array<Promise<upholdService.IUpholdTransaction>>()

            for (let i = 1; i <= proposalContract.backerIndex().toNumber(); i++) {
                let backer = proposalContract.backers(i);

                // TODO: make the check "should we execute a payment" more robust. 
                // See https://github.com/OutlierVentures/BuyCo/issues/102

                // Has this backer not paid the pledge payment? Then we don't consider it an actual backer.
                if (!backer[2])
                    continue;

                // Has this backer already paid the start payment? Then there's nothing to do.
                if (backer[4])
                    continue;

                paymentPromises.push(t.executeSingleStartPayment(proposalContract, i));
            }

            // We use allSettled() to ensure all promise functions are completed, even if 
            // one of them would fail.
            Q.allSettled(paymentPromises)
                .then(paymentResults => {
                    // TODO: report on any errors in a more detailed manner. The paymentsResults
                    // array contains details on the results of each executeStartPayment run.
                    resolve(proposalContract);
                })
                .catch(err => reject(err));
        });
    }

    /**
     * Try to execute the start payment for a specific backer, and mark it as paid in the contract.
     *
     * @param proposalContract
     * @param backerIndex
     * @return A promise of the transaction if it succeeded. If anything fails, the promise will be rejected 
     * with error details.
     */
    executeSingleStartPayment(proposalContract: contractInterfaces.IProposalContract, backerIndex: number): Promise<upholdService.IUpholdTransaction> {
        var t = this;
        var uService: serviceFactory.IUpholdService;
        var user: userModel.IUser;
        var backer: proposalBackingModel.IProposalBacking;
        var upholdTransaction: upholdService.IUpholdTransaction;

        return Promise<upholdService.IUpholdTransaction>((resolve, reject) => {
            t.proposalService.getBacker(proposalContract, backerIndex)
                .then(b => {
                    backer = b;
                    // Get user info
                    return userRepo.getUserByBlockchainAddress(backer.address);
                })
                .then(u => {
                    if (!u) {
                        // Throw a specific error to skip the rest of the promise chain.
                        throw ("Can't find user for blockchain address " + backer.address);
                    }

                    user = u;                    
                    
                    // Create uphold service
                    return serviceFactory.createUpholdService(user.accessToken);
                })
                .then(us => {
                    uService = us;
                    // Create and commit transaction
                    return us.createAndCommitTransaction(backer.cardId,
                        proposalContract.getStartPaymentAmount(backerIndex).toNumber() / 100,
                        "GBP", t.config.uphold.vaultAccount.cardBitcoinAddress);
                })
                .then(tx => {
                    upholdTransaction = tx;

                    // We've seen the correct Uphold transaction. Confirm to the contract that
                    // it has been paid.
                    return proposalContract.setPaid(backerIndex, 2,
                        tools.guidRemoveDashes(upholdTransaction.id), upholdTransaction.denomination.amount * 100);
                })
                .then(web3plus.promiseCommital)
                .then(contractTx => {
                    // Check whether it was registered correctly.
                    var backer = proposalContract.backers(backerIndex);

                    if (backer[4] != tools.guidRemoveDashes(upholdTransaction.id)
                        || backer[5].toNumber() != upholdTransaction.denomination.amount * 100)
                        throw ("Start payment for backer " + backerIndex + " wasn't registered correctly");

                    resolve(upholdTransaction);
                }, setPaidErr => {
                    // The uphold transaction has succeeded, but we haven't been able to
                    // store it. This is a problem as we'll lose information.
                    
                    // TODO: handle this. One approach is to decouple the "oracle functionality" of
                    // watching Uphold transactions and storing them in the smart contracts from
                    // the business logic of triggering payments according to the instructions of
                    // those smart contracts. The detection of a payment should be run in an 
                    // idempotent manner. I.e. a payment from a particular Uphold account to 
                    // a particular card (the card for this specific BuyCo) with a particular amount
                    // can be considered the start payment for this backer always, as long as
                    // it hasn't been already registered for another backing.
                    reject(setPaidErr);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**
     * Ensure that a start payout which should be paid, is paid.
     *
     * @param proposalContract
     */
    processStartPayout(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Carry out checks that are reasons not to carry out the payout.            
            if (
                // Not closed? Nothing to do here.
                !proposalContract.isClosed()
                // Already paid out?
                || proposalContract.startPayoutTransactionID()
                // No accepted offer?
                || proposalContract.acceptedOffer() == "0x0000000000000000000000000000000000000000"
                // Not ready for start payment? We're done.
                || !proposalContract.isReadyForStartPayout()) {

                resolve(proposalContract);
                return;
            }

            // Time for payout. Execute it.
            t.executeStartPayout(proposalContract)
                .then(payoutTx => {
                    resolve(proposalContract);
                })
                .catch(err => {
                    reject(err);
                });

        });
    }

    /**** BEGIN START PAYMENT AND PAYOUT ****/

    /**
     * Try to execute the start payout, and mark it as paid in the contract.
     *
     * @param proposalContract
     * @return A promise of the transaction if it succeeded. If anything fails, the promise will be rejected 
     * with error details.
     */
    executeStartPayout(proposalContract: contractInterfaces.IProposalContract): Promise<upholdService.IUpholdTransaction> {
        var t = this;

        var upholdTransaction: upholdService.IUpholdTransaction;
        var winningOfferContract: contractInterfaces.IOfferContract;

        return Promise<upholdService.IUpholdTransaction>((resolve, reject) => {

            t.contractService.getOfferContractAt(proposalContract.acceptedOffer())
                .then(oc => {
                    winningOfferContract = oc;
                    return serviceFactory.createVaultUpholdService();
                })
                .then(vs => {
                    return vs.createAndCommitTransaction(t.config.uphold.vaultAccount.cardId,
                        proposalContract.getStartPayoutAmount().toNumber() / 100, "GBP", tools.guidAddDashes(winningOfferContract.cardId()));
                })
                .then(tx => {
                    upholdTransaction = tx;

                    return proposalContract.registerStartPayout(tools.guidRemoveDashes(upholdTransaction.id),
                        upholdTransaction.denomination.amount * 100, { gas: 2500000 });
                })
                .then(web3plus.promiseCommital)
                .then(contractTx => {
                    // Check whether the start payout was registered correctly.
                    if (proposalContract.startPayoutAmount().toNumber() != Math.round(upholdTransaction.denomination.amount * 100)
                        || proposalContract.startPayoutTransactionID() != tools.guidRemoveDashes(upholdTransaction.id))
                        throw ("Error registering start payout.");

                    resolve(upholdTransaction);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**** END START PAYMENTS AND PAYOUT ****/




    /**** BEGIN END PAYMENT AND PAYOUT ****/

    /**
     * Ensure that the end payments which should be paid, are paid.
     *
     * @param proposalContract
     */
    processEndPayments(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Checks preventing the end payment
            if (
                // Not closed? Nothing to do here.
                !proposalContract.isClosed()
                // Is the end payment already complete? Then there's nothing to do here.
                || proposalContract.isPaymentComplete()
                // Start payment not complete yet?
                || !proposalContract.isStartPaymentComplete()
                // No accepted offer? Closed but no deal.
                // TODO: allow passing through this method for BuyCo's that are
                // closed without an accepted offer, and have no start payment.
                // For those the end payment will be a refund of the payments of
                // the backers, i.e. a payment from the BuyCo vault to the backers
                // which is stored as a negative amount in the contract.
                || proposalContract.acceptedOffer() == "0x0000000000000000000000000000000000000000") {
                resolve(proposalContract);
                return;
            }
                
            // End payments should be taken. Go through all the backers, check if they paid,
            // if not, pay.
            var paymentPromises = new Array<Promise<upholdService.IUpholdTransaction>>()

            for (let i = 1; i <= proposalContract.backerIndex().toNumber(); i++) {
                let backer = proposalContract.backers(i);

                // Has this backer paid the pledge payment? If not, it's not a real backer. Skip.
                if (!backer[2])
                    continue;

                // Has this backer already paid the end payment? Then nothing to do for this backer.
                if (backer[6])
                    continue;

                if (proposalContract.getEndPaymentAmount(i).toNumber() < 0) {
                    // This backer would require a refund.
                    // TODO
                    continue;
                }

                paymentPromises.push(t.executeSingleEndPayment(proposalContract, i));
            }

            // We use allSettled() to ensure all promise functions are completed, even if 
            // one of them would fail.
            Q.allSettled(paymentPromises)
                .then(paymentResults => {
                    // TODO: report on any errors in a more detailed manner. The paymentsResults
                    // array contains details on the results of each executeEndPayment run.
                    resolve(proposalContract);
                })
                .catch(err => reject(err));
        });
    }

    /**
     * Try to execute the end payment for a specific backer, and mark it as paid in the contract.
     *
     * @param proposalContract
     * @param backerIndex
     * @return A promise of the transaction if it succeeded. If anything fails, the promise will be rejected 
     * with error details.
     */
    executeSingleEndPayment(proposalContract: contractInterfaces.IProposalContract, backerIndex: number): Promise<upholdService.IUpholdTransaction> {
        var t = this;
        var uService: serviceFactory.IUpholdService;
        var user: userModel.IUser;
        var backer: proposalBackingModel.IProposalBacking;
        var upholdTransaction: upholdService.IUpholdTransaction;

        return Promise<upholdService.IUpholdTransaction>((resolve, reject) => {
            t.proposalService.getBacker(proposalContract, backerIndex)
                .then(b => {
                    backer = b;
                    // Get user info
                    return userRepo.getUserByBlockchainAddress(backer.address);
                })
                .then(u => {
                    if (!u) {
                        // Throw a specific error to skip the rest of the promise chain.
                        throw ("Can't find user for blockchain address " + backer.address);
                    }

                    user = u;                    
                    
                    // Create uphold service
                    return serviceFactory.createUpholdService(user.accessToken);
                })
                .then(us => {
                    uService = us;
                    // Create and commit transaction
                    return us.createAndCommitTransaction(backer.cardId,
                        proposalContract.getEndPaymentAmount(backerIndex).toNumber() / 100,
                        "GBP", t.config.uphold.vaultAccount.cardBitcoinAddress);
                })
                .then(tx => {
                    upholdTransaction = tx;

                    // We've seen the correct Uphold transaction. Confirm to the contract that
                    // it has been paid.
                    return proposalContract.setPaid(backerIndex, 3,
                        tools.guidRemoveDashes(upholdTransaction.id), upholdTransaction.denomination.amount * 100);
                })
                .then(web3plus.promiseCommital)
                .then(contractTx => {
                    // Check whether it was registered correctly.
                    var backer = proposalContract.backers(backerIndex);

                    if (backer[6] != tools.guidRemoveDashes(upholdTransaction.id)
                        || backer[7].toNumber() != upholdTransaction.denomination.amount * 100)
                        throw ("End payment for backer " + backerIndex + " wasn't registered correctly");

                    resolve(upholdTransaction);
                }, setPaidErr => {
                    // The uphold transaction has succeeded, but we haven't been able to
                    // store it. This is a problem as we'll lose information.
                    
                    // TODO: handle this. One approach is to decouple the "oracle functionality" of
                    // watching Uphold transactions and storing them in the smart contracts from
                    // the business logic of triggering payments according to the instructions of
                    // those smart contracts. The detection of a payment should be run in an 
                    // idempotent manner. I.e. a payment from a particular Uphold account to 
                    // a particular card (the card for this specific BuyCo) with a particular amount
                    // can be considered the end payment for this backer always, as long as
                    // it hasn't been already registered for another backing.
                    reject(setPaidErr);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**
     * Ensure that a end payout which should be paid, is paid.
     *
     * @param proposalContract
     */
    processEndPayout(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Carry out checks that are reasons not to carry out the payout.            
            if (
                // Not closed? Nothing to do here.
                !proposalContract.isClosed()
                // Already paid out?
                || proposalContract.endPayoutTransactionID()
                // No accepted offer?
                || proposalContract.acceptedOffer() == "0x0000000000000000000000000000000000000000"
                // Not ready for end payment? We're done.
                || !proposalContract.isReadyForEndPayout()) {

                resolve(proposalContract);
                return;
            }

            // Time for payout. Execute it.
            t.executeEndPayout(proposalContract)
                .then(payoutTx => {
                    resolve(proposalContract);
                })
                .catch(err => {
                    reject(err);
                });

        });
    }

    /**
     * Try to execute the end payout, and mark it as paid in the contract.
     *
     * @param proposalContract
     * @return A promise of the transaction if it succeeded. If anything fails, the promise will be rejected 
     * with error details.
     */
    executeEndPayout(proposalContract: contractInterfaces.IProposalContract): Promise<upholdService.IUpholdTransaction> {
        var t = this;

        var upholdTransaction: upholdService.IUpholdTransaction;
        var winningOfferContract: contractInterfaces.IOfferContract;

        return Promise<upholdService.IUpholdTransaction>((resolve, reject) => {

            t.contractService.getOfferContractAt(proposalContract.acceptedOffer())
                .then(oc => {
                    winningOfferContract = oc;
                    return serviceFactory.createVaultUpholdService();
                })
                .then(vs => {
                    return vs.createAndCommitTransaction(t.config.uphold.vaultAccount.cardId,
                        proposalContract.getEndPayoutAmount().toNumber() / 100, "GBP", tools.guidAddDashes(winningOfferContract.cardId()));
                })
                .then(tx => {
                    upholdTransaction = tx;

                    return proposalContract.registerEndPayout(tools.guidRemoveDashes(upholdTransaction.id),
                        upholdTransaction.denomination.amount * 100, { gas: 2500000 });
                })
                .then(web3plus.promiseCommital)
                .then(contractTx => {
                    // Check whether the end payout was registered correctly.
                    if (proposalContract.endPayoutAmount().toNumber() != Math.round(upholdTransaction.denomination.amount * 100)
                        || proposalContract.endPayoutTransactionID() != tools.guidRemoveDashes(upholdTransaction.id))
                        throw ("Error registering end payout.");

                    resolve(upholdTransaction);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /**** END END PAYMENTS AND PAYOUT ****/

}
