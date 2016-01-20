interface ISellerProposalController {
    proposals: IProposals[];
    message: string;
    search: Function;
    productCategory: ProductCategory;
    partNumber: string;
    minimumTotalAmount: number;
    maximumPrice: number;
}

class SellerProposalController {
    public static $inject = [
        "$rootScope",
        "sellerProposalService"
    ];
    public proposals: IProposal[];
    
    constructor(
        private $rootScope: BuyCoRootScope,
        private sellerProposalService: ISellerProposalService
    ) {
        this.sellerProposalService.getProposals().then((result) => {
            result
        }); 
    }
    
    search() {
        
    }

    
}
