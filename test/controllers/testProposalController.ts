import assert = require('assert');
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');

import web3config = require('../contracts/web3config');
import server = require('../../server');

import proposalModel = require('../../models/proposalModel');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("ProposalController", () => {
    var theServer: server.Server;
    var theApp: express.Express;

    before(function (done) {
        this.timeout(10000);
        theServer = new server.Server();
        theServer.basePath = path.resolve(path.dirname(__filename), "../../") + "/";
        theApp = theServer.createApp();

        done();
    });

    it("should return a list of proposals on GET /api/proposal", function (done) {
        this.timeout(10000);

        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            //.expect('Content-Length', '20')
            .expect(200)
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                
                // Assert stuff on the result
                assert.ok(list.length > 0, "More than one result");
                assert.ok(list[0].productName.length > 0, "First product has a name");
            })
            .end(function (err, res) {
                done(err);
            });
    });

    it("should create a proposal on POST /api/proposal", function (done) {
        this.timeout(200000);

        request(theApp)
            .post('/api/proposal')
            .send({ "productName": "A testing product", "productDescription": "From the unit tests" })
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var newProposal = <proposalModel.IProposal>res.body;
                
                // Assert stuff on the result
                assert.notEqual(newProposal.id, "0x", "New proposal has an ID");
                assert.equal(newProposal.endDate, "", "New proposal has an empty string as end date");
            })
            .end(function (err, res) {
                done(err);
            });
    });

});
