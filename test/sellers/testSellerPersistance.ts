var assert = require("assert");
var chai = require("chai");
var mongoose = require("mongoose");
var mochaMongoose = require("mocha-mongoose");

import testHelper = require("../testHelper"); 
import userModel = require("../../models/userModel");
import sellerModel = require("../../models/sellerModel");
import configurationService = require("../../services/configurationService");

var should = chai.should();
var config = new configurationService.ConfigurationService().getConfiguration();

// Use the MongoDB URL from config, but change the database to prevent clearing for instance the production db when running tests :). 
const dbUri = testHelper.replaceLastUrlPart(config.database.url, "testClearingDB");

var clearDb = mochaMongoose(dbUri);

describe("Seller persistance", () => {    
    const testUsers = require("../../client/data/users.json");
    const testSellers = require("../../client/data/sellers.json");
    const testUser1 = <userModel.IUser>testUsers[0].user;
    const testUser2 = <userModel.IUser>testUsers[1].user;
    const testSeller1 = <sellerModel.ISeller>testSellers[0];
    const testSeller2 = <sellerModel.ISeller>testSellers[1];
    
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
    // TODO For some reason I don't see this user in the database, while the test does succeed.
    it("should be able to create a user in the database", (done) => {
        // console.log(testUser);
        userModel.User.create(testUser1, function (err: any, result: any) {
            if (err) { done(err) }
            assert.equal((<userModel.IUser>testUser1).externalId, (<userModel.IUser>result).externalId);
            console.log(`Saved user to ${dbUri}`);
            done();
        });
    });
    it("should be able to create a seller (e.g. upgrade a plain user to a 'seller user')", (done) => {
        // Get test user data (shared with front-end).
        const users = require("../../client/data/users.json");
        const user  = <userModel.IUser> users[0].user;
        // TODO get from sellers.json
        var seller: sellerModel.SellerModel = {
            "userExternalId": user.externalId,
            "isActive": true,
            "email": user.email,
            "dateCreated": new Date("2015-01-06T09:34:00+00:00"),
            "dateUpdated": new Date("2015-01-06T09:34:30+00:00"),
            "company": "IT Off the Wall",
            "addressLine1": "Nepveulaan 18",
            "addressline2": "",
            "postalCode": "3705LD",
            "city": "Zeist",
            "country": "The Netherlands",
            "telephone": "+31646102065",
            "region": "Utrecht"
        };
        // Sign that user up as a seller.
        sellerModel.Seller.create(testSeller1, (err: any, result: any) => {
            assert.equal(err, null);
            assert.equal((<sellerModel.ISeller>result).userExternalId, seller.userExternalId);
            done();
        });
    });
    it("should be able to list multiple sellers", (done) => {
        // Add another user
        userModel.User.create(testUser1, (err: any) => {
            if (err) { done(err) }
        });
        userModel.User.create(testUser2, (err: any) => {
            if (err) { done(err) }
        });
        // And also sign that user up as seller.
        sellerModel.Seller.create(testSeller1, (err: any) => {
            if (err) { done(err) }
        });
        sellerModel.Seller.create(testSeller2, (err: any) => {
            if (err) { done(err) }
        });
        
        sellerModel.Seller.find({}, (err, sellers) => {
            if (err) return done(err);
            // Without clearing the DB between specs, this would be 3.
            assert.equal(sellers.length, 2);
            done();
        });
    });
    it("should be able to retrieve that seller by externalID", (done) => {
        sellerModel.getSellerByUserExternalId(testSeller2.userExternalId, (err: any, result: sellerModel.ISeller) => {
            if (err) { done(err) }
            const externalId = testSeller2.userExternalId;
            assert.equal((result).userExternalId, externalId);
            done();
        });
    });
    it("should return Not found error and empty result for non existing externalID");
    sellerModel.getSellerByUserExternalId(testSeller2.userExternalId, (err: any, result: sellerModel.ISeller) => {
        if (err) { done(err) }
        const externalId = testSeller2.userExternalId;
        assert.equal((result).userExternalId, externalId);
        done();
    });
    it("should be able to update that seller");
    it("should be able to remove a seller (e.g. sign off user that was seller back to seller-less status)", (done) => {
        sellerModel.Seller.findOneAndRemove(testSeller2, (err: any, result: sellerModel.ISeller) => {
            if (err) { done(err) }
            const externalId = testSeller2.userExternalId;
            assert.equal((result).userExternalId, externalId);
            done();
        });
    });
    it("can clear the DB on demand", (done) => {
        // And also sign that user up as seller.
        sellerModel.Seller.create(testSeller1, (err: any) => {
            if (err) { done(err) }
        });
        sellerModel.Seller.create(testSeller2, (err: any) => {
            if (err) { done(err) }
        });
        clearDb((err) => {
            if (err) return done(err);
            sellerModel.Seller.find({}, (err, sellers) => {
                    if (err) return done(err);
                    assert.equal(sellers.length, 0);
                    done();
                });
            });
        });
    });
});
