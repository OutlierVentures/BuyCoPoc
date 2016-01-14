// The classes in this file are duplicates of the server-side model classes. The server side is the master version.

// Steps to update:
// for each file in /models {
//  copy/paste the "export interface I[Name]" interfaces
//  strip "export "
// }

// TODO: remove duplication, allow a single file with model interfaces.
// TODO: ensure that client-side model interfaces have a property "id".

interface IDocument {
    _id: string;
}

interface IUser extends IDocument {
    name: string;
    externalId: string;
    email: string;
    accessToken: string;
}

interface IUpholdTransaction {
    "id": string,
    "type": string,
    "message": string,
    "status": string,
    "RefundedById": string,
    "createdAt": string,
    "denomination": {
        "amount": number,
        "currency": string,
        "pair": string,
        "rate": number
    },
    "origin": {
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
    },
    "destination": {
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
    },
    "params": {
        "currency": string,
        "margin": number,
        "pair": string,
        "rate": number,
        "ttl": number,
        "type": string
    }
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string,
        smartContractSourceCode: string,
        genesisBlock: any
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

/**
 * A backer of a proposal, i.e. a buyer.
 */
interface IProposalBacker {
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
