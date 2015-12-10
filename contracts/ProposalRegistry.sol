/**
 * Offer to respond to a proposal.
 */
contract Offer {
    /**
     * The seller who made this offer.
     */
    address public sellerAddress;

    /**
     * Price offered at the minimum amount.
     */
    uint public price;

    /**
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


/**
 * A sungle buying proposal.
 */
contract Proposal {
    /**
     * Name of the product to be bought.
     */
    string public productName;

    /**
     * A description of the product that is unambiguous to all the stakeholders.
     */
    string public productDescription;

    /**
     *
     */
    uint public maxPrice;

    /**
     * Date after which this proposal is terminated. It can be terminated by
     * accepting a valid offer, or
     */
    string public endDate;

    /**
     * Ultimate date when the products should be delivered to the buyers.
     */
    string public ultimateDeliveryDate;

    struct Backing {
        address buyerAddress;
        uint amount;
    }

    /**
     * Prospective buyers backing this proposal.
     */
    mapping(uint => Backing) public backers;
    uint public backerIndex;

    /**
     * Index to help access the backer mapping.
     */
    mapping(address => uint) public backerIndexByAddress;

    /**
     * Prospective buyers backing this proposal.
     */
    mapping(uint => Offer) public offers;
    uint public offerIndex;

    /**
     * Index to help access the backer mapping.
     */
    mapping(address => uint) public offerIndexByAddress;


    function Proposal(string pn, string pd, uint mp, string ed, string udd) {
        productName = pn;
        productDescription = pd;
        maxPrice = mp;
        endDate = ed;
        ultimateDeliveryDate = udd;
    }

    /**
     * Back the proposal, i.e. pledge to buy a certain amount.
     */
    function back(uint am) {
        // TODO: check that the proposal hasn't been closed. Use newer Solidity
        // functions with precorditions in signature?
        if(am == 0)
            return;

        if(backerIndexByAddress[tx.origin] > 0 ){
            // Existing backer. Update the amount.
            backers[backerIndexByAddress[tx.origin]].amount = am;
            return;
        }

        backerIndex++;

        backerIndexByAddress[tx.origin] = backerIndex;
        backers[backerIndex].amount = am;
        backers[backerIndex].buyerAddress = tx.origin;
    }

    /**
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

    /**
     * Cancel the offer of a seller if the proposal is still open.
     */
    function cancelOffer(){
        // TODO
    }

    /**
     * Attempt to close the proposal if the closing conditions are met:
     * - the end date has been reached
     * - a valid offer has been made
     */
    function close(){

    }
}

/**
 * Central registry for buyng proposals. This contract is deployed once. The
 * contract instance corresponds to one BuyCo service.
 */
contract ProposalRegistry {
    /**
     * Name of the registry, e.g. "BuyCo"
     */
    string public name;

    function ProposalRegistry(string n){
        name = n;
    }

    /**
     * All current and historical proposals.
     */
    mapping (uint=>Proposal) public proposals;
    uint proposalIndex;

    function addProposal(string productName, string description, uint maxPrice, string endDate, string ultimateDeliveryDate) returns (Proposal p) {
        proposalIndex++;

        p = new Proposal(productName, description, maxPrice, endDate, ultimateDeliveryDate);
        proposals[proposalIndex] = p;

        return p;

    }
}
