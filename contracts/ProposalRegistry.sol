/*
 * Offer to respond to a proposal.
 */
contract Offer {
    /*
     * The seller who made this offer.
     */
    address public owner;

    /*
     * Price offered at the minimum amount.
     */
    uint public price;

    /*
     * Minimum amount of products to be bought.
     */
    uint public minimumAmount;

    /*
     * Card ID used for payouts
     */
    string public cardId;

    function setPrice(uint p){
        if(tx.origin != owner)
            return;

        price = p;
    }

    function setMinimumAmount(uint a){
        if(tx.origin != owner)
            return;

        minimumAmount = a;
    }

    function setCardId(string cId){
        if(tx.origin != owner)
            return;

        cardId = cId;
    }

    function Offer(uint p, uint ma, string cId) {
        owner = tx.origin;

        price = p;
        minimumAmount = ma;
        cardId = cId;
    }
}


/*
 * A sungle buying proposal.
 */
contract Proposal {
    /*
     * Reference to the registry that this proposal is part of, to check the owner.
     */
    ProposalRegistry public registry;

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

    // COULD DO: make it a contract of its own, so it can have functions. However
    // the getXXXamount functions still need to live in the Proposal because it
    // has the percentages. Unless we give the Backing contract a reference of
    // course...
    struct Backing {
        /*
         * Blockchain address of the buyer
         */
        address buyerAddress;

        /*
         * Amount of products the buyer has committed to buy.s
         */
        // TODO: rename to "count". "amount" is reserved for amounts of money.
        uint amount;

        /*
         * Transaction ID of the pledge payment (before closing a deal).
         * Transaction ID's currently are always 32 bytes. Therefore we
         * could change them to bytes32. That would allow string compare.
         * However there's no current need and it would require some code
         * changes. So sticking with string for now.
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
        int endPaymentAmount;

        /*
         * Indicates whether the delivery has been reported by the backer.
         */
        bool isDeliveryReported;

        /*
         * Indicates whether the delivery is correct according to the backer.
         * Any further details about the nature of what is or isn't correct
         * are discussed outside of the contract.
         */
        bool isDeliveryCorrect;

        /*
         * Uphold card ID used for payments.
         */
        string paymentCardId;
    }

    /*
     * Prospective buyers backing this proposal.
     */
    mapping(uint => Backing) public backers;
    uint public backerIndex;

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

    address public owner;

    function Proposal(string pn, string mc, string sc, uint mp, string ed, string udd) {
        productName = pn;
        mainCategory = mc;
        subCategory = sc;
        maxPrice = mp;
        endDate = ed;
        ultimateDeliveryDate = udd;

        owner = tx.origin;
        registry = ProposalRegistry(msg.sender);
    }

    function setDetails(string pd, string ps, string pus) {
        // Only to be called by the proposal owner.
        if(tx.origin != owner) return;

        productDescription = pd;
        productSku = ps;
        productUnitSize = pus;
    }

    // Payment schedule, currently fixed.
    uint public pledgePaymentPercentage = 5;
    uint public startPaymentPercentage = 45;
    // End payment percentage: there's no such thing. The end payment is the rest.
    // In case of an offer below pledge + start, it can even be a reimbursement.

    function getBestPrice() constant returns (uint price) {
        uint bestOfferIndex = getBestOfferIndex();

        // Is there a best offer?
        if(bestOfferIndex == 0)
            return;

        price = offers[bestOfferIndex].price();
    }

    function getPledgePaymentAmount(uint backerIndex) constant returns (uint amount) {
        amount = backers[backerIndex].amount * pledgePaymentPercentage * maxPrice / 100;
        // For very low prices: force a very low amount. Settled in end payment.
        if (amount == 0) amount = 1;
    }

    function getStartPaymentAmount(uint backerIndex) constant returns (uint amount) {
        amount = backers[backerIndex].amount * startPaymentPercentage * maxPrice / 100;
        // For very low prices: force a very low amount. Settled in end payment.
        if (amount == 0) amount = 1;
    }

    function getEndPaymentAmount(uint backerIndex) constant returns (int amount) {
        // The end payment amount is "the rest".
        // In case of an offer below pledge + start, it can even be a reimbursement, hence
        // a negative amount.
        // We can only compute this once there is an accepted offer. However when
        // there is none, the end payment will be minus the currently paid amount,
        // hence a full reimbursement.
        amount = int(backers[backerIndex].amount)
            * (int(acceptedOffer.price())
            - int(getPledgePaymentAmount(backerIndex))
            - int(getStartPaymentAmount(backerIndex)));
    }

    /*
     * Back the proposal, i.e. pledge to buy a certain amount.
     */
    function back(uint am, string cardId) {
        if(am == 0) return;

        // No backing after closing.
        if(isClosed) return;

        // No checks on multiple backings per buyer. Buyers can buy more later (not less).
        backerIndex++;

        backers[backerIndex].amount = am;
        backers[backerIndex].buyerAddress = tx.origin;
        backers[backerIndex].paymentCardId = cardId;
    }

    /*
     * Register a payment for a backer. To be called by the registry owner. The
     * call should only be made after the payment has been verified as having
     * the correct amount, source and destination.
     *
     * @param backerIndex the backer index
     * @param paymentType 1=pledge, 2=start, 3=end
     * @param transactionID the external transaction ID of the payment
     * @param amount the payment amount
     */
    function setPaid(uint backerIndex, uint paymentType, string transactionID, int amount) {
        // The registry owner is the trusted party to confirm payments.
        if(tx.origin != registry.owner()) return;

        // Validate this is an existing backer.
        // Ideally we would want to verify this from the original backer address.
        // The backer could send a transaction claiming they paid a certain backing
        // (checking the address), and then the registry administrator can confirm
        // this, also checking that the tx ID corresponds to a tx of the right amount
        // that has been sent to the right address.
        // So then this would be split into:
        // - claimPaid(uint backerIndex, uint paymentType, string transactionID, int amount)
        //   -> to be called by the backer
        // - confirmPaid(uint backerIndex, uint paymentType, string transactionID, int amount)
        //   -> to be called by the registry admin. Or in future cases, by a set of oracles.
        // - or denyPaid(uint backerIndex, uint paymentType), to be called by the admin/oracles,
        //   leading to a reversion. Could also be used to correct incorrect calls.
        if(backerIndex == 0) return;

        Backing b = backers[backerIndex];

        if (paymentType == 1) {
            // Pledge payment

            // Validate correct amount
            if(amount != int(getPledgePaymentAmount(backerIndex)))
                return;

            b.pledgePaymentTransactionID = transactionID;
            b.pledgePaymentAmount = uint(amount);
        }
        else if (paymentType == 2) {
            // Start payment

            // Validate that the BuyCo was closed
            if(!isClosed)
                return;

            // There should be an accepted offer. If not, the pledge payments
            // should be refunded.
            if(address(acceptedOffer) == 0x0)
                return;

            // Validate pledge payment
            if(b.pledgePaymentAmount == 0)
                return;

            if(amount != int(getStartPaymentAmount(backerIndex)))
                return;

            b.startPaymentTransactionID = transactionID;
            b.startPaymentAmount = uint(amount);
        }
        else if (paymentType == 3) {
            // End payment

            // Validate that start payment was registered
            if(b.startPaymentAmount == 0)
                return;

            // Validate correct amount
            if(amount != getEndPaymentAmount(backerIndex))
                return;

            b.endPaymentTransactionID = transactionID;
            b.endPaymentAmount = amount;
        }
    }

    /*
     * Make an offer
     */
    function offer(uint price, uint minimumAmount, string cardId) returns (Offer o){
        // No free offers allowed. Also for safety purposes (empty might end up as 0).
        if(price == 0) return;
        if(price > maxPrice) return;
        if(minimumAmount == 0) return;
        if(isClosed) return;

        // Check for an existing offer of this seller
        if(offerIndexByAddress[tx.origin] > 0) {
            // Because this is a related contract, we can't set public properties.
            // TODO: check if there are default setters, maybe set_price() or similar?
            offers[offerIndexByAddress[tx.origin]].setPrice(price);
            offers[offerIndexByAddress[tx.origin]].setMinimumAmount(minimumAmount);
            offers[offerIndexByAddress[tx.origin]].setCardId(cardId);
            return;
        }

        offerIndex++;

        offerIndexByAddress[tx.origin] = offerIndex;

        o = new Offer(price, minimumAmount, cardId);
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

    function getBestOfferIndex() constant returns (uint bestOfferIndex) {
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
        // To be called by the registry owner.
        if(tx.origin != registry.owner()) return;

        // Checking whether the end time is the responsibility of the registry
        // owner. We currently have no way to deal with time within the contract.

        // The proposal gets closed no matter whether there's a valid offer or
        // not.

        // Get the best offer.
        uint bestOfferIndex = getBestOfferIndex();

        // Did we find a valid offer?
        if (bestOfferIndex > 0) {
            acceptedOffer = offers[bestOfferIndex];
        }
        isClosed = true;
    }

    /*
     * Returns whether all the start (and pledge) payments have been received
     * from the backers.
     */
    function isStartPaymentComplete() constant public returns (bool isComplete) {
        for (uint i = 1; i <= backerIndex; i++)
        {
            if(backers[i].startPaymentAmount == 0) return;
        }
        isComplete = true;
    }

    /*
     * Returns whether all the payments have been received from the backers.
     */
    function isPaymentComplete() constant public returns (bool isComplete) {
        for (uint i = 1; i <= backerIndex; i++)
        {
            if(backers[i].endPaymentAmount == 0) return;
        }
        isComplete = true;
    }

    /*
     * Report on the delivery of the goods. To be called by the backer.
     */
    function reportDelivery(uint backerIndex, bool isCorrect) {
        Backing b = backers[backerIndex];

        // There has to be an accepted offer to report any delivery.
        if(address(acceptedOffer) == 0x0) return;

        // To be called by the backer.
        if(b.buyerAddress != tx.origin) return;

        // A delivery reported as correct cannot beb unreported.
        if(b.isDeliveryReported && b.isDeliveryCorrect) return;

        b.isDeliveryReported = true;
        b.isDeliveryCorrect = isCorrect;
    }

    /*
     * The minimum percentage of deliveries reported as correct (calculated by
     * product count) to consider the delivery complete and ready for final
     * payout.
     */
    uint public minimumReportedCorrectDeliveryPercentage = 50;

    function getMinimumCorrectDeliveryCount() constant returns (uint count) {
        count = minimumReportedCorrectDeliveryPercentage * getTotalBackedAmount() / 100;
    }

    /*
     * Returns the total count of products that have been reported as correctly
     * delivered.
     */
    function getCorrectDeliveryCount() constant returns (uint count) {
        for (uint i = 1; i <= backerIndex; i++)
        {
            if(backers[i].isDeliveryCorrect)
                count += backers[i].amount;
        }
    }

    /*
     * Returns whether delivery is complete according to the agreed upon
     * treshold.
     */
    function isDeliveryComplete() constant returns (bool isComplete) {
        isComplete = getCorrectDeliveryCount() >= getMinimumCorrectDeliveryCount();
    }

    // Payments to the seller
    uint public startPayoutAmount;
    string public startPayoutTransactionID;
    uint public endPayoutAmount;
    string public endPayoutTransactionID;

    /*
     * Returns whether the start payout to the seller may be done.
     */
    function isReadyForStartPayout() constant returns (bool isReady) {
        isReady = isClosed && isStartPaymentComplete();
    }

    /*
     * Returns whether the start payout to the seller may be done.
     */
    function isReadyForEndPayout() constant returns (bool isReady) {
        isReady = isClosed && isPaymentComplete() && isDeliveryComplete();
    }


    function getStartPayoutAmount() constant returns (uint amount) {
        amount = acceptedOffer.price() * getTotalBackedAmount()
            * (pledgePaymentPercentage + startPaymentPercentage) / 100;
    }

    function getEndPayoutAmount() constant returns (uint amount) {
        amount = acceptedOffer.price() * getTotalBackedAmount()
            - getStartPayoutAmount();
    }

    /*
     * Confirm that the start payout sum has been paid to the accepted seller.
     */
    function registerStartPayout(string txId, uint amount) {
        // Payments are confirmed by the registry owner.
        if(tx.origin != registry.owner()) return;

        if(!isReadyForStartPayout()) return;
        if(amount != getStartPayoutAmount()) return;

        startPayoutAmount = amount;
        startPayoutTransactionID =  txId;
    }

    /*
     * Confirm thath the end payout sum has been paid to the accepted seller.
     */
    function registerEndPayout(string txId, uint amount) {
        // Payments are confirmed by the registry owner.
        if(tx.origin != registry.owner()) return;

        if(!isReadyForEndPayout()) return;
        if(amount != getEndPayoutAmount()) return;

        endPayoutAmount = amount;
        endPayoutTransactionID =  txId;
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

    /*
     * The owner of the registry, e.g. BuyCo Ltd
     */
    address public owner;

    /*
     * Version of the regstriy for simple version checking. The code is currently
     * compatible with only a single version of the contracts. After any change,
     * this number should be increased. The code compares it with a variable in
     * contractInterfaces.
     */
    string public version = "0.8.2";

    function ProposalRegistry(string n){
        name = n;
        owner = tx.origin;
    }

    /*
     * All current and historical proposals.
     */
    mapping (uint=>Proposal) public proposals;
    uint public proposalIndex;

    function addProposal(string productName, string productCategory, string productSubCategory, uint maxPrice, string endDate, string ultimateDeliveryDate) returns (Proposal p) {
        proposalIndex++;

        p = new Proposal(productName,
            productCategory, productSubCategory,
            maxPrice, endDate, ultimateDeliveryDate);
        proposals[proposalIndex] = p;

        return p;
    }
}
