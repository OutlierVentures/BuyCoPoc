var web3plus = require('../node_modules/web3plus/lib/web3plus');
var configurationService = require('../services/configurationService');
var Q = require('q');
var OfferContractService = (function () {
    function OfferContractService() {
        this.config = new configurationService.ConfigurationService().getConfiguration();
    }
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
            defer.resolve(null);
        });
        return defer.promise;
    };
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
    OfferContractService.prototype.getAll = function (proposalContract) {
        var deferred = Q.defer();
        var t = this;
        var getOfferDetailsPromises = new Array();
        var numOffers = proposalContract.offerIndex().toNumber();
        for (var i = 1; i <= numOffers; i++) {
            var defer = Q.defer();
            getOfferDetailsPromises.push(defer.promise);
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
    OfferContractService.prototype.getOne = function (offerId) {
        var deferred = Q.defer();
        var t = this;
        var getProposalDetailsPromises = new Array();
        var defer = Q.defer();
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
    OfferContractService.prototype.create = function (proposalId, o) {
        var t = this;
        var defer = Q.defer();
        o.price = o.price * 100;
        var proposalContract = t.proposalContractDefinition.at(proposalId);
        proposalContract.offer(o.price, o.minimumAmount, { gas: 2500000 })
            .then(web3plus.promiseCommital)
            .then(function createOfferResult(tx) {
            var offerIndex = proposalContract.offerIndex().toNumber();
            var newOfferAddress = proposalContract.offers(offerIndex);
            o.id = newOfferAddress;
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
