import chai = require('chai'); var assert = chai.assert;
import path = require('path');
import request = require('supertest');
import express = require('express');

import server = require('../../server');
import testHelper = require('../../test/testHelper');

describe("CacheController", () => {
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

    it("should update the cache on POST /api/data/cache/update", function (done) {
        this.timeout(1000000);

        request(theApp)
            .post('/api/data/cache/update')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {                
                var result = res.body;
                
                // Assert stuff on the result
                //assert.equal(result.status, "Ok", "Result is ok");
            })
            .end(function (err, res) {
                done(err);
            });
    });

    it("should do a full refresh of the cache on POST /api/data/cache/refresh", function (done) {
        this.timeout(1000000);

        request(theApp)
            .post('/api/data/cache/refresh')
            .expect('Content-Type', /json/)
            .expect(function (res) { testHelper.checkStatusCode(res, 200); })
            .expect(function (res) {
                var result = res.body;
                
                // Assert stuff on the result
                //assert.equal(result.status, "Ok", "Result is ok");
            })
            .end(function (err, res) {
                done(err);
            });
    });
});
