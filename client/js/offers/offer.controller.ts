interface IOfferScope extends ng.IScope {
    proposal: IProposal;
    cards: Array<IUpholdCard>;
    vm: OfferController;

    offer: IOffer;
    toCard: string;

    processMessage: string;
    errorMessage: string;
    successMessage: string;
    transactionId: string;
}

interface IOfferRouteParameters extends ng.route.IRouteParamsService {
    proposalId: string;
    offerId: string;
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
        private $routeParams: IOfferRouteParameters,
        private identityService: IdentityService) {

        $scope.vm = this;

        var proposalId = this.$routeParams.proposalId;
        var offerId = this.$routeParams.offerId;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "new") {
            this.create(proposalId);
        } else if (this.$route.current.name === "details") {
            this.view(offerId, proposalId);
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

    view(offerId: string, proposalId: string) {
        var t = this;

        // TODO: get offer data


        t.getProposalData(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

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
            url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/offer',
            data: {
                price: t.$scope.offer.price,
                minimumAmount: t.$scope.offer.minimumAmount,
                toCard: t.$scope.offer.toCard
            },
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.processMessage = undefined;
            t.$scope.transactionId = resultData.startPaymentTransactionId;
            t.$scope.successMessage = "You successfully created an offer for the price of " + t.$scope.offer.price +
                " for a minimum amount of " + t.$scope.offer.minimumAmount
                + " units of " + t.$scope.proposal.productName + "! Taking you back to the proposal...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Redirect to the proposal view
                t.$location.path("/proposal/" + t.$scope.proposal.contractAddress)
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
