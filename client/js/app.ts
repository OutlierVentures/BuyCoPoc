/// <reference path="../typings/tsd.d.ts" />
"use strict";

/**
 * URL of the backend API. Currently a local URL, i.e. the static client files are hosted by the API server.
 * In the future the API could be split from the client, which is when the API URL will be made configurable
 */
const apiUrl = "/api";

interface BuyCoRootScope extends ng.IRootScopeService {
    isLoggedIn: boolean;
    isGlobalAdmin: boolean;
    version: string;
    // The variables below belong in the login controller. Currently placed here as a workaround to be able to show error
    // message while logging in.
    isProcessingLogin: boolean;
    loginErrorMessage: string;
    isPublicPage(locationService: ng.ILocationService): boolean;
    userInfo: IUser;
}

// angular.module("buyCoApp", ["ngResource", "ngRoute", "ngSanitize", "mgcrea.ngStrap"]);

angular.module("buyCoApp").run(['$rootScope', function ($rootScope: BuyCoRootScope) {
    /**
     * Returns whether this is a public page.
     */
    $rootScope.isPublicPage = function() {
        // Don't know how to get access to Angular items here. Inject for $location
        // doesn't work.
        // Hence just access window.location directly.
        return window.location.pathname.indexOf('/audit') === 0;
    };
}]);

/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName: string) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}
