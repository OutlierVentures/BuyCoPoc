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


/*
 * A sungle buying proposal.
 */
contract Proposal {
    /*
     * Name of the product to be bought.
     */
    string public productName;

    /*
     * A description of the product that is unambiguous to all the stakeholders.
     */
    string public productDescription;

    /*
     * The SKU (unique identification number) of the product.
     */
    string public productSku;

    /*
     * Description of the indivisible unit size. E.g. "box of 12 cans".
     */
    string public productUnitSize;

    /*
     * The product category in plain text. Future vevrsions might contain a more
     * advanced taxonomy of categories.
     */
    string public mainCategory;

    /*
     * The product category in plain text. Future vevrsions might contain a more
     * advanced taxonomy of categories.
     */
    string public subCategory;

    /*
     * Maximum price the buyers are willing to pay.
     */
    uint public maxPrice;

    /*
     * Date after which this proposal is terminated. It can be terminated by
     * accepting a valid offer, or
     */
    string public endDate;

    /*
     * Ultimate date when the products should be delivered to the buyers.
     */
    string public ultimateDeliveryDate;

    struct Backing {
        /*
         * Blockchain address of the buyer
         */
        address buyerAddress;

        /*
         * Amount of products the buyer has committed to buy.s
         */
        uint amount;

        /*
         * Transaction ID of the pledge payment (before closing a deal).
         */
        string pledgePaymentTransactionID;

        /*
         * Amount of the pledge payment.
         */
        uint pledgePaymentAmount;

        /*
         * Transaction ID of the initial payment (at moment of backing).
         */
        string startPaymentTransactionID;

        /*
         * Amount of initial payment.
         */
        uint startPaymentAmount;

        /*
         * Transaction ID of the final payment (after deliery).
         */
        string endPaymentTransactionID;

        /*
         * Amount of the final payment.
         */
        uint endPaymentAmount;
    }

    /*
     * Prospective buyers backing this proposal.
     */
    mapping(uint => Backing) public backers;
    uint public backerIndex;

    /*
     * Index to help access the backer mapping.
     */
    mapping(address => uint) public backerIndexByAddress;

    /*
     * Prospective buyers backing this proposal.
     */
    mapping(uint => Offer) public offers;
    uint public offerIndex;

    /*
     * Index to help access the backer mapping.
     */
    mapping(address => uint) public offerIndexByAddress;

    /*
     * Returns whether the proposal has been closed.
     */
    bool public isClosed;

    /*
     * The offer that has been accepted.
     */
    Offer public acceptedOffer;

    function Proposal(string pn,
        string mc, string sc, uint mp, string ed, string udd) {
        productName = pn;
        mainCategory = mc;
        subCategory = sc;
        maxPrice = mp;
        endDate = ed;
        ultimateDeliveryDate = udd;
    }

    function setDetails(string pd, string ps, string pus) {
        // TODO: validate that the sender is the proposal owner.
        productDescription = pd;
        productSku = ps;
        productUnitSize = pus;
    }


    /*
     * Back the proposal, i.e. pledge to buy a certain amount.
     */
    function back(uint am) {
        // TODO: check that the proposal hasn't been closed. Use newer Solidity
        // functions with precorditions in signature?
        if(am == 0)
            return;

        // No checks on multiple backings per buyer. Buyers can buy more later (not less).

        backerIndex++;

        backers[backerIndex].amount = am;
        backers[backerIndex].buyerAddress = tx.origin;
    }

    /*
     * Register a payment for a backer.
     * @param backerAddress the backer that paid
     * @param paymentType 1=pledge, 2=start, 3=end
     * @param transactionID the external transaction ID of the payment
     * @param amount the payment amount
     */
    function setPaid(address backerAddress, uint paymentType, string transactionID, uint amount) {
        // TODO: check whether tx.origin is proposal creator? Or admin? Or the backer?
        // TODO: check whether the amount is correct according to payment
        // schedule

        // Validate this is an existing backer.
        if(backerIndexByAddress[backerAddress] == 0)
            return;

        Backing b = backers[backerIndexByAddress[backerAddress]];
        if (paymentType == 1) {
            // End payment
            b.pledgePaymentTransactionID = transactionID;
            b.pledgePaymentAmount = amount;
        }
        else if (paymentType == 2) {
            // Start payment
            // TODO: validate that pledge payment has been registered
            b.startPaymentTransactionID = transactionID;
            b.startPaymentAmount = amount;
        }
        else if (paymentType == 3) {
            // End payment
            // TODO: validate that start payment has been registered
            b.endPaymentTransactionID = transactionID;
            b.endPaymentAmount = amount;
        }
    }

    /*
     * Make an offer
     */
    function offer(uint price, uint minimumAmount) returns (Offer o){
        // No free offers allowed. Also for safety purposes (empty might end up as 0).
        if(price == 0) return;
        if(price > maxPrice) return;
        if(minimumAmount == 0) return;

        // Check for an existing offer of this seller
        if(offerIndexByAddress[tx.origin] > 0) {
            // Because this is a related contract, we can't set public properties.
            // TODO: check if there are default setters, maybe set_price() or similar?
            offers[offerIndexByAddress[tx.origin]].setPrice(price);
            offers[offerIndexByAddress[tx.origin]].setMinimumAmount(minimumAmount);
            return;
        }

        offerIndex++;

        offerIndexByAddress[tx.origin] = offerIndex;

        o = new Offer(tx.origin, price, minimumAmount);
        offers[offerIndex] = o;

        return o;
    }

    /*
     * Cancel the offer of a seller if the proposal is still open.
     */
    function cancelOffer(){
        // TODO
    }

    function getTotalBackedAmount() constant returns (uint amount){
        for (uint i = 1; i <= backerIndex; i++)
        {
            var b = backers[i];

            amount += b.amount;
        }

        return amount;
    }

    function getBestOffer() constant returns (uint bestOfferIndex) {
        uint totalBackedAmount = getTotalBackedAmount();
        uint lowestPrice = maxPrice;

        // Find the matching offer with the best price.
        for (uint i = 1; i <= offerIndex; i++)
        {
            var o = offers[i];

            if (o.price() <= lowestPrice && o.minimumAmount() <= totalBackedAmount)
            {
                // This is a better offer than previously found.
                bestOfferIndex = i;
            }
        }
    }

    /*
     * Attempt to close the proposal if the closing conditions are met:
     * - the end date has been reached (this can not be checked yet)
     * - a valid offer has been made
     */
    function close() {
        // TODO: check whether endDate has passed. The only time source that
        // the contract has access to is the block number. This is not a
        // dependable time, especially not on a private chain.

        uint bestOfferIndex = getBestOffer();

        // Did we find a valid offer?
        if (bestOfferIndex == 0) return;

        acceptedOffer = offers[bestOfferIndex];
        isClosed = true;
    }
}

/*
 * Central registry for buyng proposals. This contract is deployed once. The
 * contract instance corresponds to one BuyCo service.
 */
contract ProposalRegistry {
    /*
     * Name of the registry, e.g. "BuyCo"
     */
    string public name;

    function ProposalRegistry(string n){
        name = n;
    }

    /*
     * All current and historical proposals.
     */
    mapping (uint=>Proposal) public proposals;
    uint public proposalIndex;

    function addProposal(string productName,
        string productCategory, string productSubCategory,
        uint maxPrice, string endDate, string ultimateDeliveryDate) returns (Proposal p) {
        proposalIndex++;

        p = new Proposal(productName,
            productCategory, productSubCategory,
            maxPrice, endDate, ultimateDeliveryDate);
        proposals[proposalIndex] = p;

        return p;
    }
}
