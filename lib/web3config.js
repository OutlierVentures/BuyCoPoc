var web3plus = require('../node_modules/web3plus/lib/web3plus');
var path = require('path');
function createWeb3(jsonRpcUrl) {
    web3plus.initialize(jsonRpcUrl, path.resolve(__dirname + '/../contracts'));
    return web3plus;
}
exports.createWeb3 = createWeb3;
//# sourceMappingURL=web3config.js.map