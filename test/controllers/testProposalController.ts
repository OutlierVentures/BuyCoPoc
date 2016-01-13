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

    after(function (done) {
        theServer.stop();
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

    it("should return a proposal on GET /api/proposal/:id", function (done) {
        this.timeout(100000);

        var proposalId: string;
        var productName: string;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposalId = list[0].id;
                productName = list[0].productName;
            })
            .end(function (err, res) {

                request(theApp)
                    .get('/api/proposal/' + proposalId)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var proposal = <proposalModel.IProposal>res.body;
                
                        // Assert stuff on the result
                        assert.equal(proposal.id, proposalId, "Returned proposal has correct ID");
                        assert.equal(proposal.productName, productName, "Returned product has correct name");
                    })
                    .end(function (err, res) {
                        done(err);
                    });

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

    it("should back a proposal on POST /api/proposal/:id/back", function (done) {
        this.timeout(100000);

        var proposal: proposalModel.IProposal;

        // Get the proposal list to obtain a valid ID
        request(theApp)
            .get('/api/proposal')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <Array<proposalModel.IProposal>>res.body;
                proposal = list[0];
            })
            .end(function (err, res) {

                request(theApp)
                    .post('/api/proposal/' + proposal.id + '/back')
                    .send({
                        proposal: proposal,
                        amount: 31
                    })
                    //.expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        //var proposal = <proposalModel.IProposal>res.body;
                
                        // TODO: Check whether the result has been achieved. The result itself
                        // doesn't contain any data. However we can call /api/proposal/:id/backers to
                        // see if our backing was registered.


                        //assert.equal(proposal.id, proposalId, "Returned proposal has correct ID");
                        //assert.equal(proposal.productName, productName, "Returned product has correct name");
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });

    });

});
