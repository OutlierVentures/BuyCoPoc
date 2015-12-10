var upholdService = require('./upholdService');
var stubUpholdService = require('./stubUpholdService');
var configurationService = require('./configurationService');
var proposalService = require('./proposalService');
var Q = require('q');
var config = new configurationService.ConfigurationService().getConfiguration();
function createUpholdService(token) {
    if (config.useStubs) {
        return new stubUpholdService.StubUpholdService(token);
    }
    else {
        return new upholdService.UpholdService(token);
    }
}
exports.createUpholdService = createUpholdService;
function createProposalService() {
    var defer = Q.defer();
    var ps = new proposalService.ProposalService();
    ps.initialize()
        .then(function () {
        defer.resolve(ps);
    })
        .catch(function (initializeErr) {
        defer.reject(initializeErr);
    });
    return defer.promise;
}
exports.createProposalService = createProposalService;
//# sourceMappingURL=serviceFactory.js.map