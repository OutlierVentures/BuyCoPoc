interface ISellerProposalService {
    getProposals(): ng.IPromise<IProposal[]>;
}

class SellerProposalService {
    public static $inject = [
        "$q",
        "$http"
    ];

    constructor(
        private $http: ng.IHttpService,
        private $q: ng.IQService) {
    }

    getProposals(accessToken: AccessToken, proposalId: string) {
        return this.$q((resolve, reject) => { 
            this.$http.get(apiUrl + "/proposal/", { headers: { AccessToken: accessToken } })
            .then((result: IProposal[]) => {
                resolve(result);
            }).catch((error)  => {
                reject(`Error getting proposal data: ${error}`, null);
            });
        });
    }
}

angular.module("buyCoApp").service("sellerProposalService", SellerProposalService);