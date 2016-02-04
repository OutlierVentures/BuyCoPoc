import {Promise} from 'q';

export interface IBigNumber {
    toNumber(): number
}

export interface IWeb3TransactionOptions {
    gas?: number;
    to?: number;
    from?: number;
}

export interface IWeb3Contract {
    address: string;
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
    addProposal(productName: string,
        productCategory: string,
        productSubCategory: string,
        maxPrice: number,
        endDate: string,
        ultimateDeliveryDate: string, options?: IWeb3TransactionOptions): Promise<string>;

    proposals(index: number | IBigNumber, callback?): string;
    proposalIndex(): IBigNumber;

    name(): string;
}

export interface IProposalContract extends IWeb3Contract {
    setDetails(productDescription: string,
        productSku: string,
        productUnitSpecification: string, options?: IWeb3TransactionOptions): Promise<string>;

    back(amount: number, options?: IWeb3TransactionOptions): Promise<string>;
    offer(price: number, minimumAmount: number, options?: IWeb3TransactionOptions): Promise<string>;

    setPaid(backingAddress: string, paymentType: number, transactionId: string, amount: number): Promise<string>;

    offers(index: number | IBigNumber, callback?): string;
    offerIndex(): IBigNumber;

    backers(index: number | IBigNumber, callback?): any[];
    backerIndex(): IBigNumber;
    backerIndexByAddress(address: string): IBigNumber;

    productName(): string;
    productDescription(): string;
    productSku(): string;
    productUnitSpecification(): string;
    mainCategory(): string;
    subCategory(): string;
    maxPrice(): IBigNumber;
    endDate(): string;
    ultimateDeliveryDate(): string;
}

export interface IOfferContract extends IWeb3Contract {
    sellerAddress(): string;
    price(): IBigNumber;
    minimumAmount(): IBigNumber;
}