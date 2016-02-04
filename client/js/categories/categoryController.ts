interface ICategoryScope extends ng.IScope {
    categories: IMainCategory[];
    /**
     * Currently selected main category, if we're looking at a 
     * sub category list of a main category.
     * 
     */
    mainCategory: IMainCategory;
}

interface ICategoryRouteParameters extends ng.route.IRouteParamsService {
    mainCategory: string;
    subCategory: string;
}

class CategoryController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$timeout",
        "$route",
        "$routeParams",
        "identityService"];

    constructor(
        private $scope: ICategoryScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $timeout: ng.ITimeoutService,
        private $route: ng.route.IRouteService,
        private $routeParams: ICategoryRouteParameters,
        private identityService: IdentityService) {

        var mainCategoryId = this.$routeParams.mainCategory;

        // Show categories if the user is logged in.
        if (this.$rootScope.userInfo) {
            // This controller serves multiple actions. We distinguish the action by a 'name' which
            // is set in the route configuration in app.ts.
            if (this.$route.current.name === "mainCategory") {
                this.mainCategory(mainCategoryId);
            } else if (this.$route.current.name === "mainCategoryList") {
                this.mainCategoryList();
            }
        }
    }

    private getMainCategoryListData(cb: any) {
        var t = this;

        // Get main categories used in proposals
        t.$http({
            method: 'GET',
            url: apiUrl + '/proposal/category',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (mainCategories: any) {
            // Store in scope to show in view
            t.$scope.categories = mainCategories;
            
        }).error(function (error) {
            // Handle error
            cb(error, null);
        });
    }

    private getMainCategoryData(mainCategoryName: string, cb: any) {
        var t = this;

        // Get a single main category
        t.$http({
            method: 'GET',
            url: apiUrl + '/proposal/category/' + mainCategoryName,
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (mainCategory: IMainCategory) {
            t.$scope.mainCategory = mainCategory;
        }).error(function (error) {
            cb(error, null);
        });
    }

    mainCategoryList() {
        var t = this;

        t.getMainCategoryListData(function (err, res) {
        });
    }

    mainCategory(mainCategoryName: string) {
        var t = this;

        t.getMainCategoryData(mainCategoryName, function (err, res) {
        });
    }


}
