/// <reference path="../typings/tsd.d.ts" />

"use strict";
angular.module("buyCoApp").config(AppRoutes);

function AppRoutes($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
    $routeProvider
        .when('/', { controller: CategoryController, controllerAs: "vm", templateUrl: 'js/categories/category-list.html', name: 'mainCategoryList' })
        .when('/proposal/category', { controller: CategoryController, controllerAs: "vm", templateUrl: 'js/categories/category-list.html', name: 'mainCategoryList' })
        .when('/proposal/category/:mainCategory', { controller: CategoryController, controllerAs: "vm", templateUrl: 'js/categories/main-category-details.html', name: 'mainCategory' })
        // TODO: separate template for proposals by category to show category info
        .when('/proposal/category/:mainCategory/:subCategory', { controller: ProposalListController, controllerAs: "vm", templateUrl: 'views/proposal-list.html', name: 'listByCategory' })
        .when('/auth/uphold/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/proposal/new', { controller: ProposalController, templateUrl: 'views/proposal-form.html', name: 'new' })
        .when('/proposal/list', { controller: ProposalListController, templateUrl: 'views/proposal-list.html' })
        .when('/proposal/:id', { controller: ProposalController, templateUrl: 'views/proposal-details.html', name: 'details' })
        .when('/proposal/:id/back', { controller: ProposalController, templateUrl: 'views/proposal-back.html', name: 'back' })
        .when('/proposal/:proposalId/offer/new', { controller: OfferController, controllerAs: "vm", templateUrl: 'js/offers/offer-form.html', name: 'new' })
        .when('/proposal/:proposalId/offer/:offerId', { controller: OfferController, controllerAs: "vm", templateUrl: 'js/offers/offer-details.html', name: 'details' })
        .when('/seller/signup', { controller: SellerSignupController, controllerAs: "vm", templateUrl: 'js/sellers/seller-signup.html' })
        .when('/seller-proposal/list', { controller: SellerProposalListController, controllerAs: "vm", templateUrl: 'js/seller-proposals/seller-proposal-list.html' })
        .otherwise({ templateUrl: 'views/not-found.html' });
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
}