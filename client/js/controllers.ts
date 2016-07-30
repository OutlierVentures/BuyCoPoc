/// <reference path="../typings/tsd.d.ts" />

interface ILoginScope extends ng.IScope {
    //credentials: Credentials;
    isAuthenticated(): boolean;
    login(): any;
    userInfo: IUser;
    blockchainAccounts: IBlockchainAccountCollection;
    isGlobalAdmin: boolean;
}

interface IOVWindowService extends ng.IWindowService {
    _: UnderscoreStatic; // Extend with underscore.
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
        "identityService",
        "blockchainService",
        "configurationService"];

    constructor(
        private $scope: ILoginScope,
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $window: ng.IWindowService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService,
        private blockchainService: BlockchainService,
        private configurationService: ConfigurationService) {

        var t = this;

        $scope.isAuthenticated = function (): boolean {
            return identityService.isAuthenticated();
        }

        // See if sessionStorage contains valid login info. If so, we can consider the user to be logged in.
        var tokenFromSession = $window.sessionStorage.getItem("upholdToken");
        var userStringFromSession = $window.sessionStorage.getItem("upholdUserInfo");

        // We prefer a login from the session, even when processing the callback from the OAuth provider. If the
        // token is stale, it should be cleared before a new login attempt.
        // TODO: detect that token is stale/incorrect and clear it.

        if (tokenFromSession && userStringFromSession
            // Don't authenticate when already authenticated.
            && !this.$scope.isAuthenticated()) {
            // Restore from session
            var userDataFromSession = <IUser>JSON.parse(userStringFromSession);
            var brip = new UpholdIdentityProvider();
            brip.setToken(tokenFromSession, null);
            brip.setUserInfo(userDataFromSession, null);

            // Log on with it
            identityService.logon(brip);

            // Store in scope to show in view
            $scope.userInfo = userDataFromSession;

            t.loadUserData();
        } else if (this.$location.path() === "/auth/uphold/callback"
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

            // Call API /auth/uphold/callback
            $http({
                method: 'POST',
                url: apiUrl + '/auth/uphold/callback',
                data: theParams
            }).success(function (resultData: any) {
                console.log("Successful call to OAuth callback on API. Result:");
                console.log(resultData);

                // Store token in Uphold identity provider
                var brip = new UpholdIdentityProvider();
                brip.setToken(resultData.user.accessToken, $window);
                brip.setUserInfo(resultData.user, $window);

                $rootScope.isGlobalAdmin = resultData.isGlobalAdmin;
                $scope.isGlobalAdmin = resultData.isGlobalAdmin;
                // Log on with it
                identityService.logon(brip);

                // Store in scope to show in view
                $scope.userInfo = resultData.user;

                t.loadUserData();
            }).error(function (error) {
                // Handle error
                console.log("Error on OAuth callback to API:");
                console.log(error);
                $rootScope.isProcessingLogin = false;

                // Workaround to show login error message: use root scope. This really belongs in the LoginController, but:
                // * The only visible part is a static template (<div ng-include="'views/login.html'" ng-hide="isLoggedIn"></div>)
                // * The logon controller loads its template in the <div ng-view></div> like any other controller. This div
                //   is NOT visible while not logged on.
                $rootScope.loginErrorMessage = "There was an error processing your login. Please try again. Details: " + error.error;
            });
        }

        t.tryLoadBlockchainAccounts();

        $rootScope.$on('blockchainConnected', e => {
            t.tryLoadBlockchainAccounts();

        });

    }

    tryLoadBlockchainAccounts() {
        var t = this;

        t.$scope.blockchainAccounts = t.blockchainService.getAccounts();

        if (t.$scope.blockchainAccounts) {
            // Load balance for each account.
            _(t.$scope.blockchainAccounts.accounts).each(acc => {
                acc.balance = web3.fromWei(web3.eth.getBalance(acc.address), 'ether').toNumber();
            });
        }
    }

    loadUserData() {
        var t = this;
        this.$http({
            method: 'GET',
            url: apiUrl + '/user',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (resultData: IUser) {
            if (!resultData) {
                // Login error. Token invalid? Refresh and relogin.
                t.$window.sessionStorage.setItem("upholdToken", "");
                t.$window.sessionStorage.setItem("upholdUserInfo", "");
                t.$route.reload();
                return;
            }

            t.$rootScope.userInfo = resultData;

            // Homepage per perspective
            if (t.$location.path() == "/") {
                if (resultData.preferences && resultData.preferences.perspective) {
                    if (resultData.preferences.perspective == "seller")
                        t.$location.path('/seller-proposal/list');
                }
            }
        }).error(function (error) {
            // Handle error
            console.log(error);
        });
    }
}

angular.module("buyCoApp").controller("LoginController", LoginController);


interface IDashboardScope extends ng.IScope {
    userInfo: IUser;
    allCards: IUpholdCard[];
    cardsToShow: IUpholdCard[];
    favoriteCardsOnly: boolean;
}


class DashboardController {
    public static $inject = [
        "$scope",
        "$rootScope",
        "$location",
        "$http",
        "$window",
        "_"];

    constructor(
        private $scope: IDashboardScope,
        private $rootScope: BuyCoRootScope,
        private $location: ng.ILocationService,
        private $http: ng.IHttpService,
        private $window: IOVWindowService,
        private _: UnderscoreStatic) {

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

        // Get underscore from global (TODO: inject!)
        // t._ = t.$window._;

        t.$scope.favoriteCardsOnly = false;
        t.determineCardsToShow();

        t.$scope.$watch("favoriteCardsOnly", (newValue, oldValue) => {
            if (newValue !== oldValue) {
                t.determineCardsToShow();
            }
        });
    }

    private loadData() {
        var t = this;
        t.$scope.userInfo = t.$rootScope.userInfo;
        t.loadUpholdData();
    }

    private loadUpholdData() {
        // Load Uphold data
        var t = this;

        this.$http({
            method: 'GET',
            url: apiUrl + '/uphold/me/cards',
            headers: { AccessToken: t.$scope.userInfo.accessToken }
        }).success(function (cards: any) {
            console.log("Success on Uphold call through our API. Result:");
            console.log(cards);

            // Store in scope to show in view
            t.$scope.allCards = cards;
            t.determineCardsToShow();
        }).error(function (error) {
            // Handle error
            console.log("Error on Uphold call through our API:");
            console.log(error);

            // TODO: further handling
        });
    }

    private determineCardsToShow() {
        var t = this;
        t.$scope.cardsToShow = !t.$scope.favoriteCardsOnly ?
            // When favoriteCardsOnly then show only cards with settings.starred = true.
            t.$scope.allCards : t._.filter(t.$scope.allCards, function (card: IUpholdCard) {
                return card.settings.starred;
            });
        ;
    }

    private starredCards() {
        var t = this;
        var result = t._.filter<IUpholdCard>(t.$scope.allCards, (card) => {
            return card.settings.starred;
        });
        return result;
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

angular.module("buyCoApp").controller("NavigationController", NavigationController);
