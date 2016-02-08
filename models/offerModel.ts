/**
 * An offer made to a buying proposal by a seller.
 */
export interface IOffer {
    id: string;
    sellerAddress: string;
    price: number;
    minimumAmount: number;
    toCard: string;

    sellerName: string;
}
