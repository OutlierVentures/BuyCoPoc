import express = require("express");
import userModel = require('../models/userModel');
import configModel = require('../models/configModel');
import serviceFactory = require('../services/serviceFactory');
//import proposalService = require('../services/proposalService');
import web3plus = require('../node_modules/web3plus/lib/web3plus');
import _ = require('underscore');

/**
 * Controller for Circle membership operations.
 */
export class ProposalController {
    constructor() {
    }

    getAll = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        serviceFactory.createProposalService()
            .then(
                function (ps) {
                    return ps.getAll();
                },
                function (initErr) {
                    res.status(500).json({
                        "error": initErr,
                        "error_location": "initializing proposals service"
                    });
                    // How to ensure that the process stops here? Is the next then()
                    // processed in this case?
                    return null;
                })
            .then(
                function (proposals) {
                    res.json(proposals);
                }, function (proposalsErr) {
                    res.status(500).json({
                        "error": proposalsErr,
                        "error_location": "getting proposals"
                    });
                    return null;
                })
    }

}
