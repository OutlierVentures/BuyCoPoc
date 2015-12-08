import web3plus = require('../node_modules/web3plus/lib/web3plus');
import path = require('path');

export function createWeb3(jsonRpcUrl: string) {
    web3plus.initialize(jsonRpcUrl, path.resolve(__dirname + '/../contracts'));

    return web3plus;
}
