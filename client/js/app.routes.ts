/// <reference path="../typings/tsd.d.ts" />

"use strict";
angular.module("buyCoApp").config(AppRoutes);

function AppRoutes($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
    $routeProvider
        .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
        .when('/auth/uphold/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/proposal/new', { controller: ProposalController, templateUrl: 'views/proposal-form.html' })
        .when('/proposal/list', { controller: ProposalListController, templateUrl: 'views/proposal-list.html' })
        .when('/proposal/:id', { controller: ProposalController, templateUrl: 'views/proposal-details.html', name: 'details' })
        .when('/proposal/:id/back', { controller: ProposalController, templateUrl: 'views/proposal-back.html', name: 'back' })
        .when('/seller/signup', { controller: SellerSignupController, templateUrl: 'js/sellers/signup.html' })
        .otherwise({ templateUrl: 'views/not-found.html' });
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix('!');
}