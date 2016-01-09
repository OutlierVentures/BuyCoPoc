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

        // Ensure proposal registry contract
        var registryCode: string;
        try {
            registryCode = web3plus.web3.eth.getCode(this.config.ethereum.contracts.proposalRegistry);
        }
        catch (ex) {
        }

        if (registryCode == "0x") {
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

    /**
     * Seed the smart contracts with some test data.
     */
    seedTestData = (req: express.Request, res: express.Response) => {
        var promises = new Array<Q.Promise<string>>();

        // Ensure some proposals

        // Load the registry contract.
        // TODO: move this to a service as it will be used all over the place.
        var deferLoadRegistry = Q.defer<any>();

        web3plus.loadContractFromFile("ProposalRegistry.sol", "ProposalRegistry", this.config.ethereum.contracts.proposalRegistry,
            true, function (loadErr, loadRes) {
                if (loadErr) {
                    deferLoadRegistry.reject(loadErr);
                    return;
                }

                deferLoadRegistry.resolve(loadRes);
            });

        var registryContract;
        var proposalContract;
        var proposalContractDefinition;

        var deferAddTestData = Q.defer<string>();
        promises.push(deferAddTestData.promise);

        deferLoadRegistry.promise
            .then(function (con) {
                registryContract = con;
                proposalContractDefinition = registryContract.allContractTypes.Proposal.contractDefinition;

                return con.addProposal("Ethiopia Adado Coop", "A very special coffee, per kilogram",
                    10000, "2016-03-01", "2016-05-01", { gas: 2500000 });
            },
            function (regConErr) {
                deferAddTestData.reject(regConErr);
            })
            .then(web3plus.promiseCommital)
            .then(function addBackers(tx) {
                // TODO: get the proposal by... generated ID? Now this always gets the first
                // proposal.
                var newProposalAddress = registryContract.proposals(1);

                proposalContract = proposalContractDefinition.at(newProposalAddress);

                proposalContract.back(15, { gas: 2500000 });
                proposalContract.back(20, { gas: 2500000 });
                proposalContract.back(35, { gas: 2500000 });
                proposalContract.back(45, { gas: 2500000 });
                return proposalContract.back(55, { gas: 2500000 });
            }, function (addBackersError) {
                deferAddTestData.reject(addBackersError);
            })
            .then(web3plus.promiseCommital)
            .then(function finish(tx) {
                deferAddTestData.resolve(tx);
            });

        Q.all(promises)
            .then(function (results) {
                res.status(200).json({
                    "status": "Ok",
                    "message": "Test data added",
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
