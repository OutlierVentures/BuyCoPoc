
interface IUserAccountScope extends ng.IScope {
    //credentials: Credentials;
    isAuthenticated(): Boolean;
    userInfo: IUser;
    version: string;
}

class UserAccountController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$location",
        "configurationService",
        "blockchainService"
    ];

    constructor(
        private $scope: IUserAccountScope,
        private $rootScope: BuyCoRootScope,
        private $location: ng.ILocationService,
        private configurationService: IConfigurationService,
        private blockchainService: BlockchainService) {

        this.$rootScope.$on('loggedOn', function (event, data) {
            $scope.userInfo = $rootScope.userInfo;
            configurationService.getVersion()
                .then((version) => {
                    $scope.version = version;
                });

            // Blockchain connection from client disabled for now, til https connection is solved.
            //if (!blockchainService.isConnected()) {
            //    configurationService.getEthereumJsonRpcUrl()
            //        .then(url=> {
            //            blockchainService.connect(url);
            //        });
            //}
        });
    }
}

angular.module("buyCoApp").controller("UserAccountController", UserAccountController);
