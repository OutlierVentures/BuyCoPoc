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

interface IUser extends IDocument {
    name: string;
    externalId: string;
    email: string;
    accessToken: string;
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

interface IUpholdCard {
    "address": {
        "bitcoin": string
    },
    "available": number,
    "balance": number,
    "currency": string,
    "id": string,
    "label": string,
    "lastTransactionAt": string,
    "settings": {
        "position": number,
        "starred": boolean
    },
    "addresses": [
        {
            "id": string,
            "network": string
        }
    ],
    "normalized": [
        {
            "available": number,
            "balance": number,
            "currency": string
        }
    ]
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string;
        smartContractSourceCode: string;
        genesisBlock: any;
    }
}

interface IProposal {
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
<<<<<<< HEAD
    
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
=======

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
>>>>>>> cafbf1698b2984cbc8fb9f338da26e46d69ee92d
