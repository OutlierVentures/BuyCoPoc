var upholdService = require('./upholdService');
var stubUpholdService = require('./stubUpholdService');
var configurationService = require('./configurationService');
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
//# sourceMappingURL=serviceFactory.js.map