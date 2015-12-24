interface IProposalScope extends ng.IScope {
    proposal: IProposal;
    vm: ProposalController;
    processMessage: string;
    errorMessage: string;
    successMessage: string;
}

interface IProposalRouteParameters extends ng.route.IRouteParamsService {
    id: string;
}

class ProposalController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$timeout",
        "$route",
        "$routeParams",
        "identityService"];

    constructor(
        private $scope: IProposalScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: IProposalRouteParameters,
        private identityService: IdentityService) {

        $scope.vm = this;

        //var proposalId = this.$routeParams.id;
        
    }

    create() {
        // TODO: check for validity
        var t = this;

        // Process creating a new Proposal.
        t.$scope.processMessage = "Creating Proposal... this may take a while because we're creating the smart contract that guarantees the correct and incorruptible functioning of your Proposal.";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/proposal',
            data: t.$scope.proposal,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IProposal) {
            t.$scope.processMessage = undefined;
            t.$scope.errorMessage = undefined;
            t.$scope.proposal = resultData;
            t.$scope.successMessage = "Your Proposal to buy '" + resultData.productName + "' has been created successfully.";

            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the proposal view
                // TODO: go to individual proposal once there is a view for it.
                //t.$location.path("/proposal/" + resultData._id);
                t.$location.path("/proposal/list");
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error saving proposal:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;
        });
    }
}
