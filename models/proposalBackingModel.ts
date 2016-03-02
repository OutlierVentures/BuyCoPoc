import mongoose = require("mongoose");
import buyerModel = require("./buyerModel");

import { Promise } from "q";

export var proposalBackingSchema = new mongoose.Schema({
    id: String,
    userId: String,
    address: String,
    cardId: String,
    amount: Number,
    startPaymentTransactionId: String,
    startPaymentAmount: Number,
    endPaymentTransactionId: String,
    endPaymentAmount: Number
});

/**
 * A backing of a proposal by a buyer.
 */
export interface IProposalBacking {

    /**
     * User ID from MongoDB.
     */
    userId: string;

    /**
     * Blockchain address of this user.
     */
    address: string;
    /**
     * Backer index within the proposal.
     */
    backerIndex: number;

    /**
     * The amount of products this buyer is willing to purchase.
     */
    amount: number;

    /**
     * Transaction ID of the initial payment (at moment of backing).
     */
    pledgePaymentTransactionId: string;

    /**
     * Amount of initial payment.
     */
    pledgePaymentAmount: number;

    /**
     * Transaction ID of the initial payment (at moment of backing).
     */
    startPaymentTransactionId: string;

    /**
     * Amount of initial payment.
     */
    startPaymentAmount: number;

    /**
     * Transaction ID of the final payment (after deliery).
     */
    endPaymentTransactionId: string;

    /**
     * Amount of the final payment.
     */
    endPaymentAmount: number;

    /**
     * Indicates whether the delivery has been reported by the backer.
     */
    isDeliveryReported: boolean;

    /**
     * Indicates whether the delivery is correct according to the backer.
     * Any further details about the nature of what is or isn't correct
     * are discussed outside of the contract.
     */
    isDeliveryCorrect: boolean;

    /**
     * Uphold card ID used for payments.
     */
    cardId: string;

    /**
     * Detail info on the buyer.
     */
    buyerInfo: buyerModel.IBuyer;
}

export interface IProposalBackingDocument extends mongoose.Document, IProposalBacking {
}

/**
 * Cached version of a proposal backing.
 */
export var ProposalBacking = mongoose.model<IProposalBackingDocument>("ProposalBackings", proposalBackingSchema);
