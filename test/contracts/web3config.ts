import w3p = require('../../node_modules/web3plus/lib/web3plus');
import path = require('path');

export function createWeb3() {
    // TODO: read from config file.
    var jsonRpcUrl = "http://blockchain:8001";
    w3p.initialize(jsonRpcUrl, path.resolve(__dirname + '/../../contracts'));

    return w3p;
}

export var web3plus = w3p;
