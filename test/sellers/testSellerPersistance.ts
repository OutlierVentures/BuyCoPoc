var assert = require("assert");
var mongoose = require("mongoose");
var mochaMongoose = require("mocha-mongoose");

import testHelper = require("../testHelper"); 
import userModel = require("../../models/userModel");
import sellerModel = require("../../models/sellerModel");
import configurationService = require("../../services/configurationService");

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
    
    it("should be able to create a user in the database", (done) => {
        userModel.User.create(testUser1, (err: any, result: userModel.IUser) => {
            if (err) { done(err) }
            assert.equal((testUser1).externalId, (result).externalId);
            done();
        });
    });

    it("should be able to create a seller (e.g. upgrade user to 'seller user')", (done) => {
        userModel.User.create(testUser1, (err: any, result: userModel.IUser) => {
            if (err) { done(err) }
        });
        // Sign that user up as a seller.
        sellerModel.Seller.create(testSeller1, (err: any, result: sellerModel.ISeller) => {
            if (err) done(err);
            assert.equal(err, null);
            assert.equal(result.userExternalId, testSeller1.userExternalId);
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

    describe("After creating a seller", () => {
        var existingSeller: sellerModel.ISeller,
            externalId: string;
        
        beforeEach(done => {
            existingSeller = testSeller1;
            externalId = existingSeller.userExternalId;
            sellerModel.create(existingSeller, (err: any, result: sellerModel.ISeller) => {
                console.log(err);
                // console.log(existingSeller);
                if (err) return done(err);
                existingSeller = result;
            });
        });

        it.skip("should be able to retrieve the previously stored seller by externalID", (done) => {
            sellerModel.getSellerByUserExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
                if (err) { done(err) }
                assert.equal((result).userExternalId, externalId);
                assert.equal(err, undefined);
                done();
            });
        });

        it("should return a Not found error and empty result when using non existing externalID", (done) => {
            sellerModel.getSellerByUserExternalId("thisisaninvalidexternalid", (err: any, result: sellerModel.ISeller) => {
                assert.equal(result, null);
                assert.equal(err, new Error("Not found"));
                done();
            });
        });

        it("should be able to update that seller", (done) => {
            var newEmail = "henk@vandentillaert.nl";
            sellerModel.Seller.update({ userExternalId: externalId }, { email: newEmail  }, (err, result: sellerModel.ISeller, nrOfAffected: number) => {
                if (err) done(err);
                assert.equal(result.email, newEmail);
                assert.equal(nrOfAffected, 1);
            });
        });

        it("should be able to remove that seller (e.g. sign off user that was seller back to seller-less status)", (done) => {
            sellerModel.getSellerByUserExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
                if (err) { done(err) }
                done();
            });
            sellerModel.deleteByExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
                if (err) { done(err) }
                assert.equal((result).userExternalId, externalId);
                // Check that seller is indeed removed.
                sellerModel.getSellerByUserExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
                    assert.equal(result, null);
                    assert.equal(err, new Error("Not found"));
                    done();
                });
            });
        });

        it("should clear the DB", (done) => {
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
