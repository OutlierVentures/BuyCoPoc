interface ISellerProposalListController {
    proposals: IProposal[];
    message: string;
    search: Function;
    isSearching: boolean;
    autoSearch: boolean;
    proposalFilter: IProposalFilter;
}

interface IProposalFilter {
    minimumTotalAmount?: number;
    maximumPrice?: number;
    partNumber?: string;
    productCategory?: string;
}

class SellerProposalListController implements ISellerProposalListController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "sellerProposalService"
    ];
    public proposals: IProposal[];
    public message: string;
    public messageType: MessageType;
    public proposalFilter: IProposalFilter;
    public isSearching: boolean;
    public filterChanged: boolean;
    autoSearch: boolean;
    
    constructor(
        private $scope: ng.IScope,
        private $rootScope: BuyCoRootScope,
        private sellerProposalService: ISellerProposalService,
        propososalDetail: IProposalDetailScope
    ) {
        this.proposalFilter = {
            maximumPrice: null,
            minimumTotalAmount: null,
            partNumber: null,
            productCategory: null
        }
        this.search();
        this.filterChanged = false;
        this.$scope.$watch(() => { return this.proposalFilter; }, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.filterChanged = true;
            }
        }, true);
    }
    
    public search() {
        this.isSearching = true;
        this.sellerProposalService.getProposals(
            this.$rootScope.userInfo.accessToken, 
            this.proposalFilter
         ).then((results) => {
             this.proposals = results;
         }).catch((err) => {
             this.message = err;
             this.messageType = Types.MessageType.Danger;
         }).finally(() => {
             this.isSearching = false;
             this.filterChanged = false;
         });
    }
}

angular.module("buyCoApp")
.controller("SellerProposalListController", SellerProposalListController);