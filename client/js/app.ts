/// <reference path="../typings/tsd.d.ts" />
/// <reference path="../typings/tsd.d.ts" />
import Controllers = require("./controllers");
import UserAccountController = Controllers.UserAccountController;
import LoginController = Controllers.LoginController;
import NavigationController = Controllers.NavigationController;
"use strict";

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
    userInfo: buyCo.Models.IUser;
}

// angular.module("buyCoApp", ["ngResource", "ngRoute", "ngSanitize", "mgcrea.ngStrap"]);

// All controllers are registered here.
// TODO Suggestion BW: Follow John Papa's Angular styleguide.
angular.module("buyCoApp").controller("NavigationController", NavigationController);
angular.module("buyCoApp").controller("LoginController", LoginController);
angular.module("buyCoApp").controller("UserAccountController", UserAccountController);

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

// Note: the string name provided to angular has to match the parameter names as used in the controllers,
// case-sensitive.
angular.module("buyCoApp").service("identityService", IdentityService);



/**
 * Shorthand method for getting an Angular service from the debug console.
 */
function angularGetService(serviceName: string) {
    return angular.element(document.querySelector('.ng-scope')).injector().get(serviceName);
}