import upholdService = require('./upholdService');
import stubUpholdService = require('./stubUpholdService');
import configurationService = require('./configurationService');
import contractService = require('./contractService');

import proposalService = require('./proposalService');
import cachedProposalService = require('./cachedProposalService');
import offerService = require('../offers/offerContractService');
import userAccountService = require('../api/user/userAccountService');

import Q = require('q');
import { Promise } from "q";

import configModel = require('../models/configModel');

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