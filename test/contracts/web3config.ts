import w3p = require('../../node_modules/web3plus/lib/web3plus');
import configurationService = require('../../services/configurationService');
import path = require('path');

export function createWeb3() {
    var cs = new configurationService.ConfigurationService();

    // This file gets called from various locations. When running tests from
    // command line using `npm test`, the path is the project root. When
    // running from the Visual Studio test runner, the path is the file
    // path of the test itself. Hence we can't use __dirname to find the config
    // file, and use __filename (the path of this file) to get the the location 
    // of the config file relative to this file.
    cs.basePath = path.resolve(path.dirname(__filename), "../../") + "/";
    var config = cs.getConfiguration();

    var jsonRpcUrl = config.ethereum.jsonRpcUrl;
    w3p.initialize(jsonRpcUrl, cs.basePath + 'contracts');

    return w3p;
}

export var web3plus = w3p;
