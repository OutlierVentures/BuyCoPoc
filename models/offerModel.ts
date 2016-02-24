/**
 * An offer made to a buying proposal by a seller.
 */
export interface IOffer {
    id: string;
    owner: string;
    price: number;
    minimumAmount: number;
    // TODO: uniformize name (in contract this is called "cardId")
    toCard: string;

    sellerName: string;
}
