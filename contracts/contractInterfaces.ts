import {Promise} from 'q';

export interface IBigNumber {
    toNumber(): number
}

export interface IWeb3TransactionOptions {
    gas?: number;
    to?: string;
    from?: string;
}

export interface IWeb3Contract {
    address: string;
}

export interface IWeb3TransactionCallback {
    (error: any, transactionId: string);
}

// Interface definitions of the contract properties / methods as present in the
// web3.js contract objects. The definitions are incomplete and have to be manually 
// updated. However they're already useful to keep track of contract changes.
// COULD DO: automate this by parsing Solidity files. Maybe someone is doing that already...

// All transactional methods return Promise<string>, with the value being the transaction
// hash. This assumes contract objects have passed through web3plus.enhanceContract to
// make them return a Promise. If not, they take a callback, which is not reflected in 
// these interfaces.

export interface IProposalRegistryContract extends IWeb3Contract {
    allContractTypes;
    addProposal(productName: string, productCategory: string, productSubCategory: string, maxPrice: number | IBigNumber, endDate: string, ultimateDeliveryDate: string, options?: IWeb3TransactionOptions): Promise<string>;
    proposals(index: number | IBigNumber, callback?): string;
    proposalIndex(): IBigNumber;

    name(): string;
    owner(): string;
}

export interface IProposalContract extends IWeb3Contract {
    setDetails(productDescription: string, productSku: string, productUnitSpecification: string, options?: IWeb3TransactionOptions): Promise<string>;

    back(amount: number | IBigNumber, cardId: string, options?: IWeb3TransactionOptions): Promise<string>;

    offer(price: number | IBigNumber, minimumAmount: number | IBigNumber, cardId: string, options?: IWeb3TransactionOptions): Promise<string>;

    setPaid(backingIndex: number | IBigNumber, paymentType: number | IBigNumber, transactionId: string, amount: number | IBigNumber, options?: IWeb3TransactionOptions): Promise<string>;

    close(options?: IWeb3TransactionOptions): Promise<string>;

    offers(index: number | IBigNumber, callback?): string;
    offerIndex(): IBigNumber;
    offerIndexByAddress(address: string): IBigNumber;

    backers(index: number | IBigNumber, callback?): any[];
    backerIndex(): IBigNumber;
    getTotalBackedAmount(): IBigNumber;

    pledgePaymentPercentage(): IBigNumber;
    startPaymentPercentage(): IBigNumber;

    getPledgePaymentAmount(backerIndex: number | IBigNumber): IBigNumber;
    getStartPaymentAmount(backerIndex: number | IBigNumber): IBigNumber;
    getEndPaymentAmount(backerIndex: number | IBigNumber): IBigNumber;

    isStartPaymentComplete(): boolean;
    isPaymentComplete(): boolean;



    isClosed(): boolean;
    getBestOfferIndex(): IBigNumber;
    getBestPrice(): IBigNumber;
    acceptedOffer(): string;

    registry(): string;
    owner(): string;
    productName(): string;
    productDescription(): string;
    productSku(): string;
    productUnitSize(): string;
    mainCategory(): string;
    subCategory(): string;
    maxPrice(): IBigNumber;
    endDate(): string;
    ultimateDeliveryDate(): string;

    pledgePaymentPercentage(): IBigNumber;
    startPaymentPercentage(): IBigNumber;

    reportDelivery(backerIndex: number | IBigNumber, isCorrect: boolean, options?: IWeb3TransactionOptions): Promise<string>;

    minimumReportedCorrectDeliveryPercentage(): IBigNumber;
    getMinimumCorrectDeliveryCount(): IBigNumber;
    getCorrectDeliveryCount(): IBigNumber;
    isDeliveryComplete(): boolean;

    startPayoutAmount(): IBigNumber;
    startPayoutTransactionID(): string;
    endPayoutAmount(): IBigNumber;
    endPayoutTransactionID(): string;
    isReadyForStartPayout(): boolean;
    isReadyForEndPayout(): string;
    getStartPayoutAmount(): IBigNumber;
    getEndPayoutAmount(): IBigNumber;

    registerStartPayout(txId: string, amount: number | IBigNumber, options?: IWeb3TransactionOptions): Promise<string>;
    registerEndPayout(txId: string, amount: number | IBigNumber, options?: IWeb3TransactionOptions): Promise<string>;
}

export interface IOfferContract extends IWeb3Contract {
    owner(): string;
    price(): IBigNumber;
    minimumAmount(): IBigNumber;
    cardId(): string;

    setPrice(price: number | IBigNumber, options?: IWeb3TransactionOptions): Promise<string>;
    setMinimumAmount(amount: number | IBigNumber, options?: IWeb3TransactionOptions): Promise<string>;
    setCardId(cardId: string, options?: IWeb3TransactionOptions): Promise<string>;
}