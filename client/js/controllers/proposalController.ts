interface IProposalScope extends ng.IScope {
    proposal: IProposal;
    backers: Array<IProposalBacking>;
    offers: Array<IOffer>;
    amount: number;
    fromCard: string;
    cards: Array<IUpholdCard>;
    vm: ProposalController;
    processMessage: string;
    errorMessage: string;
    successMessage: string;
    transactionId: string;
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
        "identityService",
        "blockchainService"];

    constructor(
        private $scope: IProposalScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: IProposalRouteParameters,
        private identityService: IdentityService,
        private blockchainService: BlockchainService) {

        $scope.vm = this;

        var proposalId = this.$routeParams.id;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "back") {
            this.back(proposalId);
        } else if (this.$route.current.name === "details") {
            this.view(proposalId);
        } else if (this.$route.current.name === "close") {
            this.close(proposalId);
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
            if (error.error)
                t.$scope.errorMessage = error.error;
            else
                t.$scope.errorMessage = error;

            cb("Error getting proposal data", null);
        });
    }

    private getProposalBackers(proposalId: string, cb: any) {
        var t = this;

        // Get statistics
        this.$http({
            method: 'GET',
            url: apiUrl + '/proposal/' + proposalId + '/backers',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: Array<IProposalBacking>) {
            t.$scope.backers = resultData;
            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log("Error loading proposal backers:");
            console.log(error);

            // Show notification
            if (error.error)
                t.$scope.errorMessage = error.error;
            else
                t.$scope.errorMessage = error;

            cb("Error getting backers data", null);
        });

    }

    private getProposalOffers(proposalId: string, cb: any) {
        var t = this;

        // Get statistics
        this.$http({
            method: 'GET',
            url: apiUrl + '/proposal/' + proposalId + '/offers',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: Array<IOffer>) {
            t.$scope.offers = resultData;
            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log("Error loading proposal offers:");
            console.log(error);

            // Show notification
            if (error.error)
                t.$scope.errorMessage = error.error;
            else
                t.$scope.errorMessage = error;

            cb("Error getting offers data", null);
        });

    }

    view(proposalId: string) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

        t.getProposalBackers(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

        t.getProposalOffers(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

    }

    /**
     * Initiate closing the sale.
     * @param proposalId
     */
    close(proposalId: string) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

        t.getProposalBackers(proposalId, function (err, res) {
            // The getter already sets scope variables. Nothing to do here.
        });

        t.getProposalOffers(proposalId, function (err, res) {
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
        t.getCardsData(function (err, res) {
        });
    }

    backConfirm() {
        var t = this;

        // Confirm backing the currently loaded proposal.
        t.$scope.processMessage = "Backing proposal...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        // Call the proposal contract from our own address.
        // TODO: verify that an ethereum account for the user has been configured.
        this.blockchainService.getProposalContract(t.$scope.proposal.contractAddress).then(
            proposalContract => {
                var options = {
                    // Still unclear how much gas should really be used. 25000 works at this point.
                    // If too low, it will be shown in the UX.
                    gas: 25000,
                    from: t.blockchainService.getCurrentAccount()
                };

                proposalContract.back(t.$scope.amount, options, function (err, transactionId) {
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

                    // Now call the backend to process the rest (payment etc).
                    t.$http({
                        method: 'POST',
                        url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/back',
                        data: {
                            // Pass our transaction ID to the server side for further processing.
                            transactionId: transactionId,
                            proposal: t.$scope.proposal,
                            amount: t.$scope.amount,
                            fromCard: t.$scope.fromCard
                        },
                        headers: { AccessToken: t.$rootScope.userInfo.accessToken }
                    }).success(function (resultData: any) {
                        t.$scope.processMessage = undefined;
                        t.$scope.transactionId = resultData.startPaymentTransactionId;
                        t.$scope.successMessage = "You successfully backed this proposal for " + t.$scope.amount +
                            " units of " + t.$scope.proposal.productName + "! Taking you back to the proposal...";
                        t.$timeout(() => {
                        }, 5000).then((promiseValue) => {
                            t.$scope.successMessage = undefined;

                            // Redirect to the proposal view
                            t.$location.path("/proposal/" + t.$scope.proposal.contractAddress)
                        });
                    }).error(function (error) {
                        t.$scope.processMessage = undefined;

                        // Handle error
                        console.log("Error confirming backing:");
                        console.log(error);

                        // Show notification
                        t.$scope.errorMessage = error;
                    });

                });
            }, err => {
                t.$scope.processMessage = undefined;
                t.$scope.errorMessage = err;
            }
        );

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
            if(error.error)
                t.$scope.errorMessage = error.error;
            else
                t.$scope.errorMessage = error;
        });
    }
}
