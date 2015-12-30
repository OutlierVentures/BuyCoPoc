﻿class Seller {
    name: String;
}

interface ISellerListScope extends ng.IScope {
    Sellers: List<Seller>;
}

class SellerSignupController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService",
        "ngMessages"];

    constructor(
        private $scope: ISellerSignUpScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {
        // $scope.vm = this;

        this.signup();
    }

    signup() {
        var t = this;

        this.$http({
            method: 'POST',
            url: apiUrl + '/seller/signup',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.signupResponse = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error signing up:");
            console.log(error);

            // TODO: show notification
        });
    }
}
