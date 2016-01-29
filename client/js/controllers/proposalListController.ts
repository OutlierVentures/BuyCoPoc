﻿interface IProposalListScope {
    proposals: Array<IProposal>;
    vm: ProposalListController;
}

class ProposalListController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: IProposalListScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {

        $scope.vm = this;

        this.list($route.current.params.mainCategory, $route.current.params.subCategory);
    }

    list(mainCategory?: string, subCategory?: string) {
        var t = this;
        var url: string;

        if (mainCategory && subCategory)
            url = "/proposal/category/" + mainCategory + "/" + subCategory;
        else url = "/proposal";

        this.$http({
            method: 'GET',
            url: apiUrl + url,
            headers: { "AccessToken": t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.proposals = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting proposals:");
            console.log(error);

            // TODO: show notification
        });
    }
}