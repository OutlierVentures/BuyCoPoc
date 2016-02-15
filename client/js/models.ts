// The classes in this file are duplicates of the server-side model classes. The server side is the master version.
// TODO BW dd. 2016-01-07: Split up models into featured-based modules instead of type-based (see 'Seller example').

// Steps to update:
// for each file in /models {
//  copy/paste the "export interface I[Name]" interfaces
//  strip "export "
// }

// TODO: remove duplication, allow a single file with model interfaces.
// TODO: ensure that client-side model interfaces have a property "id".
// TODO BW dd. 2016-01-07: DRYing up can perhaps be done using Browserify or TSify?

interface IDocument {
    _id: string;
}

interface IBlockchainAccount {
    address: string,
    encrypted: boolean,
    locked: boolean,
    hash: string,
    private: string,
    public: string,
    // Balance in Ether. Computed on load.
    balance: number,
}

interface IBlockchainAccountCollection {
    accounts: IBlockchainAccount[],
    selected: string
}


interface IUserPreferences {
    /**
     * Valid values: empty, "buyer", "seller"
     */
    perspective: string;
}


interface IUser extends IDocument {
    name: string;
    /**
     * For users primarily defined by an external authenticator, the User ID. E.g. Uphold user name.
     */
    externalId: string;

    /**
     * Current OAuth access token for the user at the external authenticator.
     * TODO: refactor to a subtype, incorporate expiration date.
     */
    accessToken: string;

    email: string;
    
    /**
     * BuyCos this user has backed
     */
    //backings: [Backing];

    blockchainAccounts: IBlockchainAccountCollection;

    buyerId: string;
    sellerId: string;

    preferences: IUserPreferences;

}

interface ICredentials {
    externalId: string
    accessToken: string
}

// TODO BW dd. 2015-12-7 Come up with decent name for this type. 
interface IUpholdTransactionNode {
    "CardId": string,
    "amount": number,
    "base": number,
    "commission": number,
    "currency": string,
    "description": string,
    "fee": number,
    "rate": number,
    "type": string,
    "username": string
}

interface IUpholdTransaction {
    "id": string;
    "type": string;
    "message": string;
    "status": string;
    "RefundedById": string;
    "createdAt": string;
    "denomination": {
        "amount": number;
        "currency": string;
        "pair": string;
        "rate": number;
    };
    "origin": IUpholdTransactionNode;
    "destination": IUpholdTransactionNode;
    "params": {
        "currency": string;
        "margin": number;
        "pair": string;
        "rate": number;
        "ttl": number;
        "type": string;
    };
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string;
        smartContractSourceCode: string;
        genesisBlock: any;
    }
}

// Difference with server-side definition: property "id" contains the contract address,
// while at the server side it's the Mongo ID.
interface IProposal {
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

    nrOfBackings?: number; // Number of unique users that made a proposalbacking
    nrOfBackers?: number;  // Number of ProposalBackings
    totalAmount?: number;  // Amount of each backer summed up for all backers (e.g. can never be smaller than nrOfBackers)

    pledgePaymentPercentage: number;
    startPaymentPercentage: number;
    minimumReportedCorrectDeliveryPercentage: number;
}

interface IProposalFilter {
    maxPrice?: number;
    minPrice?: number;
    minimumTotalAmount?: number;
    partNumber?: string;
    mainCategory?: string;
    subCategory?: string;
}

interface IUpholdCard {
    "address": {
        "bitcoin": string;
    },
    "available": number;
    "balance": number;
    "currency": string;
    "id": string;
    "label": string;
    "lastTransactionAt": string;
    "settings": {
        "position": number;
        "starred": boolean;
    };
    "addresses": [
        {
            "id": string;
            "network": string;
        }
    ];
    "normalized": [
        {
            "available": number;
            "balance": number;
            "currency": string;
        }
    ];
}

/**
 * A backer of a proposal, i.e. a buyer.
 */
interface IProposalBacking {
    /**
     * User ID from MongoDB.
     */
    userId: string;
    
    /**
     * Blockchain address of this user.
     */
    address: string;

    /**
     * Uphold card ID used for payments.
     */
    cardId: string;

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
}


/**
 * An offer made to a buying proposal by a seller.
 */
interface IOffer {
    id: string;
    owner: string;
    price: number;
    minimumAmount: number;
    toCard: string;

    sellerName: string;
}


interface ICategoryBase {
    name: string;
    totalProposalCount: number;
    /**
     * URL of the main category image, relative to /api/. For example "category/data/Food%20and%20drink/main.jpg"
     */
    imageUrl: string;
}

/**
 * A sub category of BuyCo's, e.g. "Camera"
 */
interface ISubCategory extends ICategoryBase {

}

/**
 * A main category of BuyCo's, e.g. "Electronics"
 */
interface IMainCategory extends ICategoryBase {
    subCategories: ISubCategory[];
}
