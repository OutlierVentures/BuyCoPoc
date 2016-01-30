﻿interface ISellerProposalListController {
    proposals: IProposal[];
    message: string;
    search: Function;
    isSearching: boolean;
    autoSearch: boolean;
    proposalFilter: IProposalFilter;
}

interface IProposalFilter {
    maximumPrice?: number;
    minimumTotalAmount?: number;
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
    public isFilterSet: boolean;
    public isSearching: boolean;
    public filterChanged: boolean;
    autoSearch: boolean;
    
    private emptyFilter: IProposalFilter = {
        maximumPrice: null,
        minimumTotalAmount: null,
        partNumber: null,
        productCategory: null
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
                this.isFilterSet = this.isEmptyObject(this.proposalFilter);
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
    
    private isEmptyObject = (o) => {
        return Object.keys(o).every(function(x) {
            return o[x];
        });
    };
}

angular.module("buyCoApp")
.controller("SellerProposalListController", SellerProposalListController);