import mongoose = require("mongoose");
import { Promise } from "q";


export var proposalSchema = new mongoose.Schema({
    id: String,
    contractAddress: String,
    productName: String,
    productDescription: String,
    //productSku: String,
    mainCategory: String,
    subCategory: String,
    maxPrice: Number,
    endDate: Date,
    ultimateDeliveryDate: Date
});

export interface IProposal {
    contractAddress: string;
    productName: string;
    productDescription: string;
    //productSku: string;
    mainCategory: string;
    subCategory: string;
    maxPrice: number;
    endDate: Date;
    ultimateDeliveryDate: Date;
    // nrOfBackings: number; // Number of unique users that made a proposalbacking
    // nrOfBackers: number;  // Number of ProposalBackings
    // totalAmount: number;  // Amount of each backer summed up for all backers (e.g. can never be smaller than nrOfBackers)
}

export interface IProposalDocument extends mongoose.Document, IProposal {
}

export interface IProposalFilter {
    maximumPrice?: number;
    minimumTotalAmount?: number;
    partNumber?: string;
    mainCategory?: string;
    subCategory?: string;
}

/**
 * Cached version of a buying proposal (BuyCo)
 */
export var Proposal = mongoose.model<IProposalDocument>("Proposals", proposalSchema);

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