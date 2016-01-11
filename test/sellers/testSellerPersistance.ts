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
    
    it("should be able to create a seller (e.g. upgrade user to 'seller user')", (done) => {
        userModel.create(testUser1)
        // Sign that user up as a seller.
        .then(
            () => {
            return sellerModel.Seller.create(testSeller1)
        })
        .then(
            (seller: sellerModel.ISeller) => {
            assert.equal(seller.userExternalId, testSeller1.userExternalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });
    
    it("should be able to find a seller by externalId", (done) => {
        // Create a user.
        userModel.create(testUser1)
        // Sign that user up as a seller.
        .then(() => {
            return sellerModel.create(testSeller1);
        })
        .then(() => {
            return sellerModel.getSellerByUserExternalId(testSeller1.userExternalId);
        }).then((resultSeller: sellerModel.ISeller) => {
            assert.equal(resultSeller.userExternalId, testSeller1.userExternalId);
            done();
        }).catch((err: any) => {
            done(err);
        });
    });

    it("should return not found when searching on invalid externalId", (done) => {
        // Create a user.
        userModel.create(testUser1)
            // Sign that user up as a seller.
            .then(() => {
                return sellerModel.create(testSeller1);
            })
            .then(() => {
                return sellerModel.getSellerByUserExternalId("thisisaninvalidexternalid");
            }).then((resultSeller: sellerModel.ISeller) => {
                assert.equal(resultSeller, null);
                done();
            }).catch((err: any) => {
                done(err);
            });
    });

    it("should be able to list multiple sellers", (done) => {
        // Add a user
        userModel.create(testUser1)
            // Add another user
            .then(() => {
                return userModel.create(testUser2);
                // Sign users up as seller.
            }).then(() => {
                return sellerModel.create(testSeller1);
            }).then(() => {
                return sellerModel.create(testSeller2);
            }).then(() => {
                return sellerModel.find({});
            }).then((sellers: sellerModel.ISeller[]) => {
                // Without clearing the DB between specs, this would be 3.
                assert.equal(sellers.length, 2);
                done();
            }).catch((err: any) => done(err));
    });

    it("should be able to update that seller", (done) => {
        var newEmail = "henk@vandentillaert.nl";
        return sellerModel.create(testSeller1)
        .then((resultSeller: sellerModel.ISeller) => {
            testSeller1.email = newEmail;
            return sellerModel.update(resultSeller);
        }).then((resultSeller: sellerModel.ISeller) => {
            console.log(testSeller1.userExternalId);
            assert.equal(resultSeller.email, newEmail);
            return sellerModel.getSellerByUserExternalId(testSeller1.userExternalId);
        }).then((seller: sellerModel.ISeller) => {
            console.log("3..");
            console.log(seller.email);
            console.log(newEmail);
            assert.equal(seller.email, newEmail);
            console.log("4..");
            done();
        });
    });

//         it("should be able to remove that seller (e.g. sign off user that was seller back to seller-less status)", (done) => {
//             sellerModel.getSellerByUserExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
//                 if (err) { done(err) }
//                 done();
//             });
//             sellerModel.deleteByExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
//                 if (err) { done(err) }
//                 assert.equal((result).userExternalId, externalId);
//                 // Check that seller is indeed removed.
//                 sellerModel.getSellerByUserExternalId(externalId, (err: any, result: sellerModel.ISeller) => {
//                     assert.equal(result, null);
//                     assert.equal(err, new Error("Not found"));
//                     done();
//                 });
//             });
        // });

});
