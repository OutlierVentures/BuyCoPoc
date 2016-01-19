import assert = require("assert");
import mongoose = require("mongoose");
var mochaMongoose = require("mocha-mongoose");
import testHelper = require("../testHelper");
import { IUser, UserRepository } from "../../models/userModel";
import configurationService = require("../../services/configurationService");

var config = new configurationService.ConfigurationService().getConfiguration();
// TODO BW dd. 2015-01-12: Dependency injection? :)
var repo = new UserRepository();

// Use the MongoDB URL from config, but change the database to prevent clearing for instance the production db when running tests :). 
const dbUri = testHelper.replaceLastUrlPart(config.database.url, "testClearingDB");
// Dummy to activate mocha-mongoose (clears database between each unit test).
var clearDb = mochaMongoose(dbUri);

describe("User repository", () => {
    const testUsers = require("../../client/data/users.json");
    const testUser1 = <IUser>testUsers[0].user;
    const testUser2 = <IUser>testUsers[1].user;
    
    before(done => {
        if (mongoose.connection.db) {
            return done();
        }
        mongoose.connect(dbUri, done);
    });
    
    it("should be able to create a user in the database", (done) => {
        repo.create(testUser1)
        .then(
            (result: IUser) => {
            assert.equal((testUser1).externalId, (result).externalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });

    it("should be able to find a user in the database by externalID", (done) => {
        repo.create(testUser1)
        .then(
            (result: IUser) => {
            return repo.getUserByExternalId(result.externalId);
        })
        .then(
            (userResult: IUser) => {
            assert.equal((testUser1).externalId, userResult.externalId);
            done();
        }).catch(
            (err) => {
            done(err);
        });
    });

    it("should be able to find a user in the database by accesstoken", (done) => {
        repo.create(testUser1)
        .then((result: IUser) => {
            return repo.getUserByAccessToken2(result.accessToken);
        }).then((userResult: IUser) => {
            assert.equal((testUser1).externalId, userResult.externalId);
            done();
        }).catch(
        (err) => {
            done(err);
        });
    });

    it("should be able to list multiple users", (done) => {
        // Add 2 users
        repo.create(testUser1)
        .then(() => {
            return repo.create(testUser2);            
        }).then(() => {
            return repo.find({});
        }).then((users: IUser[]) => {
            // Without clearing the DB between specs, this would be 4.
            assert.equal(users.length, 2);
            done();
            return users;
        }).catch((err) => done(err));
    });
});

