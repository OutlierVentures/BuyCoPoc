interface IProposalScope extends ng.IScope {
    proposal: IProposal;
    backers: Array<IProposalBacking>;
    backing: IProposalBacking;
    proposalContract: IProposalContract;
    offers: Array<IOffer>;
    amount: number;
    fromCard: string;
    cards: Array<IUpholdCard>;
    vm: ProposalController;
    processMessage: string;
    errorMessage: string;
    successMessage: string;
    transactionId: string;
    pageUrl: string;
    allCategories: IMainCategory[];
}

interface IProposalRouteParameters extends ng.route.IRouteParamsService {
    id: string;
    backerIndex: number;
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
        var backerIndex = this.$routeParams.backerIndex;

        // This controller serves multiple actions. We distinguish the action by a 'name' which
        // is set in the route configuration in app.ts.
        if (this.$route.current.name === "new") {
            this.create();
        } if (this.$route.current.name === "back") {
            this.back(proposalId);
        } else if (this.$route.current.name === "details") {
            this.view(proposalId);
        } else if (this.$route.current.name === "close") {
            this.close(proposalId);
        } else if (this.$route.current.name === "report-delivery") {
            this.reportDelivery(proposalId, backerIndex);
        }

    }

    create() {
        this.getCategoryData((err, res) => { });
    }

    private getCategoryData(cb: any) {
        var t = this;

        // Get category data
        t.$http({
            method: 'GET',
            url: apiUrl + '/category/all'
        }).success(function (resultData: IMainCategory[]) {
            t.$scope.allCategories = resultData;
            cb(null, resultData);
        }).error(function (error) {
            // Handle error
            console.log(error);

            cb("Error getting category data", null);
        });
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

        t.$scope.pageUrl = t.$location.absUrl();

        // Get Proposal data
        this.$http({
            method: 'GET',
            url: apiUrl + '/proposal/' + proposalId,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IProposal) {
            t.$scope.proposal = resultData;

            // Enhance the proposal data
            var anyP = <any>t.$scope.proposal;

            // TODO: move these server side
            anyP.pledgePaymentPerProduct = Math.max(resultData.pledgePaymentPercentage / 100 * resultData.maxPrice, 0.01);
            anyP.startPaymentPerProduct = Math.max(resultData.startPaymentPercentage / 100 * resultData.maxPrice, 0.01);

            anyP.shouldClose = (moment(t.$scope.proposal.endDate).format() < moment().format());

            t.blockchainService.getProposalContractAt(proposalId)
                .then(pc => {
                    t.$scope.proposalContract = pc;

                    // Add some properties with information about the state of the proposal.
                    // TODO: move to server side, cache.
                    anyP.isDeliveryComplete = pc.isDeliveryComplete();
                    anyP.isPaymentComplete = pc.isPaymentComplete();
                    anyP.isStartPaymentComplete = pc.isStartPaymentComplete();
                    anyP.isPayoutComplete = pc.endPayoutTransactionID() ? true : false;
                })
                .catch(err => {
                    console.error(err);
                });

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
            // Add "isCurrentUser"
            resultData = _(resultData).map(b => {
                b.isCurrentUser = (b.userId == t.$rootScope.userInfo._id);
                return b;
            });

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

            // Set enhanced properties on the offer.
            // DUPLICATION: with offerController.ts.
            for (var k in t.$scope.offers)
            {
                var offer = t.$scope.offers[k];
                var anyO = <any>offer;
                anyO.isCurrentUser = offer.userId == t.$rootScope.userInfo._id;
            }

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

    processClose() {
        var t = this;

        t.$scope.processMessage = "Requesting the BuyCo service to close the proposal...";

        // Call the backend to initiate the closing of the proposal.
        t.$http({
            method: 'POST',
            url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/close',
        }).success(function (resultData: IProposalBacking) {
            t.$scope.processMessage = undefined;
            t.$scope.transactionId = resultData.pledgePaymentTransactionId;
            t.$scope.successMessage = "Successfully requested the BuyCo service to close the proposal. Refreshing...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Refresh
                t.$route.reload();
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error triggering close:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error;
        });
    }

    processPayments() {
        var t = this;

        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;
        t.$scope.processMessage = "Requesting the BuyCo service to process any pending payments. This can take a very long time. You can wait for the result or come back here later.";

        t.$http({
            method: 'POST',
            url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/process-payments',
        }).success(function (resultData: IProposalBacking) {
            t.$scope.processMessage = undefined;
            t.$scope.transactionId = resultData.pledgePaymentTransactionId;
            t.$scope.successMessage = "Successfully requested the BuyCo service to process payments for the proposal. Refreshing...";
            t.$timeout(() => {
            }, 5000).then((promiseValue) => {
                t.$scope.successMessage = undefined;

                // Refresh
                t.$route.reload();
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error triggering payments:");
            console.log(error);

            // Show notification
            t.$scope.errorMessage = error;
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
        t.$scope.processMessage = "Backing BuyCo...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        // Call the proposal contract from our own address.
        // TODO: verify that an ethereum account for the user has been configured.
        this.blockchainService.getProposalContractAt(t.$scope.proposal.contractAddress)
            .then(proposalContract => {
                var options: IWeb3TransactionOptions = {
                    // Still unclear how much gas should really be used. 250000 works at this point.
                    // If too low, it will be shown in the UX.
                    gas: 250000,
                    from: t.blockchainService.getCurrentAccount()
                };

                // TODO: create a guidRemoveDashes() to remove dashes from guids on front end.
                proposalContract.back(t.$scope.amount, t.$scope.fromCard.replace("-", ""), options, function (err, transactionId) {
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

                    t.$scope.processMessage = "Your request to join the BuyCo was submitted. Waiting for further processing...";

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
                    }).success(function (resultData: IProposalBacking) {
                        t.$scope.processMessage = undefined;
                        t.$scope.transactionId = resultData.pledgePaymentTransactionId;
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
            });

    }

    processCreate() {
        // TODO: check for validity
        var t = this;
        var p = t.$scope.proposal;
        var cat = JSON.parse((<any>p).category);

        p.mainCategory = cat.mainCategory;
        p.subCategory = cat.subCategory;

        t.$scope.processMessage = "Submitting proposal... this may take a while because we're creating the smart contract that guarantees the correct and incorruptible functioning of your BuyCo.";

        // Call the proposal contract from our own address.
        // TODO: verify that an ethereum account for the user has been configured.
        // TODO: move this to a service; it got too complex.
        this.blockchainService.getProposalRegistryContract()
            .then(registryContract => {
                var ownerAddress = t.blockchainService.getCurrentAccount();
                var options: IWeb3TransactionOptions = {
                    gas: 2500000,
                    from: ownerAddress,
                };

                // Set owner address for integrity checks
                p.owner = ownerAddress;

                registryContract.addProposal(p.productName,
                    p.mainCategory,
                    p.subCategory,
                    p.maxPrice * 100,
                    p.endDate.toString(), p.ultimateDeliveryDate.toString(), options,
                    function (err, transactionId) {
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

                        t.blockchainService.promiseCommital(transactionId)
                            .then(tx => {
                                var proposalIndex = registryContract.proposalIndex().toNumber();
                                var newProposalAddress = registryContract.proposals(proposalIndex);

                                p.contractAddress = newProposalAddress;

                                return t.blockchainService.getProposalContractAt(newProposalAddress);
                            })
                            .then(proposalContract => {
                                // Do rudimentary checks to ensure the proposal was added.
                                if (proposalContract.owner() != p.owner
                                    || proposalContract.productName() != p.productName
                                    || proposalContract.maxPrice().toNumber() != p.maxPrice * 100) {
                                    throw ("Could not add proposal.");
                                }

                                proposalContract.setDetails(p.productDescription,
                                    p.productSku,
                                    p.productUnitSize,
                                    options,
                                    function (err, transactionId) {
                                        t.processCreateBackend(transactionId);
                                    });
                            }).catch(err => {
                                throw (err);
                            });
                    });
            });
    }

    /**
     * Signal the backend that a new proposal has been created so it can carry out its actions 
     * to follow this up
     * @param setDetailsTxId transaction ID of the call to the setDetails contract function.
     */
    processCreateBackend(setDetailsTxId: string) {
        var t = this;

        // Backend processing for new proposals
        t.$scope.processMessage = "Processing proposal... this may take a while because we're creating the smart contract that guarantees the correct and incorruptible functioning of your BuyCo.";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        t.$http({
            method: 'POST',
            url: apiUrl + '/proposal',
            data: {
                proposal: t.$scope.proposal,
                transactionId: setDetailsTxId
            },
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
                t.$location.path("/proposal/" + resultData.contractAddress);
            });
        }).error(function (error) {
            t.$scope.processMessage = undefined;

            // Handle error
            console.log("Error saving proposal:");
            console.log(error);

            // Show notification
            if (error.error)
                t.$scope.errorMessage = error.error;
            else
                t.$scope.errorMessage = error;
        });
    }



    /**
     * Show screen to back a proposal.
     */
    reportDelivery(proposalId: string, backerIndex: number) {
        var t = this;

        t.getProposalData(proposalId, function (err, res) {
        });

        t.getProposalBackers(proposalId, function (err, res) {
            t.$scope.backing = _(t.$scope.backers).find(b => b.backerIndex == backerIndex);
        });
    }

    reportDeliveryConfirm(isCorrect: boolean) {
        var t = this;

        // Confirm backing the currently loaded proposal.
        t.$scope.processMessage = "Processing your delivery report...";
        t.$scope.errorMessage = undefined;
        t.$scope.successMessage = undefined;

        // Call the proposal contract from our own address.
        // TODO: verify that an ethereum account for the user has been configured.
        this.blockchainService.getProposalContractAt(t.$scope.proposal.contractAddress)
            .then(proposalContract => {
                var options: IWeb3TransactionOptions = {
                    // Still unclear how much gas should really be used. 250000 works at this point.
                    // If too low, it will be shown in the UX.
                    gas: 250000,
                    from: t.blockchainService.getCurrentAccount()
                };

                // TODO: create a guidRemoveDashes() to remove dashes from guids on front end.
                proposalContract.reportDelivery(t.$scope.backing.backerIndex, isCorrect, options, function (err, transactionId) {
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

                    t.$scope.processMessage = "Your delivery report was submitted. Waiting for further processing...";

                    // Now call the backend to process the rest (payment etc).
                    t.$http({
                        method: 'POST',
                        url: apiUrl + '/proposal/' + t.$scope.proposal.contractAddress + '/delivery-report',
                        data: {
                            // Pass our transaction ID to the server side for further processing.
                            transactionId: transactionId,
                            isDeliveryCorrect: isCorrect,
                            backingIndex: t.$scope.backing.backerIndex,
                        },
                        headers: { AccessToken: t.$rootScope.userInfo.accessToken }
                    }).success(function (resultData: IProposalBacking) {
                        t.$scope.processMessage = undefined;
                        t.$scope.transactionId = resultData.pledgePaymentTransactionId;
                        t.$scope.successMessage = "You successfully reported the " + (isCorrect ? "correct" : "incorrect") + " delivery of your order to buy "
                            + t.$scope.proposal.productName + ". Taking you back to the proposal...";
                        t.$timeout(() => {
                        }, 5000).then((promiseValue) => {
                            t.$scope.successMessage = undefined;

                            // Redirect to the proposal view
                            t.$location.path("/proposal/" + t.$scope.proposal.contractAddress)
                        });
                    }).error(function (error) {
                        t.$scope.processMessage = undefined;

                        // Handle error
                        console.log("Error confirming delivery report:");
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



