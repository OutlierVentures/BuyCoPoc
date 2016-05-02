interface ISellerProposalService {
    getProposals(
        accessToken: AccessToken,
        proposalFilter: IProposalFilter
    ): ng.IPromise<IProposal[]>;
}

class SellerProposalService implements ISellerProposalService {
    public static $inject = [
        "$http",
        "$q"
    ];
    
    public proposalFilter;
    
    constructor(
        private $http: ng.IHttpService,
        private $q: ng.IQService) {
    }

    getProposals (
        accessToken: AccessToken,
        proposalFilter: IProposalFilter
    ) {
        return this.$q((resolve, reject) => { 
            this.$http({
                method: 'GET',
                url: apiUrl + "/proposal/", 
                params: proposalFilter,
                headers: { AccessToken: accessToken }
            })
            .then((result) => {
                resolve(result.data);
            }).catch((error)  => {
                reject(`Error getting proposal data: ${error}`);
            });
        });
    }
}

angular.module("buyCoApp").service("sellerProposalService", SellerProposalService);