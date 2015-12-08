contract Proposal {
    string public product;
    uint public price;

    function Proposal(string pn, uint pr) {
        product = pn;
        price = pr;
    }
}

contract ProposalRegistry {
    mapping (uint=>Proposal) public proposals;
    uint proposalIndex;

    function addProposal(string productName, uint price) returns (Proposal p) {               proposalIndex++;

        p = new Proposal(productName, price);
        proposals[proposalIndex] = p;

        return p;

    }
}
