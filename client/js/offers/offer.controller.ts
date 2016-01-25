interface IOfferScope extends ng.IScope {
    proposal: IProposal;
    cards: Array<IUpholdCard>;
    vm: OfferController;

    price: number;
    minimumAmount: number;
    toCard: string;

    processMessage: string;
    errorMessage: string;
    successMessage: string;
    transactionId: string;
}

interface IOfferRouteParameters extends ng.route.IRouteParamsService {
    proposalId: string;
}

class OfferController {
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
        private $scope: IOfferScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: IProposalRouteParameters,
        private identityService: IdentityService) {

        $scope.vm = this;

        var proposalId = this.$routeParams.proposalId;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "create") {
            this.back(proposalId);
        } else if (this.$route.current.name === "details") {
            this.view(proposalId);
        }

    }

    private getCardsData(cb: any) {
        var t = this;

        // Get Uphold cards with >0 funds
        // TODO: call in parallel; use promises for that.
        t.$http({
            method: 'GET',
            url: apiUrl + '/uphold/me/cards/withBalance',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (cards: any) {
            console.log("Success on Uphold call through our API. Result:");
            console.log(cards);

            // Store in scope to show in view
            t.$scope.cards = cards;
        }).error(function (error) {
            // Handle error
            console.log("Error on Uphold call through our API:");
            console.log(error);

            cb(error, null);
        });
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

    view(offerId: string) {
        var t = this;

        // TODO: get offer data


        //t.getProposalData(proposalId, function (err, res) {
        //    // The getter already sets scope variables. Nothing to do here.
        //});

    }

    /**
     * Show screen to create an offer.
     */
    create(proposalId: string) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
        });
        t.getCardsData(function (err, res) {
        });
    }

    createConfirm() {
        var t = this;

        // Confirm backing the currently loaded proposal.
        t.$scope.processMessage = "Creating offer...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        this.$http({
            method: 'POST',
            url: apiUrl + '/proposal/' + t.$scope.proposal.id + '/offer',
            data: {
                proposal: t.$scope.proposal,
                price: t.$scope.price,
                toCard: t.$scope.toCard
            },
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.processMessage = undefined;
            t.$scope.transactionId = resultData.startPaymentTransactionId;
            t.$scope.successMessage = "You successfully created an offer for the price of " + t.$scope.price +
                " for a minimum amount of " + t.$scope.minimumAmount
                + "units of " + t.$scope.proposal.productName + "! Taking you back to the proposal...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the proposal view
                t.$location.path("/proposal/" + t.$scope.proposal.id)
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error confirming offer:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error;
        });
    }
}
