﻿/// <reference path="../typings/tsd.d.ts" />

/**
 * URL of the backend API. Currently a local URL, i.e. the static client files are hosted by the API server.
 * In the future the API could be split from the client, which is when the API URL will be made configurable
 */
var apiUrl = "/api";

interface BuyCoRootScope extends ng.IRootScopeService {
    isLoggedIn: boolean;
    isGlobalAdmin: boolean;
    // The variables below belong in the login controller. Currently placed here as a workaround to be able to show error
    // message while logging in.
    isProcessingLogin: boolean;
    loginErrorMessage: string;
    isPublicPage(locationService: ng.ILocationService): boolean;
    userInfo: IUser;
}

module BuyCo {
    'use strict';

    // All controllers are registered here.
    var BuyCoApp = angular.module('buyCoApp', ['ngResource', 'ngRoute', 'ngSanitize', 'mgcrea.ngStrap'])
        .controller('NavigationController', NavigationController)
        .controller('LoginController', LoginController)
        .controller('UserAccountController', UserAccountController)
        ;

    BuyCoApp.config(function ($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
        $routeProvider
            .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
            .when('/auth/uphold/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
            //.when('/user/profile', { controller: UserAccountController, templateUrl: 'views/user-profile.html' })
            .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
            .when('/not-found', { templateUrl: 'views/not-found.html' })
            .when('/proposal/new', { controller: ProposalController, templateUrl: 'views/proposal-form.html' })
            .when('/proposal/list', { controller: ProposalListController, templateUrl: 'views/proposal-list.html' })

            // For multiple routes handled by the same controller we use the 'name' attribute to distinguish them. Ideally
            // this would work as nice as Express where we provide a specific function to handle the route, but there doesn't
            // seem to be such an option in Angular.
            .when('/proposal/:id', { controller: ProposalController, templateUrl: 'views/proposal-details.html', name: 'details' })
            .when('/proposal/:id/back', { controller: ProposalController, templateUrl: 'views/proposal-back.html', name: 'back' })
            .when('/seller/signup', { controller: SellerSignupController, templateUrl: 'sellers/seller-signup.html' })
            .when('/seller/list', { controller: SellerListController, templateUrl: 'sellers/seller-list.html' })
            .otherwise({ redirectTo: 'not-found' });
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('!');

    }).run(['$rootScope', function ($rootScope: BuyCoRootScope) {
        /**
         * Returns whether this is a public page.
         */
        $rootScope.isPublicPage = function () {
            // Don't know how to get access to Angular items here. Inject for $location
            // doesn't work.
            // Hence just access window.location directly.
            return window.location.pathname.indexOf('/audit') === 0;
        };
    }]);

    

    // Note: the string name provided to angular has to match the parameter names as used in the controllers,
    // case-sensitive. 
    BuyCoApp.service('identityService', IdentityService);
}

/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName: string) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}