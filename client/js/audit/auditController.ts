interface IAuditListScope {
    items: IAuditListItem[];
    totals: IBuyCoStatistics;
    applicationInfo: IApplicationInfo;
    vaultStatistics: IVaultStatistics;
    vm: AuditListController;
}



class AuditListController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: IAuditListScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {

        $scope.vm = this;

        this.list();
    }

    list() {
        var t = this;

        this.$http({
            method: 'GET',
            url: apiUrl + '/audit/buyco',
        }).success(function (resultData: IAuditList) {
            t.$scope.items = resultData.items;
            t.$scope.totals = resultData.totals;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting BuyCo audit data:");
            console.log(error);

            // TODO: show notification
        });

        this.$http({
            method: 'GET',
            url: apiUrl + '/audit/vault',
        }).success(function (resultData: IVaultStatistics) {
            t.$scope.vaultStatistics = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting vault data:");
            console.log(error);

            // TODO: show notification
        });

        this.$http({
            method: 'GET',
            url: apiUrl + '/audit/info',
        }).success(function (resultData: IApplicationInfo) {
            t.$scope.applicationInfo = resultData;
        }).error(function (error) {                
            // Handle error
            console.log("Error getting application info data:");
            console.log(error);

            // TODO: show notification
        });

    }
}