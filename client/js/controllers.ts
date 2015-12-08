interface ILoginScope extends ng.IScope {
    //credentials: Credentials;
    isAuthenticated();
    login();
    userInfo: IUser;
    isGlobalAdmin: boolean;
}

/**
 * Controller for the logon box.
 */
class LoginController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$http",
        "$location",
        "$window",
        "$route",
        "identityService"];

    constructor(
        private $scope: ILoginScope,
        private $rootScope: MoneyCirclesRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService) {

        $scope.isAuthenticated = function (): boolean {
            return identityService.isAuthenticated();
        }

        // See if sessionStorage contains valid login info. If so, we can consider the user to be logged in.
        var tokenFromSession = $window.sessionStorage.getItem("bitReserveToken");
        var userStringFromSession = $window.sessionStorage.getItem("bitReserveUserInfo");

        // We prefer a login from the session, even when processing the callback from the OAuth provider. If the
        // token is stale, it should be cleared before a new login attempt.
        // TODO: detect that token is stale/incorrect and clear it.

        if (tokenFromSession && userStringFromSession
            // Don't authenticate when already authenticated.
            && !this.$scope.isAuthenticated()) {
            // Restore from session
            var userDataFromSession = <IUser>JSON.parse(userStringFromSession);
            var brip = new BitReserveIdentityProvider();
            brip.setToken(tokenFromSession, null);
            brip.setUserInfo(userDataFromSession, null);

            // Log on with it
            identityService.logon(brip);

            // Store in scope to show in view
            $scope.userInfo = userDataFromSession;
        } else if (this.$location.path() == "/auth/bitreserve/callback"
        // Don't handle a login attempt while already logged in
            && !this.$scope.isAuthenticated()
            // The LoginController can be loaded twice. Make sure we don't process the login twice.
            && !this.$rootScope.isProcessingLogin
            ) {
            this.$rootScope.isProcessingLogin = true;

            // Handle OAuth callback

            // Get code and scope
            var queryString = $location.search();

            $window.location.search;

            var code = queryString["code"];
            var state = queryString["state"];

            var theParams = {
                'code': code,
                'state': state
            }

            if (queryString["error"]) {
                // TODO: handle error here.
                theParams["error"] = queryString["error"];
            }

            var t = this;

            // Call API /auth/bitreserve/callback
            $http({
                method: 'POST',
                url: apiUrl + '/auth/bitreserve/callback',
                data: theParams
            }).success(function (resultData: any) {
                console.log("Successful call to OAuth callback on API. Result:");
                console.log(resultData);

                // Store token in Uphold identity provider
                var brip = new BitReserveIdentityProvider();
                brip.setToken(resultData.user.accessToken, $window);
                brip.setUserInfo(resultData.user, $window);

                $rootScope.isGlobalAdmin = resultData.isGlobalAdmin;
                $scope.isGlobalAdmin = resultData.isGlobalAdmin;
                // Log on with it
                identityService.logon(brip);

                // Store in scope to show in view
                $scope.userInfo = resultData.user;
            }).error(function (error) {
                // Handle error
                console.log("Error on OAuth callback to API:");
                console.log(error);
                $rootScope.isProcessingLogin = false;

                // Workaround to show login error message: use root scope. This really belongs in the LoginController, but:
                // * The only visible part is a static template (<div ng-include="'views/login.html'" ng-hide="isLoggedIn"></div>)
                // * The logon controller loads its template in the <div ng-view></div> like any other controller. This div
                //   is NOT visible while not logged on.
                $rootScope.loginErrorMessage = "There was an error processing your login. Please try again. Details: " + error.error.error;
            });
        }

    }
}

interface IDashboardScope {
    userInfo: IUser;
    allCards: any;
}


class DashboardController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$location",
        "$http"];

    constructor(
        private $scope: IDashboardScope,
        private $rootScope: MoneyCirclesRootScope,
        private $location: ng.ILocationService,
        private $http: ng.IHttpService) {

        var t = this;

        // Reset any logon errors once we're logged in.
        $rootScope.loginErrorMessage = undefined;

        if ($rootScope.isLoggedIn) {
            t.loadData();
        }

        // The logon could happen while the controller is already loaded.
        $rootScope.$on('loggedOn', function () {
            t.loadData();
        });

    }

    private loadData() {
        var t = this;
        t.$scope.userInfo = t.$rootScope.userInfo;
        t.loadBitReserveData();
    }

    private loadBitReserveData() {
        // Load Uphold data
        var t = this;

        this.$http({
            method: 'GET',
            url: apiUrl + '/bitreserve/me/cards',
            headers: { AccessToken: t.$scope.userInfo.accessToken }
        }).success(function (cards: any) {
            console.log("Success on Uphold call through our API. Result:");
            console.log(cards);

            // Store in scope to show in view
            t.$scope.allCards = cards;
        }).error(function (error) {
            // Handle error
            console.log("Error on Uphold call through our API:");
            console.log(error);

            // TODO: further handling
        });

    }
}

class NavigationController {
    public static $inject = [
        "$scope",
        "$location"];

    constructor(
        private $scope: ng.IScope,
        private $location: ng.ILocationService) {
    }
}

interface IUserAccountScope extends ng.IScope {
    //credentials: Credentials;
    isAuthenticated();
    userInfo: IUser;
}

class UserAccountController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$location"];

    constructor(
        private $scope: IUserAccountScope,
        private $rootScope: MoneyCirclesRootScope,
        private $location: ng.ILocationService) {

        this.$rootScope.$on('loggedOn', function (event, data) {
            $scope.userInfo = $rootScope.userInfo;
        });

    }
}
