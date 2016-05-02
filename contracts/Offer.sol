/*
 * Offer to respond to a proposal.
 */
contract Offer {
    /*
     * The seller who made this offer.
     */
    address public sellerAddress;

    /*
     * Price offered at the minimum amount.
     */
    uint public price;

    /*
     * Minimum amount of products to be bought.
     */
    uint public minimumAmount;

    function setPrice(uint p){
        if(tx.origin != sellerAddress)
            return;

        price = p;
    }

    function setMinimumAmount(uint a){
        if(tx.origin != sellerAddress)
            return;

        minimumAmount = a;
    }

    function Offer(address sa, uint p, uint ma){
        sellerAddress = sa;
        price = p;
        minimumAmount = ma;
    }
}

