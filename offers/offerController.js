var userModel_1 = require("../models/userModel");
var serviceFactory = require('../services/serviceFactory');
var userRepo = new userModel_1.UserRepository();
var OfferController = (function () {
    function OfferController() {
        this.create = function (req, res) {
            var proposalId = req.params.id;
            var offerData = req.body;
            serviceFactory.createOfferContractService()
                .then(function (ocs) {
                return ocs.create(proposalId, offerData);
            }, function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
                });
                return null;
            })
                .then(function (proposal) {
                res.json(proposal);
            }, function (createErr) {
                res.status(500).json({
                    "error": createErr,
                    "error_location": "creating proposal"
                });
                return null;
            });
        };
        this.back = function (req, res) {
            var token = req.header("AccessToken");
            var proposalData = req.body.proposal;
            var amount = req.body.amount;
            var fromCard = req.body.fromCard;
            var proposalService;
            userRepo.getUserByAccessToken(token, function (userErr, user) {
                if (userErr) {
                    res.status(500).json({
                        "error": userErr,
                        "error_location": "loading user data"
                    });
                }
                serviceFactory.createProposalService()
                    .then(function (ps) {
                    proposalService = ps;
                    return ps.back(proposalData, amount * 1, user, fromCard);
                }, function (initErr) {
                    res.status(500).json({
                        "error": initErr,
                        "error_location": "initializing proposal service"
                    });
                    return null;
                })
                    .then(function (proposalBacking) {
                    res.json(proposalBacking);
                }, function (backErr) {
                    res.status(500).json({
                        "error": backErr,
                        "error_location": "backing proposal"
                    });
                    return null;
                });
            });
        };
        this.getBackers = function (req, res) {
            serviceFactory.createProposalService()
                .then(function (ps) {
                return ps.getBackers(req.params.id);
            }, function (initErr) {
                res.status(500).json({
                    "error": initErr,
                    "error_location": "initializing proposal service"
                });
                return null;
            })
                .then(function (backers) {
                res.json(backers);
            }, function (backersErr) {
                res.status(500).json({
                    "error": backersErr,
                    "error_location": "getting backers"
                });
                return null;
            });
        };
    }
    return OfferController;
})();
exports.OfferController = OfferController;
