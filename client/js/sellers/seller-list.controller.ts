interface ISellerListScope extends ng.IScope {
}

class SellerListController {
    static $inject = [
        "$scope"
    ];

    constructor(
        private $scope: ISellerListScope,
        private $rootScope: BuyCoRootScope) {
            // Do some stuff.
    }
}

angular.module("buyCoApp").controller("SellerListController", SellerListController);
