var web3plus = require('../node_modules/web3plus/lib/web3plus');
var configurationService = require('../services/configurationService');
var Q = require('q');
/**
 * Service for dealing with offers to buying proposals on the blockchain. All functions
 * return promises.
 */
var OfferContractService = (function () {
    function OfferContractService() {
        this.config = new configurationService.ConfigurationService().getConfiguration();
    }
    /**
     * Initialize the service by loading the registry contract.
     */
    OfferContractService.prototype.initialize = function () {
        var defer = Q.defer();
        var t = this;
        web3plus.loadContractFromFile('ProposalRegistry.sol', 'ProposalRegistry', this.config.ethereum.contracts.proposalRegistry, true, function (loadContractError, con) {
            if (loadContractError) {
                defer.reject(loadContractError);
                return;
            }
            t.registryContract = con;
            t.proposalContractDefinition = t.registryContract.allContractTypes.Proposal.contractDefinition;
            t.offerContractDefinition = t.registryContract.allContractTypes.Offer.contractDefinition;
            // Even though the defer is of type void, TypeScript wants a parameter passed
            // to compile.
            defer.resolve(null);
        });
        return defer.promise;
    };
    /**
     * Build a function to return an IOffer from a proposal contract address.
     * Gets the details of the proposal asynchronously.
     * To be used as a callback function from web3.js functions that return a
     * proposal address.
     * @param d A Deferred that is resolved with the new IProposal when it's complete.
     */
    OfferContractService.prototype.buildGetOfferCallback = function (d) {
        var t = this;
        return function (offerErr, offerAddress) {
            if (offerErr) {
                d.reject(offerErr);
                return;
            }
            t.offerContractDefinition.at(offerAddress, function (offerContrErr, offer) {
                console.log(Date() + " Got contract object at " + offerAddress);
                var getProperties = new Array();
                var o = {};
                // We get each of the properties of the offer async, all with a separate promise.
                // This leads to unreadable code, but it's the only known way of delivering
                // reasonable performance. See testProposalList.ts for more info.
                o.id = offerAddress;
                getProperties.push(Q.denodeify(offer.sellerAddress)().then(function (addr) { o.sellerAddress = addr; }));
                getProperties.push(Q.denodeify(offer.price)().then(function (p) { o.price = p.toNumber() / 100; }));
                getProperties.push(Q.denodeify(offer.minimumAmount)().then(function (ma) { o.minimumAmount = ma.toNumber(); }));
                Q.all(getProperties)
                    .then(function () {
                    d.resolve(o);
                });
            });
        };
    };
    /**
     * Get all offers for a proposal.
     * @param proposalContract the proposal contract object. We could accept an IProposal here,
     * but that would require another expensive request to load the contract which is probably already available.
     */
    OfferContractService.prototype.getAll = function (proposalContract) {
        var deferred = Q.defer();
        var t = this;
        // Get the details of each proposal in separate promises. Each of those requires
        // one or more JSON RPC calls to the blockchain node.
        var getOfferDetailsPromises = new Array();
        var numOffers = proposalContract.offerIndex().toNumber();
        for (var i = 1; i <= numOffers; i++) {
            var defer = Q.defer();
            getOfferDetailsPromises.push(defer.promise);
            // Call the getter asynchronously by passing a callback.
            proposalContract.offers(i, t.buildGetOfferCallback(defer));
        }
        Q.all(getOfferDetailsPromises)
            .then(function (allOffers) {
            deferred.resolve(allOffers);
        })
            .catch(function (allOffersErr) {
            deferred.reject(allOffersErr);
        });
        return deferred.promise;
    };
    /**
    * Get a single offer by its contract address.
    */
    OfferContractService.prototype.getOne = function (offerId) {
        var deferred = Q.defer();
        var t = this;
        // Get the details of each proposal in separate promises. Each of those requires
        // one or more JSON RPC calls to the blockchain node.
        var getProposalDetailsPromises = new Array();
        var defer = Q.defer();
        // Reuse the proposal builder.
        var getOffer = t.buildGetOfferCallback(defer);
        getOffer(null, offerId);
        defer.promise
            .then(function (proposal) {
            deferred.resolve(proposal);
        })
            .catch(function (proposalErr) {
            deferred.reject(proposalErr);
        });
        return deferred.promise;
    };
    /**
     * Create a new proposal in the blockchain.
     * @param proposalId proposal to add the offer to
     * @param o the new offer
     * @return The IProposal with the property "id" set to the contract address.
     */
    OfferContractService.prototype.create = function (proposalId, o) {
        var t = this;
        var defer = Q.defer();
        // Normalize amount for contract
        o.price = o.price * 100;
        var proposalContract = t.proposalContractDefinition.at(proposalId);
        proposalContract.offer(o.price, o.minimumAmount, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createOfferResult(tx) {
            // TODO: get the offer by a unique identifier.
            // TODO: ensure that the offer was actually created. defer.reject if not.
            // This can happen for various reasons, both technical and functional (i.e. price too high)
            var offerIndex = proposalContract.offerIndex().toNumber();
            var newOfferAddress = proposalContract.offers(offerIndex);
            o.id = newOfferAddress;
            // Normalize amount for display, again
            o.price = o.price / 100;
            defer.resolve(o);
        }, function getProposalErr(err) {
            defer.reject(err);
        });
        return defer.promise;
    };
    return OfferContractService;
})();
exports.OfferContractService = OfferContractService;
//# sourceMappingURL=offerContractService.js.map