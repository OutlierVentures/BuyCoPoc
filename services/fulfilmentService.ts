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

    /**
     * Ensure that the start payments which should be paid, are paid.
     *
     * @param proposalContract
     */
    ensureStartPayment(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Not closed? Nothing to do here.
            if (!proposalContract.isClosed())
                resolve(proposalContract);

            if (proposalContract.isStartPaymentComplete())
                resolve(proposalContract);

            if (proposalContract.acceptedOffer() != "0x") {
                // Has an accepted offer

                // Not ready for start payment? We're done.
                if (!proposalContract.isReadyForStartPayout())
                    resolve(proposalContract);

                var paymentPromises = new Array<Promise<upholdService.IUpholdTransaction>>()
                
                // Start payments should be taken. Go through all the backers, check if they paid,
                // if not, pay.
                for (let i = 1; i <= proposalContract.backerIndex().toNumber(); i++) {
                    let backer = proposalContract.backers(i);

                    // Has this backer paid the start payment?
                    if (backer[4])
                        continue;

                    paymentPromises.push(t.executeStartPayment(proposalContract, i));
                }

                // We use allSettled() to ensure all promise functions are completed, even if 
                // one of them would fail.
                Q.allSettled(paymentPromises)
                    .then(paymentResults => {
                        // TODO: report on any errors in a more detailed manner.                        
                        resolve(proposalContract);
                    })
                    .catch(err => reject(err));


            } else {
                // Closed but no deal
                // TODO: refund payments
                // Out of scope for POC.
            }

        });
    }

    /**
     * Ensure that a start payout which should be paid, is paid.
     *
     * @param proposalContract
     */
    ensureStartPayout(proposalContract: contractInterfaces.IProposalContract): Promise<contractInterfaces.IProposalContract> {
        var t = this;

        return Promise<contractInterfaces.IProposalContract>((resolve, reject) => {
            // Not closed? Nothing to do here.
            if (!proposalContract.isClosed())
                resolve(proposalContract);

            // Already paid out?
            if (proposalContract.startPayoutTransactionID())
                resolve(proposalContract);

            if (proposalContract.acceptedOffer() != "0x") {
                // Has an accepted offer

                // Not ready for start payment? We're done.
                if (!proposalContract.isReadyForStartPayout())
                    resolve(proposalContract);

                // Time for payout. Execute it.
                return t.executeStartPayout(proposalContract);
            }

        });
    }

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
                        proposalContract.getStartPayoutAmount().toNumber() / 100, "GBP", winningOfferContract.owner());
                })
                .then(tx => {
                    upholdTransaction = tx;

                    return proposalContract.registerStartPayout(upholdTransaction.id, upholdTransaction.denomination.amount * 100);
                })
                .then(contractTx => {
                    resolve(upholdTransaction);
                })
                .catch(err => {
                    reject(err);
                });
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
    executeStartPayment(proposalContract: contractInterfaces.IProposalContract, backerIndex: number): Promise<upholdService.IUpholdTransaction> {
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
                    user = u;
                    
                    // Create uphold service
                    return serviceFactory.createUpholdService(user.accessToken);
                })
                .then(us => {
                    uService = us;
                    // Create and commit transaction
                    return us.createAndCommitTransaction(backer.cardId,
                        proposalContract.getStartPaymentAmount(backerIndex).toNumber(),
                        "GBP", t.config.uphold.vaultAccount.cardBitcoinAddress);
                })
                .then(tx => {
                    upholdTransaction = tx;

                    // We've seen the correct Uphold transaction. Confirm to the contract that
                    // it has been paid.
                    return proposalContract.setPaid(backerIndex, 2,
                        upholdTransaction.id, upholdTransaction.denomination.amount * 100);
                })
                .then(contractTx => {
                    resolve(upholdTransaction);
                })
                .catch(err => {
                    reject(err);
                });
        });
    }

    /*
     * Execute any pending payments for a proposal in the blockchain.
     * @param proposalId the address of the proposal
     * @return The proposal
     */
    executePayments(proposalId: string): Promise<proposalModel.IProposal> {
        var t = this;

        var proposalContract: contractInterfaces.IProposalContract;
        return Promise<proposalModel.IProposal>((resolve, reject) => {
            t.contractService.getProposalContractAt(proposalId)
                .then(p => {
                    proposalContract = p;

                    t.ensureStartPayment(p)
                        .then(pRes => {
                            t.ensureStartPayout(p);
                        });


                    // Ready for end payout? Execute end payout.
                    //if (proposalContract.isReadyForEndPayout() && !proposalContract.isPaymentComplete()) {
                    //    // TODO: Execute end payout
                        
                    //}

                    // Ready for end payout? Execute end payout.

                })
                .catch(err => { reject(err); });
        });
    }


}
