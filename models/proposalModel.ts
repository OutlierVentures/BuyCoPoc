import mongoose = require("mongoose");
import { Promise } from "q";


export var proposalSchema = new mongoose.Schema({
    id: String,
    contractAddress: String,
    productName: String,
    productDescription: String,
    productSku: String,
    productUnitSize: String,
    mainCategory: String,
    subCategory: String,
    maxPrice: Number,
    endDate: Date,
    ultimateDeliveryDate: Date,
    nrOfBackings: Number,
    nrOfBackers: Number,
    totalAmount: Number  
});

export interface IProposal {
    contractAddress: string;
    productName: string;
    productDescription: string;
    productSku: string;
    productUnitSize: string;
    mainCategory: string;
    subCategory: string;
    maxPrice: number;
    endDate: Date;
    ultimateDeliveryDate: Date;
    nrOfBackings?: number; // Number of unique users that made a proposalbacking
    nrOfBackers?: number;  // Number of ProposalBackings
    totalAmount?: number;  // Amount of each backer summed up for all backers (e.g. can never be smaller than nrOfBackers)
}

export interface IProposalDocument extends mongoose.Document, IProposal {
}

export interface IProposalFilter {
    maxPrice?: number | Object;
    minimumTotalAmount?: number | Object;
    partNumber?: string;
    mainCategory?: string;
    subCategory?: string;
}

/**
 * Cached version of a buying proposal (BuyCo)
 */
export var Proposal = mongoose.model<IProposalDocument>("Proposals", proposalSchema);
