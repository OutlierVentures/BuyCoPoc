var assert = require("assert");
var mongoose = require("mongoose");
var mochaMongoose = require("mocha-mongoose");
import path = require('path');

import testHelper = require("../testHelper"); 
import { IUser, UserRepository }  from "../../models/userModel";
import { ISeller, SellerRepository } from "../../models/sellerModel";
import configurationService = require("../../services/configurationService");

var userRepo = new UserRepository();
var sellerRepo = new SellerRepository();

var clearDb;
var dbUri: string;

describe("Seller repository", () => {
    const testUsers = require("../../client/data/users.json");
    const testSellers = require("../../client/data/sellers.json");
    const testUser1 = <IUser>testUsers[0].user;
    const testUser2 = <IUser>testUsers[1].user;
    const testSeller1 = <ISeller>testSellers[0];
    const testSeller2 = <ISeller>testSellers[1];
    
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
    
    it("should be able to create a seller (e.g. upgrade user to 'seller user')", (done) => {
        userRepo.create(testUser1)
        // Sign that user up as a seller.
        .then(() => {
            return sellerRepo.create(testSeller1);
        })
        .then((seller: ISeller) => {
            assert.equal(seller.userExternalId, testSeller1.userExternalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });
    
    it("should be able to find a seller by externalId", (done) => {
        // Create a user.
        userRepo.create(testUser1)
        // Sign that user up as a seller.
        .then(() => {
            return sellerRepo.create(testSeller1);
        })
        .then(() => {
            return sellerRepo.getSellerByUserExternalId(testSeller1.userExternalId);
        }).then((resultSeller: ISeller) => {
            assert.equal(resultSeller.userExternalId, testSeller1.userExternalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });

    it("should return not found when searching on invalid externalId", (done) => {
        // Create a user.
        userRepo.create(testUser1)
            // Sign that user up as a seller.
            .then(() => {
                return sellerRepo.create(testSeller1);
            })
            .then(() => {
                return sellerRepo.getSellerByUserExternalId("thisisaninvalidexternalid");
            }).then((resultSeller: ISeller) => {
                assert.equal(resultSeller, null);
                done();
            }).catch((err: any) => {
                done(err);
            });
    });

    it("should be able to list multiple sellers", (done) => {
        // Add a user
        userRepo.create(testUser1)
            // Add another user
            .then(() => {
                return userRepo.create(testUser2);
                // Sign users up as seller.
            }).then(() => {
                return sellerRepo.create(testSeller1);
            }).then(() => {
                return sellerRepo.create(testSeller2);
            }).then(() => {
                return sellerRepo.find({});
            }).then((sellers: ISeller[]) => {
                // Without clearing the DB between specs, this would be 3.
                assert.equal(sellers.length, 2);
                done();
            }).catch((err: any) => done(err));
    });

    it("should be able to update that seller", (done) => {
        var newEmail = "henk@vandentillaert.nl";
        return sellerRepo.create(testSeller1)
        .then((resultSeller: ISeller) => {
            resultSeller.email = newEmail;
            return sellerRepo.update(resultSeller);
        }).then(() => {
            return sellerRepo.getSellerByUserExternalId(testSeller1.userExternalId);
        }).then((seller: ISeller) => {
            assert.equal(seller.email, newEmail);
            done();
        }).catch((err: any) => done(err));
    });

    it("should be able to remove that seller (e.g. sign off user that was seller back to seller-less status)", (done) => {
        userRepo.create(testUser1)
        .then(() => {
            return sellerRepo.create(testSeller1);
        }).then((seller: ISeller) => {
            return sellerRepo.getSellerByUserExternalId(testUser1.externalId)
        }).then((seller: ISeller) => {
            // Now it's there.
            assert.equal(seller.userExternalId, testUser1.externalId);
            return sellerRepo.deleteByExternalId(seller.userExternalId);
        }).then((result: ISeller) => {
            assert.equal((result).userExternalId, testUser1.externalId);
            return sellerRepo.getSellerByUserExternalId(testUser1.externalId);
        }).then((result: ISeller) => {
            // Now it's not.
            assert.equal(result, null);
            done();
        }).catch((err: any) => done(err));
    })
});
