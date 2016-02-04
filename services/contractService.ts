import configModel = require('../models/configModel');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import contractInterfaces = require('../contracts/contractInterfaces');

import Q = require('q');
import { Promise } from "q";


export class ContractService {
    config: configModel.IApplicationConfig;

    registryContract: contractInterfaces.IProposalRegistryContract;
    proposalContractDefinition;

    initialize(c: configModel.IApplicationConfig): Promise<boolean>{
        this.config = c;
        var t = this;
        return Promise<boolean>((resolve, reject) => {
            web3plus.loadContractFromFile('ProposalRegistry.sol',
                'ProposalRegistry', t.config.ethereum.contracts.proposalRegistry, true, function (loadContractError, con) {
                    if (loadContractError) {
                        reject(loadContractError);
                        return;
                    }
                    t.registryContract = con;
                    t.proposalContractDefinition = t.registryContract.allContractTypes.Proposal.contractDefinition;
                
                    resolve(true);
                });
        });
    }

    getProposalContractAt(address: string): Promise<contractInterfaces.IProposalContract> {
        return this.getContractAt<contractInterfaces.IProposalContract>(address, "Proposal");
    }

    getOfferContractAt(address: string): Promise<contractInterfaces.IOfferContract> {
        return this.getContractAt<contractInterfaces.IOfferContract>(address, "Offer");
    }

    private getContractAt<T>(address: string, contractType: string): Promise<T> {
        var t = this;
        return Promise<T>((resolve, reject) => {
            // We do a sync call because the async version of .at() which
            // takes a callback doesn't work with our web3plus enhancements
            // (e.g. promiseified contract methods).
            // TODO: make async version work with web3plus enhancements
            var con = <T>t.registryContract.allContractTypes[contractType].contractDefinition.at(address);
            resolve(con);
        });
    }

}