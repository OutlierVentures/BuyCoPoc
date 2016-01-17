/// <reference path="../typings/tsd.d.ts" />

"use strict";
angular.module("buyCoApp", [
    "ngResource",
    "ngRoute",
    "ngSanitize",
    "mgcrea.ngStrap",
    "buyCoApp.services"
]);


angular.module("buyCoApp.services", [
    "ngMockE2E"
]);

// TODO BW: Include sellerResourceMock optionally only when useStub is on in config.
