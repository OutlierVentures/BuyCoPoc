import assert = require('assert');
import path = require('path');
import request = require('supertest');
import express = require('express');

import server = require('../../server');

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
        this.timeout(100000);

        request(theApp)
            .post('/api/data/cache/update')
            .expect('Content-Type', /json/)
            .expect(200)
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
