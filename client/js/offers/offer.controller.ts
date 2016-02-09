interface IOfferScope extends ng.IScope {
    proposal: IProposal;
    cards: Array<IUpholdCard>;
    vm: OfferController;

    offer: IOffer;
    toCard: string;

    seller: ISeller;

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
        "identityService",
        "blockchainService"];

    constructor(
        private $scope: IOfferScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: IOfferRouteParameters,
        private identityService: IdentityService,
        private blockchainService: BlockchainService) {

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

    private getOfferData(offerId: string, cb: any) {
        var t = this;

        // Get Proposal data
        this.$http({
            method: 'GET',
            url: apiUrl + '/offer/' + offerId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IOffer) {
            t.$scope.offer = resultData;

            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log("Error loading offer data:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error.error;

            cb("Error getting offer data", null);
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

            var anyP = <any>t.$scope.proposal;
            var startPayoutPerc = resultData.pledgePaymentPercentage + resultData.startPaymentPercentage;
            anyP.startPayoutPercentage = startPayoutPerc;
            anyP.startPayoutPerProduct = startPayoutPerc / 100 * resultData.maxPrice;

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

        t.getOfferData(offerId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

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

        // Call the proposal contract from our own address.
        // TODO: verify that an ethereum account for the user has been configured.
        this.blockchainService.getProposalContract(t.$scope.proposal.contractAddress)
            .then(proposalContract => {
                var options: IWeb3TransactionOptions = {
                    // More gas for offer as it creates a contract
                    gas: 2500000,
                    from: t.blockchainService.getCurrentAccount()
                };

                // Set the seller address for consistency checks.
                t.$scope.offer.sellerAddress = t.blockchainService.getCurrentAccount();
                
                proposalContract.offer(t.$scope.offer.price * 100, t.$scope.offer.minimumAmount, options, function (err, transactionId) {
                    if (err) {
                        t.$scope.processMessage = undefined;
                        if (err.message) err = err.message;
                        t.$scope.errorMessage = err;
                        // Unless we do $scope.$apply, the error message doesn't appear. I still don't fully
                        // understand when this is and when this isn't necessary. It can lead to errors
                        // when calling it at points where it should not be called.
                        t.$scope.$apply();
                        return;
                    }

                    t.$scope.processMessage = "Your request to submit an offer for the BuyCo was submitted. Waiting for further processing...";

                    t.$http({
                        method: 'POST',
                        url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/offer',
                        data: {
                            transactionId: transactionId,
                            offer: t.$scope.offer
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
                });
            }, err => {
                t.$scope.processMessage = undefined;
                t.$scope.errorMessage = err;
            });
    }
}
