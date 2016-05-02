import assert = require("assert");
import mongoose = require("mongoose");
import path = require('path');
import testHelper = require("../testHelper");
var mochaMongoose = require("mocha-mongoose");
import configurationService = require("../../services/configurationService");

var Dummy = mongoose.model('Dummy', new mongoose.Schema({ a: Number }));

var clearDb;
var dbUri: string;

describe("Example spec for a model", () => {
    before(done => {
        
        // Load configuration and initiate database connection
        var cs = new configurationService.ConfigurationService();
        cs.basePath = path.resolve(path.dirname(__filename), "../../") + "/";
        var config = cs.getConfiguration();
        // Use the MongoDB URL from config, but change the database to prevent clearing for instance the production db when running tests :). 
        dbUri = testHelper.replaceLastUrlPart(config.database.url, "testClearingDB");
        clearDb = mochaMongoose(dbUri);
        done();
    });

    beforeEach(done => {
        if (mongoose.connection.db) {
            return done();
        }
        mongoose.connect(dbUri, done);
    });

    it("can be saved", done => {
        new Dummy({ a: 1 }).save(done);
    });
    it("can be listed", function (done) {
        new Dummy({ a: 1 }).save((err, model) => {
            if (err)
                return done(err);
            new Dummy({ a: 2 }).save(function (err, model) {
                if (err)
                    return done(err);
                Dummy.find({}, function (err, docs) {
                    if (err)
                        return done(err);
                    assert.equal(docs.length, 2);
                    done();
                });
            });
        });
    });
    it("can clear the DB on demand", done => {
        new Dummy({ a: 5 }).save((err, model) => {
            if (err)
                return done(err);
            clearDb(err => {
                if (err)
                    return done(err);
                Dummy.find({}, (err, docs) => {
                    if (err)
                        return done(err);
                    assert.equal(docs.length, 0);
                    done();
                });
            });
        });
    });
});