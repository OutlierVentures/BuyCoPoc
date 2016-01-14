/// <reference path="../typings/tsd.d.ts" />

"use strict";
angular.module("buyCoApp").config(AppRoutes);

function AppRoutes($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
    $routeProvider
        .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
        .when('/auth/uphold/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/not-found', { templateUrl: 'views/not-found.html' })
        .when('/proposal/:id', { controller: ProposalController, templateUrl: 'views/proposal-details.html', name: 'details' })
        .when('/proposal/:id/back', { controller: ProposalController, templateUrl: 'views/proposal-back.html', name: 'back' })
        .when('/seller/signup', { controller: SellerSignupController, templateUrl: 'views/seller-signup.html' })
        .when('/seller/list', { controller: SellerListController, templateUrl: 'views/seller-list.html' })
        .otherwise({ redirectTo: 'not-found' });
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
}