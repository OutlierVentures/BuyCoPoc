import testHelper = require("../testHelper");
import configurationService = require("../../services/configurationService");
var config = new configurationService.ConfigurationService().getConfiguration();

// Use the MongoDB URL from config, but change the database to prevent clearing for instance the production db when running tests :). 
const dbUri = testHelper.replaceLastUrlPart(config.database.url, "testClearingDB");

var should = require('chai').should(),
    mongoose = require('mongoose'),
    Dummy = mongoose.model('Dummy',
    new mongoose.Schema({ a: Number })),
    clearDb = require('mocha-mongoose')(dbUri);
    
describe("Example spec for a model", () => {
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
                    docs.length.should.equal(2);
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
                    docs.length.should.equal(0);
                    done();
                });
            });
        });
    });
});