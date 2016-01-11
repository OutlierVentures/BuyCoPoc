interface IProposalScope extends ng.IScope {
    proposal: IProposal;
    amount: number;
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

        var proposalId = this.$routeParams.id;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "back") {
            this.back(proposalId);
        } else if (this.$route.current.name === "details") {
            this.view(proposalId);
        }

    }

    private getProposalData(proposalId: string, cb: any) {
        var t = this;

        // Get Proposal data
        this.$http({
            method: 'GET',
            url: apiUrl + '/proposal/' + proposalId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IProposal) {
            t.$scope.proposal = resultData;

            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log("Error loading proposal data:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;

            cb("Error getting proposal data", null);
        });
    }

    //private getProposalStatistics(proposalId: string, cb: any) {
    //    var t = this;

    //    // Get statistics
    //    this.$http({
    //        method: 'GET',
    //        url: apiUrl + '/proposal/' + proposalId + '/statistics',
    //        headers: { AccessToken: t.$rootScope.userInfo.accessToken }
    //    }).success(function (resultData: IProposalStatistics) {
    //        t.$scope.statistics = resultData;
    //        cb(null, resultData);
    //    }).error(function (error) {
    //        // Handle error
    //        console.log("Error loading proposal statistics:");
    //        console.log(error);

    //        // Show notification
    //        t.$scope.errorMessage = error.error;

    //        cb("Error getting proposal data", null);
    //    });

    //}

    view(proposalId: string) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });
    }

    /**
     * Show screen to back a proposal.
     */
    back(proposalId: string) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
        });
    }

    backConfirm() {
        var t = this;

        // Confirm backing the currently loaded proposal.
        t.$scope.processMessage = "Backing prooposal...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/proposal/' + t.$scope.proposal.id + '/back',
            data: { proposal: t.$scope.proposal, amount: t.$scope.amount },
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.processMessage = undefined;
            t.$scope.successMessage = "You successfully backed this proposal for " + t.$scope.amount +
                " units of " + t.$scope.proposal.productName + "! Taking you back to the proposal...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the proposal view
                t.$location.path("/proposal/" + t.$scope.proposal.id)
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error confirming backing:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error;
        });
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
