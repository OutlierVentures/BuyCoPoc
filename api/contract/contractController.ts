import express = require('express');

import serviceFactory = require('../../services/serviceFactory');
import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import configurationModel = require('../../models/configModel');

import {Promise} from 'q';

/**
 * Access information about the smart contracts
 */
export class ContractController {
    config: configurationModel.IApplicationConfig;

    registryContract;

    constructor() {
    }

    /**
     * Initialize the service by loading the registry contract.
     */
    initialize(): Q.Promise<void> {
        return Promise<void>((resolve, reject) => {

            this.config = serviceFactory.getConfiguration();

            var t = this;
            web3plus.loadContractFromFile('ProposalRegistry.sol',
                'ProposalRegistry', this.config.ethereum.contracts.proposalRegistry, true, function (loadContractError, con) {
                    if (loadContractError) {
                        reject(loadContractError);
                        return;
                    }

                    t.registryContract = con;
                
                    // Even though the defer is of type void, TypeScript wants a parameter passed
                    // to compile.
                    resolve(null);
                });
        });
    }

    ensureInitialized(): Q.Promise<void> {
        return Promise<void>((resolve, reject) => {
            if (this.config)
                resolve(null);
            else {
                resolve(this.initialize());
            }
        });
    }

    getAbi = (req: express.Request, res: express.Response) => {
        var contractName = req.params.contractName;

        var t = this;
        this.ensureInitialized().then(() => {
            var contractDef = t.registryContract.allContractTypes[contractName];

            if (!contractDef) {
                res.status(404);
                return;
            }

            res.json(contractDef.info.abiDefinition);
        });
    };
}

