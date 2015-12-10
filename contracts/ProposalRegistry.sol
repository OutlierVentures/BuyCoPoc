/**
 * Offer to respond to a proposal.
 */
contract Offer {

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
    function offer(uint price) {
        // No free offers allowed. Also for safety purposes (empty might end up as 0).
        if(price = 0) return;
        if(price > maxPrice) return;

        // TODO: implement


    }

    /**
     * Cancel the offer of a seller if the proposal is still open.
     */
    function cancelOffer(){

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

    function addProposal(string productName, string description, uint maxPrice, string endDate, string ultimateDeliveryDate) returns (Proposal p) {               proposalIndex++;

        p = new Proposal(productName, description, maxPrice, endDate, ultimateDeliveryDate);
        proposals[proposalIndex] = p;

        return p;

    }
}
