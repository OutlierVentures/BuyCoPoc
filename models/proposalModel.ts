import mongoose = require("mongoose");
import { Promise } from "q";


export var proposalSchema = new mongoose.Schema({
    id: String,
    contractAddress: String,
    owner: String,
    productName: String,
    productDescription: String,
    productSku: String,
    productUnitSize: String,
    mainCategory: String,
    subCategory: String,
    maxPrice: Number,
    endDate: Date,
    ultimateDeliveryDate: Date,

    isClosed: Boolean,
    acceptedOffer: String,

    nrOfBackings: Number,
    nrOfBackers: Number,
    totalAmount: Number,

    pledgePaymentPercentage: Number,
    startPaymentPercentage: Number,
    minimumReportedCorrectDeliveryPercentage: Number,
});

export interface IProposal {
    contractAddress: string;
    owner: string;
    productName: string;
    productDescription: string;
    productSku: string;
    productUnitSize: string;
    mainCategory: string;
    subCategory: string;
    maxPrice: number;
    endDate: Date;
    ultimateDeliveryDate: Date;

    isClosed?: boolean;
    acceptedOffer?: string;

    nrOfBackings?: number; // Number of unique users that made a proposalbacking
    nrOfBackers?: number;  // Number of ProposalBackings
    totalAmount?: number;  // Amount of each backer summed up for all backers (e.g. can never be smaller than nrOfBackers)

    pledgePaymentPercentage: number;
    startPaymentPercentage: number;
    minimumReportedCorrectDeliveryPercentage: number;
}

export interface IProposalDocument extends mongoose.Document, IProposal {
}

export interface IBuyCoStatistics {
    totalPaymentAmount: number,
    totalPayoutAmount: number,
    totalEscrowAmount: number,
}

export interface IProposalFilter {
    maxPrice?: number;
    minPrice?: number;
    minimumTotalAmount?: number;
    partNumber?: string;
    mainCategory?: string;
    subCategory?: string;
}

/**
 * Cached version of a buying proposal (BuyCo)
 */
export var Proposal = mongoose.model<IProposalDocument>("Proposals", proposalSchema);
