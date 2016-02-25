import chai = require('chai'); var assert = chai.assert;
import path = require('path');
import request = require('supertest');
import express = require('express');

import server = require('../../server');

describe("ContractController", () => {
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

    it("should get a contract ABI definition on GET /api/contract/Proposal/abi", function (done) {
        this.timeout(1000000);

        request(theApp)
            .get('/api/contract/Proposal/abi')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var result = res.body;
                
                // Assert stuff on the result
                assert.ok(result.length > 0, "ABI definition has contents");
                assert.ok(result[0].name, "First item in ABI definition has a name");
            })
            .end(function (err, res) {
                done(err);
            });
    });
});
