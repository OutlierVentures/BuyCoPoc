var _ = require('underscore');
var serviceFactory = require('../services/serviceFactory');
var UpholdController = (function () {
    function UpholdController() {
    }
    UpholdController.prototype.getCards = function (req, res) {
        var token = req.header("AccessToken");
        var brs = serviceFactory.createUpholdService(token);
        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500, {
                    "status": "Error",
                    "error": err,
                });
            }
            else {
                res.json(cards);
            }
        });
    };
    UpholdController.prototype.getCardsWithBalance = function (req, res) {
        var token = req.header("AccessToken");
        var brs = serviceFactory.createUpholdService(token);
        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500, {
                    "status": "Error",
                    "error": err,
                });
            }
            else {
                // Extract cards with non-zero balance
                var cardsWithBalance = _(cards).filter(function (c) {
                    return c.balance > 0;
                });
                res.json(cardsWithBalance);
            }
        });
    };
    return UpholdController;
})();
exports.UpholdController = UpholdController;
//# sourceMappingURL=upholdController.js.map