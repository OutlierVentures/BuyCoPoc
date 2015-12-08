/// <reference path="../typings/tsd.d.ts" />

/**
 * URL of the backend API. Currently a local URL, i.e. the static client files are hosted by the API server.
 * In the future the API could be split from the client, which is when the API URL will be made configurable
 */
var apiUrl = "/api";

interface MoneyCirclesRootScope extends ng.IRootScopeService {
    isLoggedIn: boolean;
    isGlobalAdmin: boolean;
    // The variables below belong in the login controller. Currently placed here as a workaround to be able to show error
    // message while logging in.
    isProcessingLogin: boolean;
    loginErrorMessage: string;
    isPublicPage(locationService: ng.ILocationService): boolean;
    userInfo: IUser;
}

module MoneyCircles {
    'use strict';

    // All controllers are registered here.
    var moneyCirclesApp = angular.module('moneyCirclesApp', ['ngResource', 'ngRoute', 'ngSanitize', 'mgcrea.ngStrap'])
        .controller('NavigationController', NavigationController)
        .controller('LoginController', LoginController)
        .controller('UserAccountController', UserAccountController)
        .controller('CircleController', CircleController);

    moneyCirclesApp.config(function ($routeProvider: ng.route.IRouteProvider, $locationProvider: ng.ILocationProvider) {
        $routeProvider
            .when('/', { controller: DashboardController, templateUrl: 'views/dashboard.html' })
            .when('/auth/bitreserve/callback', { controller: LoginController, templateUrl: 'views/login-finished.html' })
        //.when('/user/profile', { controller: UserAccountController, templateUrl: 'views/user-profile.html' })
            .when('/user/login', { controller: LoginController, templateUrl: 'views/login-finished.html' })
            .when('/not-found', { templateUrl: 'views/not-found.html' })
            .when('/circle/new', { controller: CircleController, templateUrl: 'views/circle-form.html' })
            .when('/circle/list', { controller: CircleListController, templateUrl: 'views/circle-list.html' })
        // For multiple routes handled by the same controller we use the 'name' attribute to distinguish them. Ideally
        // this would work as nice as Express where we provide a specific function to handle the route, but there doesn't
        // seem to be such an option in Angular.
            .when('/circle/:id/join', { controller: CircleController, templateUrl: 'views/circle-join.html', name: 'join' })
            .when('/circle/:id', { controller: CircleController, templateUrl: 'views/circle-details.html', name: 'details' })
            .when('/circle/:id/deposit', { controller: CircleController, templateUrl: 'views/circle-deposit.html', name: 'deposit' })
            .when('/circle/:id/loan', { controller: CircleController, templateUrl: 'views/loan-request.html', name: 'loan-request' })
            .when('/loan/list', { controller: LoanListController, templateUrl: 'views/loan-list.html' })
            .when('/loan/:id/repay', { controller: LoanController, templateUrl: 'views/loan-repay.html', name: 'repay' })
            .when('/audit', { controller: AuditListController, templateUrl: 'views/audit-list.html' })
            .otherwise({ redirectTo: 'not-found' });
        $locationProvider.html5Mode(true);
        $locationProvider.hashPrefix('!');

    }).run(['$rootScope', function ($rootScope: MoneyCirclesRootScope) {
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
    moneyCirclesApp.service('identityService', IdentityService);
}

/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName: string) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}