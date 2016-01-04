import Sellerservice = require("/client/js/sellers/seller.service");

interface ISellerSignUpScope extends ng.IScope {
    signupResponse: any;
}

angular.module("buyCoApp").controller("SellerSignupController", SellerSignupController);

class SellerSignupController {
    static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService",
        "sellerService"
    ];

    constructor(
        private $scope: ISellerSignUpScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService,
        private sellerService: Sellerservice.SellerService) {
        // private ngMessages: Function) {
        // $scope.vm = this;

        // this.signup();
    }

    signup() {
        var t = this;
        alert('signing up');
        this.$http({
            method: "POST",
            url: apiUrl + "/seller/signup",
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: any) {
            t.$scope.signupResponse = resultData;
        }).error(function (error) {                
            // Handle error.
            console.log("Error signing up:");
            console.log(error);

            // TODO: show notification
        });
    }
}
