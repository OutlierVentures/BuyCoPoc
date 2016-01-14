export interface IProposal {
    id: string;
    productName: string;
    productDescription: string;
    //productSku: string;
    mainCategory: string;
    subCategory: string;
    maxPrice: number;
    endDate: Date;
    ultimateDeliveryDate: Date;
}

/**
 * A backer of a proposal, i.e. a buyer.
 */
export interface IProposalBacker {
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
}