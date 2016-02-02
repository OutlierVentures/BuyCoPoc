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
        '$q'];

    constructor(
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $q: ng.IQService
    ) {
    }

    /**
     * 
     * @param url
     */
    connect(url: string) {
        // Create Accounts Object
        this.accounts = new Accounts();

        // Set web3 provider
        var provider = new HookedWeb3Provider({
            host: url,
            transaction_signer: this.accounts
        });
        web3.setProvider(provider);

        console.log("Connected to Ethereum node at " + url);
        // Extend the web3 object
        this.accounts.log = function (msg) { console.log(msg); };

        console.log("Number of accounts configured", this.accounts.length);
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