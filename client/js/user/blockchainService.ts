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

        // Extend the web3 object
        Accounts.log = function (msg) { console.log(msg); };

        console.log(Accounts.length);

        // Get a proposal contract for testing
        this.getProposalContract("0xd690e15a3d8cccc636c97cc6a07cf632072baec4")
            .then(con => {
                console.log(con);
            }, err => {
                console.log(err);
            });
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