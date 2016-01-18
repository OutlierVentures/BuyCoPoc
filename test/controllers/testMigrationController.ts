import assert = require('assert');
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');

import web3config = require('../contracts/web3config');
import server = require('../../server');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("MigrationController", () => {
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

    it("should ensure the base contracts are in place on POST /api/migration/update", function (done) {
        this.timeout(100000);

        request(theApp)
            .post('/api/migration/update')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {                
                var result = res.body;
                
                // Assert stuff on the result
                assert.equal(result.status, "Ok", "Result is ok");
            })
            .end(function (err, res) {
                done(err);
            });
    });

    it("should seed test data on POST /api/migration/test/seed", function (done) {
        this.timeout(200000);

        request(theApp)
            .post('/api/migration/test/seed')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var result = res.body;
                
                // Assert stuff on the result
                assert.equal(result.status, "Ok", "Result is ok");
                assert.equal(result.message, "Test data added", "Result message says test data has been added");

                // TODO: assert test data is indeed in place. result.results contains transaction data,
                // which doesn't give enough information for us to examine the test data. We could
                // examine the proposal registry before and after this function to see which
                // test proposals were added.
            })
            .end(function (err, res) {
                done(err);
            });
    });

});
