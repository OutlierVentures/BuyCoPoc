import express = require('express');

import serviceFactory = require('../../services/serviceFactory');
import web3plus = require('../../node_modules/web3plus/lib/web3plus');
import configurationModel = require('../../models/configModel');
import userModel = require('../../models/userModel');

import {Promise} from 'q';

/**
 * Access information about the smart contracts
 */
export class UserAccountController {
    config: configurationModel.IApplicationConfig;

    registryContract;

    constructor() {
    }   

    getBlockchainAccounts = (req: express.Request, res: express.Response) => {
        var accessToken = req.header("AccessToken");

        var t = this;
        serviceFactory.createUserAccountService()
            .then(uas => {
                uas.getAccounts(accessToken)
                    .then(accounts => {
                        res.json(accounts);
                    }, err => {
                        res.status(500).json({
                            "error": err,
                            "error_location": "getting accounts"
                        });
                    });
            },
            err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "initializing user accounts service"
                });
                return null;
            });
    };

    saveBlockchainAccounts = (req: express.Request, res: express.Response) => {
        var accessToken = req.header("AccessToken");
        var accounts = <userModel.IBlockchainAccountCollection>req.body;

        var t = this;
        serviceFactory.createUserAccountService()
            .then(uas => {
                uas.saveAccounts(accessToken, accounts)
                    .then(user => {
                        res.json(user);
                    }, err => {
                        res.status(500).json({
                            "error": err,
                            "error_location": "saving accounts"
                        });
                    });
            },
            err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "initializing user accounts service"
                });
                return null;
            });
    };
}

