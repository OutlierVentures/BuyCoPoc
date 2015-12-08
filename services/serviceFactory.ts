import upholdService = require('./upholdService');
import stubUpholdService = require('./stubUpholdService');
import configurationService = require('./configurationService');

export interface IUpholdService {
    getCards: (callback: upholdService.IUpholdCardsCallback) => void;
    getUser: (callback: any) => void;
    createCard: (label: string, callback: upholdService.IUpholdCardCallback) => void;
    createTransaction: (
    fromCard: string,
    amount: number,
    currency: string,
    recipient: string,
    callback: upholdService.IUpholdTransactionCallback) => void;

    commitTransaction: (transaction: IUpholdTransaction, callback: upholdService.IUpholdTransactionCallback) => void
    getCardTransactions: (cardiId: string, callback: upholdService.IUpholdTransactionsCallback) => void;
}

var config = new configurationService.ConfigurationService().getConfiguration();

export function createUpholdService(token: string): IUpholdService {
    if (config.useStubs) {
        return new stubUpholdService.StubUpholdService(token);
    }
    else {
        return new upholdService.UpholdService(token);
    }
}
