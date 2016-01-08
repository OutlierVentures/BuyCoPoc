/// <reference path="../typings/tsd.d.ts" />
"use strict";
angular.module("buyCoApp").config(AppRoutes);

function AppRoutes($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
    $routeProvider
        .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
        .when('/auth/uphold/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        .when('/proposal/list', { controller: ProposalListController, templateUrl: 'js/sellers/proposal-list.html' })
        .when('/seller/signup', { controller: SellerSignupController, controllerAs: "vm", templateUrl: 'js/sellers/seller-signup.html' })
        .when('/seller/list', { controller: SellerListController, templateUrl: 'views/seller-list.html' })
        // TODO BW dd. 2016-01-06: To get proper 404 this otherwise route should be omitted and have the server have a special 'not-found' route to return the 'not-found' view. Because the client side can not set 404 status.
        // You'd want to keep URL the same though, so there are no 'freaky' redirects and the user can simply correct any typo's based on the current url.
        .otherwise({ templateUrl: "views/not-found.html" });
    $locationProvider.html5Mode(true);
    $locationProvider.hashPrefix("!");
}
