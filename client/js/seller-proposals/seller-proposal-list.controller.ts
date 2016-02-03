interface ISellerProposalListController {
    proposals: IProposal[];
    message: string;
    search: Function;
    isSearching: boolean;
    autoSearch: boolean;
    proposalFilter: IProposalFilter;
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
    public isFilterSet: boolean;
    public isSearching: boolean;
    public filterChanged: boolean;
    autoSearch: boolean;
    
    private emptyFilter: IProposalFilter = {
        maxPrice: null,
        minimumTotalAmount: null,
        partNumber: null,
        mainCategory: null,
        subCategory: null
    };
    
    constructor(
        private $scope: ng.IScope,
        private $rootScope: BuyCoRootScope,
        private sellerProposalService: ISellerProposalService,
        propososalDetail: IProposalDetailScope
    ) {
        angular.copy(this.emptyFilter, this.proposalFilter);
        this.search();
        this.filterChanged = false;
        this.isFilterSet = false;
        this.$scope.$watch(() => { return this.proposalFilter; }, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.filterChanged = true;
                var isFilterSet = !this.isEmptyObject(this.proposalFilter);
                this.isFilterSet = isFilterSet;
            }
        }, true);
    }
        
    public search() {
        this.isSearching = true;
        var proposalFilter = this.isFilterSet ? this.proposalFilter : null;
        this.sellerProposalService.getProposals(
            this.$rootScope.userInfo.accessToken, 
            proposalFilter
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
    
    private isEmptyObject = (o) => {
        return Object.keys(o).every(function(x) {
            var result = !o[x];
            return result;
        });
    };
}

angular.module("buyCoApp")
.controller("SellerProposalListController", SellerProposalListController);