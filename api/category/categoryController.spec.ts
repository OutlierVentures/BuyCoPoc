import assert = require('assert');
import path = require('path');
import fs = require('fs');
import request = require('supertest');
import express = require('express');
import Q = require('q');

import web3config = require('../../test/contracts/web3config');
import server = require('../../server');

import proposalModel = require('../../models/proposalModel');
import categoryModel = require('../../models/categoryModel');
import userModel = require('../../models/userModel');
import _ = require('underscore');

var web3plus = web3config.web3plus;
var web3 = web3plus.web3;

describe("CategoryController", () => {
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

    it("should get all the main categories on GET /api/category", function (done) {
        this.timeout(100000);

        request(theApp)
            .get('/api/category')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <categoryModel.IMainCategory[]>res.body;

                assert.ok(list.length > 0, "At least one category");
                var first = list[0];
                assert.ok(first.name, "First category has a name");
                assert.ok(!first.totalProposalCount, "No proposal info");
            })
            .end(function (err, res) {
                done(err);
            });

    });


    it("should get the main category with all the sub categories on GET /api/category/:mainCategory", function (done) {
        this.timeout(100000);

        var mainCat: string;
        request(theApp)
            .get('/api/category')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <categoryModel.IMainCategory[]>res.body;

                assert.ok(list.length > 0, "At least one category");
                var first = list[0];
                assert.ok(first.name, "First category has a name");
                mainCat = first.name;
            })
            .end(function (err, res) {
                request(theApp)
                    .get('/api/category/' + mainCat)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var cat = <categoryModel.IMainCategory>res.body;

                        assert.ok(cat.subCategories.length > 0, "At least one subcategory");
                        var first = cat.subCategories[0];
                        assert.ok(first.name, "First subcategory has a name");
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });
    });


    it("should get the used main categories on GET /api/proposal/category", function (done) {
        this.timeout(100000);

        request(theApp)
            .get('/api/proposal/category')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <categoryModel.IMainCategory[]>res.body;

                assert.ok(list.length > 0, "At least one category");
                var first = list[0];
                assert.ok(first.name, "First category has a name");
                assert.ok(first.totalProposalCount > 0, "First category has at least one proposal");
            })
            .end(function (err, res) {
                done(err);
            });

    });


    it("should get one used used main category with its sub categories on GET /api/proposal/category/:mainCategory", function (done) {
        this.timeout(100000);

        var mainCatName: string;
        request(theApp)
            .get('/api/proposal/category')
            .expect('Content-Type', /json/)
            .expect(200)
            .expect(function (res) {
                var list = <categoryModel.IMainCategory[]>res.body;

                assert.ok(list.length > 0, "At least one category");
                var first = list[0];
                assert.ok(first.name, "First category has a name");
                mainCatName = first.name;
                assert.ok(first.totalProposalCount > 0, "First category has at least one proposal");
            })
            .end(function (err, res)
            {
                request(theApp)
                    .get('/api/proposal/category/' + mainCatName)
                    .expect('Content-Type', /json/)
                    .expect(200)
                    .expect(function (res) {
                        var mainCat = <categoryModel.IMainCategory>res.body;

                        assert.ok(mainCat.subCategories.length > 0, "At least one subcategory");
                        var first = mainCat.subCategories[0];
                        assert.ok(first.name, "First subcategory has a name");
                        assert.ok(first.totalProposalCount > 0, "First category has at least one proposal");
                    })
                    .end(function (err, res) {
                        done(err);
                    });

            });

    });



});
