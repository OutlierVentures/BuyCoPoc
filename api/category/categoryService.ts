import proposalModel = require('../../models/proposalModel');
import {IMainCategory, ISubCategory} from '../../models/categoryModel';
import fs = require('fs');
import path = require('path');
import Q = require('q');
import { Promise } from "q";
import _ = require("underscore");

interface IBigNumber {
    toNumber(): number
}

/**
 * Service for dealing with product categories. Uses the cached promise data
 * as well as the category data on disk. All functions return promises.
 */
export class CategoryService {
    categoryData: IMainCategory[];

    constructor() {
    }

    /**
     * Get all main categories.
     */
    getMainCategories(): PromiseLike<IMainCategory[]> {
        return Promise<IMainCategory[]>((resolve, reject) => {
            this.getCategoryData()
                .then(categoryData => {
                    var mainCategories = new Array<IMainCategory>();
                    for (var i = 0; i < categoryData.length; i++) {
                        // Get only the top level data, i.e. strip the sub categories.
                        // We create a deep copy to not influence our source data.                    
                        var cat = categoryData[i];
                        var copy = <IMainCategory>{};
                        for (var p in cat) {
                            if (p == "subCategories")
                                continue;
                            copy[p] = cat[p];
                        }

                        mainCategories.push(copy);
                    }

                    resolve(mainCategories);
                });
        });
    }

    private getCategoryData(): Promise<IMainCategory[]> {
        return Promise<IMainCategory[]>((resolve, reject) => {
            // The category data currently lives in a static JSON file on disk.
            // As it doesn't change during runs, we don't have to invalidate the cached data.
            if (this.categoryData)
                resolve(this.categoryData);
            else
                this.readCategoryData().then(data=> {
                    this.categoryData = data;
                    resolve(data);
                });
        });
    }

    /**
     * Read the category data including image URLs from the JSON file on disk.
     */
    private readCategoryData(): Promise<IMainCategory[]> {
        return Promise<IMainCategory[]>((resolve, reject) => {
            fs.readFile("./data/data.json", 'utf8', (err, categoryDataString) => {
                if (err) reject(err);

                // Prepare and parse the JSON data
                categoryDataString = categoryDataString.replace(/^\uFEFF/, '');
                var categoryData = <IMainCategory[]>JSON.parse(categoryDataString);

                resolve(this.enhanceCategoryData(categoryData));
            });
        });
    }

    /**
     * Enhance category data with imageUrls where available.
     * @param categoryData
     */
    private enhanceCategoryData(categoryData: IMainCategory[]): Promise<IMainCategory[]> {
        var mainCatPromises = new Array<Promise<IMainCategory>>();

        // Process each main category
        for (var i = 0; i < categoryData.length; i++) {
            var cat = categoryData[i];

            mainCatPromises.push(this.enhanceOneMainCategory(cat));
        }

        return Q.all(mainCatPromises);
    }

    private enhanceOneMainCategory(mainCat: IMainCategory): Promise<IMainCategory> {
        return Promise<IMainCategory>((catResolve, catReject) => {
            // Check whether there's an image file for this main category.
            // COULD DO: allow .png as well.
            var imageUrl = mainCat.name + "/main.jpg";
            var fullPath = path.resolve(path.dirname(__filename), "data/" + imageUrl)
            fs.access(fullPath,
                (err) => {
                    if (!err) {
                        mainCat.imageUrl = "category/" + imageUrl;
                    } else {
                        // No image. imageUrl stays empty. Generic placeholder 
                        // (or empty) should be solved client side.
                    }

                    // COULD DO: flatten this method by taking the code below and adding it
                    // in a then().

                    if (!mainCat.subCategories)
                        catResolve(mainCat);
                    else {
                        this.enhanceSubCategoryData(mainCat, mainCat.subCategories)
                            .then(enhancedSubCategories => {
                                mainCat.subCategories = enhancedSubCategories;
                                catResolve(mainCat)
                            });
                    }
                });
        });
    }

    private enhanceSubCategoryData(mainCategory: IMainCategory, subCategoryData: ISubCategory[]): Promise<ISubCategory[]> {
        var subCatPromises = new Array<Promise<ISubCategory>>();

        // Process each subcategory
        for (var i = 0; i < subCategoryData.length; i++) {
            subCatPromises.push(this.enhanceOneSubCategory(mainCategory, subCategoryData[i]));
        }

        return Q.all(subCatPromises);
    }

    private enhanceOneSubCategory(mainCat: IMainCategory, subCat: ISubCategory): Promise<ISubCategory> {
        return Promise<ISubCategory>((catResolve, catReject) => {
            // Check whether there's an image file for this main category.
            // COULD DO: allow .png as well.
            var imageUrl = mainCat.name + "/" + subCat.name + "/main.jpg";
            var fullPath = path.resolve(path.dirname(__filename), "data/" + imageUrl)
            fs.access(fullPath,
                (err) => {
                    if (!err) {
                        subCat.imageUrl = "category/" + imageUrl;
                    } else {
                        // No image. imageUrl stays empty. Generic placeholder 
                        // (or empty) should be solved client side.
                    }
                    catResolve(subCat);
                });
        })
    }

    /**
     * Get a main category with all its subcategories.
     */
    getOneMainCategory(mainCategoryName: string): PromiseLike<IMainCategory> {
        return Promise<IMainCategory>((resolve, reject) => {
            this.getCategoryData()
                .then(categoryData => {
                    var mainCat = _(categoryData).find((cat) => { return cat.name == mainCategoryName });
                    if (mainCat)
                        resolve(mainCat);
                    else
                        reject("Not found");
                },
                err => {
                    reject(err);
                });
        });
    }

    /**
     * Get the main categories used for proposals with the total proposal count.
     */
    getUsedMainCategories(name?: string): PromiseLike<IMainCategory[]> {
        var match;
        if (name) match = { $match: { "mainCategory": name } };
        else match = { $match: {} }

        return proposalModel.Proposal.aggregate(
            match,
            {
                $group: {
                    // A group specification MUST contain an _id. So just include the category name twice.
                    _id: '$mainCategory',
                    // To include the actual value we use $last for the value of that field in the "last" record.
                    name: { $last: '$mainCategory' },
                    totalProposalCount: { $sum: 1 }
                }
            })
            .exec()
            .then(mainCategories=> {
                // The type of the result is incorrectly inferred as IProposalDocument[], while it is actually
                // an array of custom JS objects generated by the aggregate(). We cast it to IMainCategory[]
                // as we have included all its required properties and we want to keep this method type safe 
                // to call.

                // Enhance the data with image URLs
                return this.enhanceCategoryData(<IMainCategory[]><any>mainCategories);
            });
    }

    /**
     * Get the sub categories of a main category used for proposals with the total proposal count.
     */
    getOneUsedMainCategory(mainCategoryName: string): PromiseLike<IMainCategory> {
        var mainCat: IMainCategory;
        // TODO: move out to function, then get one main category here
        return this.getUsedMainCategories(mainCategoryName)
            .then(mainCategories => {
                mainCat = mainCategories[0];
                return proposalModel.Proposal.aggregate(
                    {
                        $match: {
                            mainCategory: mainCategoryName
                        }
                    },
                    {
                        $group: {
                            // A group specification MUST contain an _id. So just include the category name twice.
                            _id: '$subCategory',
                            // To include the actual value we use $last for the value of that field in the "last" record.
                            name: { $last: '$subCategory' },
                            totalProposalCount: { $sum: 1 }
                        }
                    })
                    .exec();
            })
            .then(subCategories => {
                // The type of the result is incorrectly inferred as IProposalDocument[], while it is actually
                // an array of custom JS objects generated by the aggregate(). We cast it to ISubCategory[]
                // as we have included all its required properties and we want to keep this method type safe 
                // to call.

                // Enhance the data with image URLs
                return this.enhanceSubCategoryData(mainCat, <ISubCategory[]><any>subCategories);
            }).then(enhancedSubCategories => {
                mainCat.subCategories = enhancedSubCategories;
                return mainCat;
            });
    }
}