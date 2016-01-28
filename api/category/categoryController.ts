import express = require("express");
import { UserRepository } from "../../models/userModel";

import configModel = require('../../models/configModel');
import categoryService = require('./categoryService');

import proposalModel = require('../../models/proposalModel');

import _ = require('underscore');

var userRepo = new UserRepository();

/**
 * Controller for BuyCo categories.
 */
export class CategoryController {
    categoryService = new categoryService.CategoryService()

    constructor() {
    }

    getMainCategories = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        this.categoryService.getMainCategories()
            .then(categories => {
                res.json(categories);
            }, err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "getting main categories"
                });
                return null;
            })
    }

    getOneMainCategory = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");
        var mainCategoryName = req.params.mainCategory;

        this.categoryService.getOneMainCategory(mainCategoryName)
            .then(subCategories => {
                res.json(subCategories);
            }, err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "getting subcategories"
                });
                return null;
            })
    }

    getUsedMainCategories = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");

        this.categoryService.getUsedMainCategories()
            .then(categories => {
                res.json(categories);
            }, err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "getting main categories"
                });
                return null;
            })
    }

    getOneUsedMainCategory = (req: express.Request, res: express.Response) => {
        //var token = req.header("AccessToken");
        var mainCategory = req.params.mainCategory;

        this.categoryService.getOneUsedMainCategory(mainCategory)
            .then(subCategories => {
                res.json(subCategories);
            }, err => {
                res.status(500).json({
                    "error": err,
                    "error_location": "getting subcategories"
                });
                return null;
            })
    }
}
