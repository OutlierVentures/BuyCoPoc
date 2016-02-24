import assert = require('assert');
import web3config = require('./web3config');
import fs = require('fs');

import contractInterfaces = require('../../contracts/contractInterfaces');
import contractService = require('../../services/contractService');
import serviceFactory = require('../../services/serviceFactory');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ContractDeployment", () => {    
    var timeBeforeDeployment: number;
    var timeAfterDeployment: number;

    before(function (done) {
        this.timeout(10000);
        web3config.createWeb3();

        done();
    });

    it("should deploy an Offer contract", function (done) {
        this.timeout(60000);


        timeBeforeDeployment = Date.now();

        web3plus.deployContractFromFile("ProposalRegistry.sol",
            "Offer",
            true,
            function (err, res) {
                timeAfterDeployment = Date.now();

                done(err);
            },
            web3plus.web3.eth.coinbase, 1, 1);
    });

    it("should deploy a ProposalRegistry contract", function (done) {
        this.timeout(60000);

        timeBeforeDeployment = Date.now();

        web3plus.deployContractFromFile("ProposalRegistry.sol",
            "ProposalRegistry",
            true,
            function (err, res) {
                timeAfterDeployment = Date.now();

                done(err);
            },
            "Testing proposal registry");
    });


});
