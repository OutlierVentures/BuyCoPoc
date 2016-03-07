/*** BEGIN tools ***/

// WARNING: DUPLICATION of backend /lib/tools. Copy from there.

/**
 * Remove dashes from a guid with length 36.
 * @param guid
 */
function guidRemoveDashes(guid: string) {
    if (!guid)
        throw new Error("guidRemoveDashes: Empty guid");

    if (guid.length != 36)
        throw new Error("Guid '" + guid + "' has wrong length");

    return guid.replace(/-/g, "");
}

/**
 * Add dashes to a guid with length 32.
 * @param guid
 */
function guidAddDashes(guid: string) {
    if (!guid)
        throw new Error("guidAddDashes: Empty guid");

    if (guid.length != 32)
        throw new Error("Guid '" + guid + "' has wrong length");

    return guid.substring(0, 8)
        + "-" + guid.substring(8, 12)
        + "-" + guid.substring(12, 16)
        + "-" + guid.substring(16, 20)
        + "-" + guid.substring(20);
}

/**
 * Generate a guid, by default with dashes (length 36). Pass skipDashes
 * to get a guid without them (length 32).
 * @param skipDashes
 */
function newGuid(skipDashes?: boolean) {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    var separator = "";
    if (!skipDashes)
        separator = '-';

    return s4() + s4() + separator + s4() + separator + s4() + separator +
        s4() + separator + s4() + s4() + s4();
};

/*** END tools ***/


interface IIdentityProvider {
    /**
     * Get the identifier of the current user on the backend, for example the Ethereum address, Counterparty
     * wallet address, etc.
     */
    getIdentifier(): string;

    /**
     * Gets info of the current user.
     */
    getUserInfo(): IUser;

    /**
     * Log on at the identity backend. The provider needs to be initialized (with configuration, credentials etc)
     * before calling Logon().
     * @return Whether the logon attempt succeeded.
     */
    logon(): boolean;

    /**
     * @return Whether the provider is currently logged on.
     */
    isAuthenticated(): boolean;

    /**
     * Encrypt the given data with the private key of this identity provider.
     */
    encrypt(unencryptedData: string): string;

    decrypt(encryptedData: string): string;
}

/**
 * Identity provider for Uphold using OAuth backend. The OAuth token is stored in the session storage.
 */
class UpholdIdentityProvider implements IIdentityProvider {
    /**
     * OAuth token as received from Uphold.
     */
    private _oauthToken: string;

    private _userInfo: IUser;

    getIdentifier(): string {
        // TODO: return user name/ID, not the token.
        return this._oauthToken;
    }

    setUserInfo(userInfo: IUser, w: Window) {
        this._userInfo = userInfo;
        if (w)
            w.sessionStorage.setItem('upholdUserInfo', JSON.stringify(userInfo));

    }

    getUserInfo() {
        return this._userInfo;
    }

    setToken(token: string, w: Window) {
        this._oauthToken = token;
        // Store in session storage
        if (w)
            w.sessionStorage.setItem('upholdToken', token);
    }

    isAuthenticated(): boolean {
        return this._oauthToken != null;
    }

    logon(): boolean {
        // We only require a token to function. If it's not empty, we're good to go.
        return this._oauthToken != null;
    }

    private getPrivateKey(): string {
        return this._oauthToken;
    }

    encrypt(unencryptedData: string): string {
        return CryptoJS.AES.encrypt(unencryptedData, this.getPrivateKey()).toString();
    }

    decrypt(encryptedData: string): string {
        // TODO: check for errors
        // TODO: handle case that data is unencrypted, or encrypted with different alg
        return CryptoJS.AES.decrypt(encryptedData, this.getPrivateKey()).toString(CryptoJS.enc.Utf8);
    }
}

/**
 * Service managing the identity of the user on the various backends.
 */
class IdentityService {
    /**
     * All active providers.
     */
    providers: IIdentityProvider[];

    /**
     * The main identity provider. If this is null, we're not authenticated.
     */
    primaryProvider: IIdentityProvider;

    $inject = ['$rootScope'];

    constructor(
        private $rootScope: BuyCoRootScope
        ) {
        this.providers = [];
    }

    /**
     * Logon with this provider.
     */
    logon(provider: IIdentityProvider): boolean {
        if (!provider.logon())
            return false;
        this.providers.push(provider);
        // The first successful provider is the primary one.
        if (!this.primaryProvider)
            this.primaryProvider = provider;

        this.$rootScope.userInfo = provider.getUserInfo();
        this.$rootScope.isLoggedIn = true;
        this.$rootScope.isProcessingLogin = false;


        this.$rootScope.$emit('loggedOn');

        return true;
    }

    logoff() {
        this.primaryProvider = null;
        this.providers = new Array<IIdentityProvider>();
    }

    isAuthenticated(): boolean {
        return this.primaryProvider && this.primaryProvider.isAuthenticated();
    }
}

angular.module("buyCoApp").service("identityService", IdentityService);
