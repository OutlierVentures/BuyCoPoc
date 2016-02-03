import mongoose = require("mongoose");
import { Promise } from "q";

export var proposalBackingSchema = new mongoose.Schema({
    id: String,
    userId: String,
    address: String,
    amount: Number,
    startPaymentTransactionId: String,
    startPaymentAmount: Number,
    endPaymentTransactionId: String,
    endPaymentAmount: Number
});

/**
 * A backer of a proposal, i.e. a buyer.
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
     * The amount of products this buyer is willing to purchase.
     */
    amount: number;

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
}

export interface IProposalBackingDocument extends mongoose.Document, IProposalBacking {
}

/**
 * Cached version of a proposal backing.
 */
export var ProposalBacking = mongoose.model<IProposalBackingDocument>("Proposals", proposalBackingSchema);
