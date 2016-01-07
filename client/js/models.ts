
module buyCo.Models {
    // The classes in this file are duplicates of the server-side model classes. The server side is the master version.
    // TODO BW dd. 2015-01-07: Split up models into featured-based modules instead of type-based (see 'Seller example').

    // Steps to update:
    // for each file in /models {
    //  copy/paste the "export interface I[Name]" interfaces
    //  strip "export "
    // }

    // TODO: remove duplication, allow a single file with model interfaces.
    // TODO: ensure that client-side model interfaces have a property "id".
    // TODO BW dd. 2015-01-07: DRYing up can perhaps be done using Browserify or TSify?
    interface IDocument {
        _id: string;
    }

    export interface IUser extends IDocument {
        name: string;
        externalId: string;
        email: string;
        accessToken: string;
    }
    
    // TODO BW dd. 2015-12-7 Come up with decent name for this type. 
    export interface IUpholdTransactionNode {
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
        "origin": IUpholdTransactionNode,
        "destination": IUpholdTransactionNode,
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
        maxPrice: number;
        endDate: Date;
        ultimateDeliveryDate: Date;
    }
    
    export interface IUpholdCard {
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
}