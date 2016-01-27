var cachedProposalService = require('../../services/cachedProposalService');
var CacheController = (function () {
    function CacheController() {
    }
    CacheController.prototype.update = function (req, res) {
        var cps = new cachedProposalService.CachedProposalService();
        cps.initialize()
            .then(function (result) {
            return cps.ensureMongoCache();
        }, function (err) {
            res.status(500).json({
                "status": "Error",
                "location": "initializing CachedProposalService",
                "error": err,
            });
            return null;
        })
            .then(function (result) {
            res.status(200).json(result);
        }, function (err) {
            res.status(500).json({
                "status": "Error",
                "location": "updating proposal cache",
                "error": err,
            });
        });
    };
    ;
    return CacheController;
})();
exports.CacheController = CacheController;
//# sourceMappingURL=cacheController.js.map