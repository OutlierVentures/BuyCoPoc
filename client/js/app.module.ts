/// <reference path="../typings/tsd.d.ts" />

"use strict";
angular.module("buyCoApp", [
    "ngResource",
    "ngRoute",
    "ngSanitize",
    "angularMoment",
    "mgcrea.ngStrap",
    "buyCoApp.services",
    "timer"
]);

// TODO BW Get settings from server.
// -- Service on server to get value from json file
// -- Controller on server to get value from service and return value on http request
// -- Service on client to connect to make http request
// -- Use service in controller or in this module.
//var config: configModel.IApplicationConfig;

angular.module("buyCoApp.services", [
    // Uncomment 'ngMockE2E' as a dependency to enable mocking the backend for supported data. 
    //"ngMockE2E"
]);

// TODO BW: Include sellerResourceMock optionally only when useStub is on in config.
