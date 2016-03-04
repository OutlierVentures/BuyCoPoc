import express = require("express");
import userModel = require('../models/userModel');
import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');
import contractService = require('../services/contractService');
import fs = require('fs');

import web3plus = require('../node_modules/web3plus/lib/web3plus');
import contractInterfaces = require('../contracts/contractInterfaces');
import tools = require('../lib/tools');

import _ = require('underscore');
import Q = require('q');
import { Promise } from 'q';

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

        if (!registryCode || registryCode == "0x") {
            promises.push(this.deployRegistry());
        } else {
            var deferShowRegistry = Q.defer<any>();
            promises.push(deferShowRegistry.promise);

            serviceFactory.getContractService()
                .then(cs => {
                    if (cs.checkContractsVersion())
                        deferShowRegistry.resolve({ "address": this.config.ethereum.contracts.proposalRegistry });
                    else {
                        console.log("Version mismatch. Deploying new registry.");
                        return this.deployRegistry();
                    }
                })
                .then(newRegistryAddress => {
                    if(!deferShowRegistry.promise.isFulfilled())
                        deferShowRegistry.resolve({ "address": newRegistryAddress });
                })
                .catch(err => {
                    // An error occurred, just return it.
                    deferShowRegistry.reject(err);
                });
        }

        Q.all(promises)
            .then(function (results) {
                res.status(200).json({
                    "status": "Ok",
                    "message": "Everything is up to date",
                    "results": results[0],
                });
            })
            .catch(function (err) {
                res.status(500).json(
                    {
                        "status": "Error",
                        "error": err
                    });
            });
    }

    private deployRegistry(): Q.Promise<string> {
        return Promise<string>((resolve, reject) => {

            web3plus.deployContractFromFile("ProposalRegistry.sol", "ProposalRegistry", true, function (deployErr, deployRes) {
                if (deployErr) {
                    reject(deployErr);
                    return;
                }

                // Return the contract address so it can be added to the configuration file.
                // COULD DO: write config file here, or provide result values in a
                // format that can be easily incorporated in the config file.
                // ... or use a/the namereg contract...
                console.log("MigrationController.update", "ProposalRegistry deployed at " + deployRes.address);
                resolve(deployRes.address);
            });
        });
    }

    /**
     * Seed the smart contracts with some test data.
     */
    seedTestData = (req: express.Request, res: express.Response) => {
        // Ensure some proposals

        // Load the registry contract.
        var contractService: contractService.ContractService;
        var proposalContract: contractInterfaces.IProposalContract;

        serviceFactory.getContractService()
            .then(cs=> {
                contractService = cs;

                var deferAddTestData = Q.defer<string>();
                var promises = new Array<Q.Promise<string>>();
                promises.push(deferAddTestData.promise);

                //var proposals = JSON.parse(fs.readFileSync('../client/data/proposals.json', 'utf8'));
                // proposals.forEach(proposal

                contractService.registryContract.addProposal("iPhone 6S", "Electronics", "Mobile phone",
                    15000, "2016-02-01", "2016-04-01", { gas: 2500000 });

                contractService.registryContract.addProposal("OnePlus X", "Electronics", "Mobile phone",
                    10000, "2016-03-10", "2016-05-01", { gas: 2500000 });

                contractService.registryContract.addProposal("Canon EOS 5D Mark III", "Electronics", "Camera",
                    40000, "2016-04-01", "2016-05-01", { gas: 2500000 });

                contractService.registryContract.addProposal("Ethiopia Adado Coop", "Food and drink", "Coffee",
                    4, "2016-03-01", "2016-05-01", { gas: 2500000 });

                return contractService.registryContract.addProposal("FTO Guatemala Huehuetenango", "Food and drink", "Coffee",
                    4, "2016-03-02", "2016-05-02", { gas: 2500000 });
            }, err=> {
                res.status(500).json({
                    "error_location": "loading registry",
                    "error": err,
                });
                return null;
            })
            .then(web3plus.promiseCommital)
            .then(function addBackers(tx) {
                // TODO: get the proposal by... generated ID? Now this always gets the first
                // proposal, even if there are multiple.
                // Use transaction hash.
                var newProposalAddress = contractService.registryContract.proposals(1);

                return contractService.getProposalContractAt(newProposalAddress);
            })
            .then(pc => {
                proposalContract = pc;

                proposalContract.back(15, tools.newGuid(true), { gas: 2500000 });
                proposalContract.back(20, tools.newGuid(true), { gas: 2500000 });
                proposalContract.back(35, tools.newGuid(true), { gas: 2500000 });
                proposalContract.back(45, tools.newGuid(true), { gas: 2500000 });
                return proposalContract.back(55, tools.newGuid(true), { gas: 2500000 });
            })
            .then(web3plus.promiseCommital)
            .then(function finish(tx) {
                res.status(200).json({
                    "status": "Ok",
                    "message": "Test data added",
                    "results": tx,
                });
            }, err => {
                res.status(500).json({
                    "error_location": "adding backers",
                    "error": err,
                });
                return null;
            });
    }

}
