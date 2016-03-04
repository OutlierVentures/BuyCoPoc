import upholdService = require('./upholdService');
import stubUpholdService = require('./stubUpholdService');
import configurationService = require('./configurationService');
import contractService = require('./contractService');
import userModel = require('../models/userModel');

import proposalService = require('./proposalService');
import fulfilmentService = require('./fulfilmentService');
import cachedProposalService = require('./cachedProposalService');
import offerService = require('../api/offer/offerContractService');
import userAccountService = require('../api/user/userAccountService');

import Q = require('q');
import { Promise } from "q";

import configModel = require('../models/configModel');

let userRepo = new userModel.UserRepository();

export interface IUpholdService {
    getCards: (callback: upholdService.IUpholdCardsCallback) => void;
    getUser: (callback: any) => void;
    createCard: (label: string, callback: upholdService.IUpholdCardCallback) => void;
    createTransaction: (
        fromCard: string,
        amount: number,
        currency: string,
        recipient: string,
        callback: upholdService.IUpholdTransactionCallback) => void;

    createAndCommitTransaction: (
        fromCard: string,
        amount: number,
        currency: string,
        recipient: string) => Promise<upholdService.IUpholdTransaction>;

    commitTransaction: (transaction: upholdService.IUpholdTransaction, callback: upholdService.IUpholdTransactionCallback) => void
    getCardTransactions: (cardiId: string, callback: upholdService.IUpholdTransactionsCallback) => void;
}

var config: configModel.IApplicationConfig;

function loadConfiguration() {
    var cs = new configurationService.ConfigurationService();
    config = cs.getConfiguration();
}

export function getConfiguration() {
    if (!config) loadConfiguration();
    return config;
}

export function createUpholdService(token: string): IUpholdService {
    if (config.useStubs) {
        return new stubUpholdService.StubUpholdService(token);
    }
    else {
        return new upholdService.UpholdService(token);
    }
}

/**
 * Create an initialized Uphold service for the vault account.
 */
export function createVaultUpholdService(): Promise<IUpholdService> {
    return Promise<IUpholdService>((resolve, reject) => {
        var c = getConfiguration();

        var vaultUserName = c.useStubs ? "UserstubToken" : c.uphold.vaultAccount.userName;

        // Get the vault user
        userRepo.getUserByExternalId(vaultUserName)
            .then(vu => {
                resolve(createUpholdService(vu.accessToken));
            })
            .catch(err => {
                reject(err);
            });
    });
}

export function createProposalService(): Promise<proposalService.ProposalService> {
    return Promise<proposalService.ProposalService>((resolve, reject) => {
        var ps = new proposalService.ProposalService();

        ps.initialize()
            .then(() => {
                resolve(ps);
            })
            .catch(initializeErr => {
                reject(initializeErr);
            });
    });
}

export function createFulfilmentService(): Promise<fulfilmentService.FulfilmentService> {
    return Promise<fulfilmentService.FulfilmentService>((resolve, reject) => {
        var fuls = new fulfilmentService.FulfilmentService();

        fuls.initialize()
            .then(() => {
                resolve(fuls);
            })
            .catch(initializeErr => {
                reject(initializeErr);
            });
    });
}


// TODO: refactor the similar services to an IService with a .initialize() and 
// introduce a createService< IService > to DRY.

export function createCachedProposalService(): Promise<cachedProposalService.CachedProposalService> {
    return Promise<cachedProposalService.CachedProposalService>((resolve, reject) => {
        var cps = new cachedProposalService.CachedProposalService();

        cps.initialize()
            .then(() => {
                resolve(cps);
            }, initializeErr => {
                reject(initializeErr);
            });
    });
}

var cachedContractService: contractService.ContractService;

export function getContractService(): Promise<contractService.ContractService> {
    return Promise<contractService.ContractService>((resolve, reject) => {
        if (cachedContractService) {
            resolve(cachedContractService);
            return;
        }

        cachedContractService = new contractService.ContractService();

        cachedContractService.initialize(getConfiguration())
            .then(() => {
                resolve(cachedContractService);
            }, initializeErr => {
                reject(initializeErr);
            });
    });
}


export function createUserAccountService(): Promise<userAccountService.UserAccountService> {
    return Promise<userAccountService.UserAccountService>((resolve, reject) => {
        var uas = new userAccountService.UserAccountService();

        uas.initialize()
            .then(() => {
                resolve(uas);
            }, initializeErr => {
                reject(initializeErr);
            });
    });
}



export function createOfferContractService(): Q.Promise<offerService.OfferContractService> {
    var defer = Q.defer<offerService.OfferContractService>();

    var os = new offerService.OfferContractService();

    os.initialize()
        .then(function () {
            defer.resolve(os);
        })
        .catch(function (initializeErr) {
            defer.reject(initializeErr);
        });

    return defer.promise;
}