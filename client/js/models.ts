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

interface ICircle extends IDocument {
    contractAddress: string;
    name: string;
    commonBond: string;
    interestPercentage: number;
    /**
     * Circle administrators, by user ID
     */
    administrators: string[];
}

/**
 * Membership token of the user for a specific circle.
 */
// Circle membership is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. That way a circle
// membership can be created like so:
//  var cm = new CircleMembership();
//  cm.circleId = "12345";
//  myUser.circleMemberships.push(cm);
class CircleMembership {
    /**
     * The ID of the corresponding Circle.
     */
    circleId: string;
    /**
     * Join date
     */
    startDate: Date;

    /**
     * Date the user left the circle.
     */
    endDate: Date;
}


interface IUser extends IDocument {
    name: string;
    externalId: string;
    email: string;
    accessToken: string;
    circleMemberships: [CircleMembership];
}

interface IDeposit extends IDocument {
    fromCard: string;
    amount: number;
    circleId: string;
    userId: string;
    transactionId: string;
    depositIndex: number;
    currency: string;
    dateTime: Date;
}

interface ILoan extends IDocument {
    contractAddress: string;
    amount: number;
    interestPercentage: number;
    amountToRepay: number;
    circleId: string;
    userId: string;
    transactionId: string
    repaymentTransactionId: string;
    currency: string;
    dateTime: Date;
    purpose: string;
}

interface IAuditList {
    items: IAuditListItem[],
    totals: ICircleStatistics
}

interface IAuditListItem {
    circle: ICircle,
    statistics: ICircleStatistics
}

interface IAuditDetails {
    circle: ICircle,
    statistics: ICircleStatistics,
    loans: [ILoan],
    deposits: [IDeposit]
}

interface IBitReserveTransaction {
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

interface ICircleVaultStatistics {
    balance: number,
    transactions: IBitReserveTransaction[]
    totals: {
        debit: number,
        credit: number
    }
}

interface IApplicationInfo {
    blockchain: {
        nodeUrl: string,
        smartContractSourceCode: string,
        genesisBlock: any
    }
}
