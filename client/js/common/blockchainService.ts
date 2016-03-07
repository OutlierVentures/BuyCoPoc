// Dummy declarations for libraries under lib/ for which we don't have TypeScript .d.ts files.
var Accounts;
var HookedWeb3Provider;
var web3;

/**
 * Currently we don't allow users to provide the password for their ethereum accounts. Accounts
 * are encrypted (to prepare for proper security) but we use the same trivial password for all
 * (to favor usability in the proof of concept).
 */
var DUMMY_PASSWORD = "12345678";

/**
 * Wrapper for the connection to the blockchain node. Managing transactions and accounts.
 */
class BlockchainService {
    private jsonRpcUrl: string;
    private accounts: any;
    private savedAccounts: IBlockchainAccountCollection;

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
                .then(url => {
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

        // Override the password request function for decrypting the password.
        // ethereumjs-accounts calls this function with the account info any 
        // time a transaction sent from that account has to be signed.  
        this.accounts.options.request = function (accountObject) {
            // TODO: securely let the user provide a password.
            // The user could be requested the password for address accountObject.address.
            // Any integration of key management should be done at this point.

            // Currently using dummy password.
            return DUMMY_PASSWORD;
        }

        this.afterConnect();
    }

    getAccounts(): IBlockchainAccountCollection {
        // Get the accounts from ethereumjs-accounts. Return in our improved structure.
        var t = this;
        if (!t.accounts) return null;

        var ethJsAccts = t.accounts.get();
        var col = t.fromEthereumJsAccountsFormat(ethJsAccts);

        return col;
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
                    t.accounts.new(DUMMY_PASSWORD);
                }
                t.saveAccounts();

                t.$rootScope.$emit('blockchainConnected');
            })
            .catch(err => {
                // On error, also ensure we have at least one account. This could be a new
                // user without any accounts.
                if (t.accounts.length == 0) {
                    t.accounts.new(DUMMY_PASSWORD);
                    t.saveAccounts();
                }

                t.$rootScope.$emit('blockchainConnected');
            });
    }

    /**
     * Load Ethereum accounts from the server backup and unlock them.
     */
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
                t.savedAccounts = col;
                var ethJsFormat = t.toEthereumJsAccountsFormat(col);

                var accountsString = JSON.stringify(ethJsFormat);
                if (accountsString) {
                    // Import them in ethereumjs-accounts. They stay encrypted until used.
                    t.accounts.import(accountsString);

                    // The import function doesn't process the selected account. Process manually.
                    t.accounts.select(col.selected);
                }
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
            t.savedAccounts = user.blockchainAccounts;
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

    getProposalRegistryContract(): ng.IPromise<IProposalRegistryContract> {
        var t = this;

        var defer = t.$q.defer<any>();
        var reject = defer.reject;
        var resolve = defer.resolve;

        t.$q.all(
            [
                // Get address of the registry
                t.$http({
                    method: 'GET',
                    url: apiUrl + "/config/ethereum/contracts/proposalRegistry",
                }),
                // Get ABI for the contract
                t.$http({
                    method: 'GET',
                    url: apiUrl + '/contract/ProposalRegistry/abi',
                })
            ])
            .then((results: ng.IHttpPromiseCallbackArg<any>[]) => {
                var registryAddress = results[0].data;
                var contractAbi = results[1].data;

                var contractDef = web3.eth.contract(contractAbi);

                var con: IProposalRegistryContract = contractDef.at(registryAddress);

                var contractsVersion = con.version();
                if (contractsVersion != codeContractsVersion) {
                    reject("Invalid contract version " + contractsVersion + ". The code is built against version " + codeContractsVersion + ".");
                }

                resolve(con);
            })
            .catch(error => {
                // Handle error
                reject(error);
            });

        return defer.promise;
    }

    getProposalContractAt(address: string): ng.IPromise<IProposalContract> {
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
        // TODO: Create a new account on demand.
    }

    isConnected(): boolean {
        // TODO
        return false;
    }

    // WARNING: ADAPTED DUPLICATE FROM web3plus
    /**
     * Returns a Promise that resolves when the specified transaction hash has been committed
     * to the blockchain.
     * Usage:
     * myContract.stateChangingMethod(function(err, res) {
     *  promiseCommittal(res)
     *      .then(... do stuff after it has been committed ...)
     *      .catch(... handle errors ...);
     *  });
     * Or with a promisified contract method:
     * myContract.stateChangingMethod()
     *      .then(... do stuff after it has been committed ...)
     *      .catch(... handle errors ...);
     */
    promiseCommital(transactionHash: string): ng.IPromise<any> {
        console.log("Waiting til transaction " + transactionHash + " has been committed.");

        var defer = this.$q.defer();
        var resolve = defer.resolve;
        var reject = defer.reject;

        // Watch for the tx to be processed.
        // Tried to use a filter with { topics: [txHash] }, but that never fires.
        var f = web3.eth.filter("latest");

        f.watch(createCallback(transactionHash));

        function createCallback(txHash: string) {
            return function (err, res) {
                if (err)
                    reject(err);
                else {
                    // Check whether the tx has been processed
                    resolveIfCommitted(txHash);
                }
            }
        }

        // Check at least once in case the filter was placed after processing the tx.
        resolveIfCommitted(transactionHash);

        /**
         * Resolve the promise if the tx has been committed.
         */
        function resolveIfCommitted(txHash: string) {
            web3.eth.getTransaction(txHash, function (txErr, txRes) {
                if (txErr) {
                    reject(txErr);
                } else if (txRes.blockNumber) {
                    if (f) { f.stopWatching(); }
                    resolve(txRes);
                }
            });
        }

        return defer.promise;
    }
}

angular.module("buyCoApp").service("blockchainService", BlockchainService);