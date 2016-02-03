// Dummy declarations for libraries under lib/ for which we don't have TypeScript .d.ts files.
var Accounts;
var HookedWeb3Provider;
var web3;

/**
 * Wrapper for the connection to the blockchain node. Managing transactions and accounts.
 */
class BlockchainService {
    jsonRpcUrl: string;
    accounts: any;

    $inject = ['$rootScope',
        '$http',
        '$q',
        'configurationService',
        "_"];

    constructor(
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $q: ng.IQService,
        private configurationService: ConfigurationService,
        private _: UnderscoreStatic
    ) {

        var t = this;

        this.$rootScope.$on('loggedOn', function (event, data) {
            // Connect after user logon.
            // COULD DO: model this as an IIdentityProvider as well. Arguably it is a provider
            // of an identity.
            configurationService.getEthereumJsonRpcUrl()
                .then(url=> {
                    t.connect(url);
                }, err => {
                    // TODO: handle error when connecting to blockchain.
                    // Should also be handled in other places, e.g. before transacting (isConnected()?),
                    // on user profile page.
                });
        });
    }

    /**
     * 
     * @param url
     */
    connect(url: string) {
        // Create Accounts Object
        this.accounts = new Accounts();

        // Clear accounts initially. We only want to work with accounts that we 
        // have saved to the server side.
        this.accounts.clear();

        // Set web3 provider
        var provider = new HookedWeb3Provider({
            host: url,
            transaction_signer: this.accounts
        });
        web3.setProvider(provider);

        console.log("Connected to Ethereum node at " + url);
        // Extend the web3 object
        this.accounts.log = function (msg) { console.log(msg); };

        this.afterConnect();
    }

    /**
     * Handle actions that should be executed after connecting to the blockchain node.
     */
    private afterConnect() {
        var t = this;

        t.loadAccounts()
            .then(res => { 
                console.log("Number of accounts configured:", this.accounts.length);

                // Ensure we have at least one account
                if (t.accounts.length == 0) {
                    // Always create an account to ensure the user has a unique one. And use that.
                    // We use encrypted account data, but don't allow user to set a password yet.
                    // TODO MVP: introduce proper security for key management.
                    t.accounts.new("12345678");
                    t.saveAccounts();
                }
            }, err => {
                // On error, also ensure we have at least one account. This could be a new
                // user without any accounts.
                if (t.accounts.length == 0) {
                    t.accounts.new("secret");
                    t.saveAccounts();
                }
            });
    }

    private loadAccounts(): ng.IPromise<boolean> {
        var t = this;

        var defer = t.$q.defer<boolean>();

        // Load accounts from server side.
        t.$http({
            method: 'GET',
            url: apiUrl + '/user/accounts',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success(function (col: IBlockchainAccountCollection) {
            if (col) {
                var ethJsFormat = t.toEthereumJsAccountsFormat(col);

                var accountsString = JSON.stringify(ethJsFormat);
                if (accountsString)
                    t.accounts.import(accountsString);
            }

            defer.resolve(true);
        }).error(function (error) {
            // TODO: handle error
            console.error(error);
            defer.reject(error);
        });

        return defer.promise;
    }

    private saveAccounts(): ng.IPromise<boolean> {
        var t = this;

        var defer = t.$q.defer<boolean>();

        var ethJsAccts = t.accounts.get();
        var col = t.fromEthereumJsAccountsFormat(ethJsAccts);

        // Ensure all our client accounts are saved on the server side.
        // The server side ensures that each account has enough balance to transact.
        t.$http({
            method: 'POST',
            url: apiUrl + '/user/accounts',
            headers: { AccessToken: t.$rootScope.userInfo.accessToken },
            data: col
        }).success(function (user: IUser) {
            // The user result is enriched with the account balances. 
            // COULD DO: save this and show it somewhere.
            defer.resolve(true);
        }).error(function (error) {
            // TODO: handle error
            console.error(error);
            defer.reject(error);
        });

        return defer.promise;
    }

    /**
     * Convert an IBlockchainAccountCollection to an array of accounts in
     * ethereumjs-accounts (suitable for import).
     * @param accounts
     */
    toEthereumJsAccountsFormat(col: IBlockchainAccountCollection): any {
        var accounts = {};

        accounts["selected"] = col.selected;

        for (var k in col.accounts) {
            var acct = col.accounts[k];
            accounts[acct.address] = acct;
        }

        return accounts;
    }

    /**
     * Convert an array of accounts from ethereumjs-accounts export
     * to the IBlockchainAccountCollection format.
     * @param accounts
     */
    fromEthereumJsAccountsFormat(accounts): IBlockchainAccountCollection {
        var col = <IBlockchainAccountCollection>{};
        col.accounts = [];
        col.selected = accounts.selected;

        for (var k in accounts) {
            if (k == "selected")
                continue;
            col.accounts.push(accounts[k]);
        }

        return col;
    }

    getCurrentAccount(): string {
        return this.accounts.get()["selected"];
    }

    getProposalContract(address: string): PromiseLike<any> {
        var t = this;

        var defer = t.$q.defer<any>();

        // Get ABI for the contract
        t.$http({
            method: 'GET',
            url: apiUrl + '/contract/Proposal/abi',
        }).success(function (contractAbi: any) {
            var contractDef = web3.eth.contract(contractAbi);

            var con = contractDef.at(address);

            defer.resolve(con);
        }).error(function (error) {
            // Handle error

            defer.reject(error);
        });

        return defer.promise;
    }


    newAccount() {
        // TODO
        // Call ethereumjs-accounts
    }

    isConnected(): boolean {
        // TODO
        return false;
    }
}

angular.module("buyCoApp").service("blockchainService", BlockchainService);