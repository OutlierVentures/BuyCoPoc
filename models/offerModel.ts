/**
 * An offer made to a buying proposal by a seller.
 */
export interface IOffer {
    // Core properties
    id: string;
    owner: string;
    price: number;
    minimumAmount: number;
    // TODO: uniformize name (in contract this is called "cardId")
    toCard: string;

    // Properties added from MongoDB or related contracts
    sellerName: string;    
    userId: string;
}
