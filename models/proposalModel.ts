﻿export interface IProposal {
    id: string;
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