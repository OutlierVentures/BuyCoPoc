import assert = require("assert");
import mongoose = require("mongoose");
var mochaMongoose = require("mocha-mongoose");

import testHelper = require("../testHelper"); 
import userModel = require("../../models/userModel");
import configurationService = require("../../services/configurationService");

var config = new configurationService.ConfigurationService().getConfiguration();

// Use the MongoDB URL from config, but change the database to prevent clearing for instance the production db when running tests :). 
const dbUri = testHelper.replaceLastUrlPart(config.database.url, "testClearingDB");
// Dummy to activate mocha-mongoose (clears database between each unit test).
var clearDb = mochaMongoose(dbUri);

describe("User persistance", () => {
    const testUsers = require("../../client/data/users.json");
    const testUser1 = <userModel.IUser>testUsers[0].user;
    const testUser2 = <userModel.IUser>testUsers[1].user;
    
    before(done => {
        if (mongoose.connection.db) {
            return done();
        }
        mongoose.connect(dbUri, done);
    });

    it("should have at least one unit test :)", done => {
        assert.equal(1, 1);
        done();
    });
    
    it("should be able to create a user in the database", (done) => {
        userModel.create(testUser1)
        .then(
            (result: userModel.IUser) => {
            assert.equal((testUser1).externalId, (result).externalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });

    it("should be able to find a user in the database", (done) => {
        userModel.create(testUser1)
        .then(
            (result: userModel.IUser) => {
            return userModel.getUserByExternalId(result.externalId);
        })
        .then(
            (userResult: userModel.IUser) => {
            assert.equal((testUser1).externalId, userResult.externalId);
            done();
        }).catch(
            (err) => {
            done(err);
        });
    });
    
    it("should be able to list multiple users", (done) => {
        // Add 2 users
        userModel
            .create(testUser1)
        .then(() => {
            return userModel.create(testUser2);            
        }).then(() => {
            return userModel.find({});
        }).then((users: userModel.IUser[]) => {
            // Without clearing the DB between specs, this would be 4.
            assert.equal(users.length, 2);
            done();
            return users;
        }).catch((err) => done(err));
    });
});

