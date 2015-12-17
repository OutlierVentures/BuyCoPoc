import express = require("express");
import userModel = require('../models/userModel');
import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');
import Q = require('q');

/**
 * Controller for migration between versions.
 */
export class MigrationController {
    config: configModel.IApplicationConfig;

    constructor() {
        this.config = serviceFactory.getConfiguration();
    }

    update = (req: express.Request, res: express.Response) => {
        var promises = new Array<Q.Promise<string>>();

        console.log("MigrationController.config", this.config);

        // Ensure proposal registry contract
        var registryCode: string;
        try {
            registryCode = web3plus.web3.eth.getCode(this.config.ethereum.contracts.proposalRegistry);
        }
        catch (ex) {
        }

        if (!registryCode) {
            var deferDeployRegistry = Q.defer<any>();

            web3plus.deployContractFromFile("ProposalRegistry.sol", "ProposalRegistry", true, function (deployErr, deployRes) {
                if (deployErr) {
                    deferDeployRegistry.reject(deployErr);
                    return;
                }

                // Return the contract address so it can be added to the configuration file.
                // COULD DO: write config file here, or provide result values in a
                // format that can be easily incorporated in the config file.
                // ... or use a/the namereg contract...
                deferDeployRegistry.resolve({ "registryContractAddress": deployRes });
            });

            promises.push(deferDeployRegistry.promise);
        }


        Q.all(promises)
            .then(function (results) {
                res.status(200).json({
                    "status": "Ok",
                    "message": "Everything is up to date",
                    "results": results,
                });
            })
            .catch(function (err) {
                res.status(500).json(
                    {
                        "status": "Error",
                        "error": err,
                    });
            });
    }

}
