import express = require('express');

import upholdController = require('../controllers/upholdController');
import migrationController = require('../controllers/migrationController');
import proposalController = require('../api/proposal/proposalController');
import categoryController = require('../api/category/categoryController');
import offerController = require('../offers/offerController');
import sellerController = require('../controllers/sellerController');
import configController = require('../controllers/configurationController');
import cacheController = require('../api/data/cacheController');

/**
 * Configure the routes for all API functions on an Express app.
 * @param app
 */
export function configure(app: express.Express) {
    // TODO refactor all '/api/...' calls to a separate ExpressAPIRouter (to reduce git merge issues for instance).
    var apiRouter = express.Router();
    app.use('/api', apiRouter);

    var uc = new upholdController.UpholdController();
    apiRouter.route("/uphold/me/cards").get(uc.getCards);
    apiRouter.route("/uphold/me/cards/withBalance").get(uc.getCardsWithBalance);

    // Categories
    var catCon = new categoryController.CategoryController();
    // All categories (to fill dropdowns etc)
    apiRouter.route("/category").get(catCon.getMainCategories);
    apiRouter.route("/category/:mainCategory").get(catCon.getOneMainCategory);
    // Categories used in proposals (for browsing)
    apiRouter.route("/proposal/category").get(catCon.getUsedMainCategories);
    apiRouter.route("/proposal/category/:mainCategory").get(catCon.getOneUsedMainCategory);

    // Proposals
    var pc = new proposalController.ProposalController();
    apiRouter.route("/proposal").get(pc.getAll);

    apiRouter.route("/proposal/:id").get(pc.getOne);
    apiRouter.route("/proposal/:id/back").post(pc.back);
    apiRouter.route("/proposal/:id/backers").get(pc.getBackers);
    apiRouter.route("/proposal/:id/offers").get(pc.getOffers);
    apiRouter.route("/proposal").post(pc.create);
    // TODO: proposals by sub category
    //apiRouter.route("/category/:mainCategory/:subCategory").get(pc.getByCategory);


    // Offers
    var oc = new offerController.OfferController();
    apiRouter.route("/proposal/:id/offer").post(oc.create);

    // Sellers
    var sc = new sellerController.SellerController();
    apiRouter.route("/seller/:id").get(sc.get);
    apiRouter.route("/seller/:id").post(sc.save);

    // Config
    var cc = new configController.ConfigurationController();
    apiRouter.route("/config/useStubs").get(cc.useStubs);
    apiRouter.route("/config/getversion").get(cc.getVersion);
        
    // Migrations
    var mc = new migrationController.MigrationController();
    apiRouter.route("/migration/update").post(mc.update);
    apiRouter.route("/migration/test/seed").post(mc.seedTestData);

    // Cache
    var cacheCon = new cacheController.CacheController()
    apiRouter.route("/data/cache/update").post(cacheCon.update);

    // Catch non-existing api calls.
    apiRouter.route("*").all(function (req, res) {
        res.status(404).send(`No API method at '${req.url}'`);
    });
}