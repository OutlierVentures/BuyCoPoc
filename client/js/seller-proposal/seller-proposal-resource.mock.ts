SellerProposalResourceMock.$inject = ["$httpBackend", "$http", "_", "uri"];

function SellerProposalResourceMock($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic, uri: uri.URIStatic) : void {
    if (!$httpBackend.whenGET) {
        console.log("Cannot use $httpBackend.whenGet! The 'ngMockE2E' module is probably not declared as a dependency. Exiting.");
        return;
    }
    var proposals: IProposal[];
    const url = apiUrl + "/proposal";
    
    // Return all proposals for basic url.
    $httpBackend.whenGET(apiUrl).respond(function(method, url, data) {
        return [200, proposals, {}];
    });

    // Return filtered proposals when there are url parameters
    const proposalRegex = new RegExp(apiUrl + "/w*", 'i');    
    $httpBackend.whenGET(proposalRegex).respond(function (method, url, data) {
        // Get the filter parameters from the URL - if any.
        var uri = new URI(url);
        const category = uri.search(true).category;
        const partNumber = uri.search(true).partNumber;
        const maxPrice = uri.search(true).maxPrice;
        const minTotalAmount = uri.search(true).minTotalAmount;
        
        // Filter on the specified parameters
        const results: IProposal = _.find(proposals, (item: IProposal) => {
            let inFilter = 
                (!category || category===item.mainCategory) &&
                (!partNumber || partNumber===item.id) &&
                (!maxPrice || maxPrice===item.maxPrice) &&
                (!minTotalAmount || minTotalAmount<item.totalAmount);
            return inFilter;
        });
        return [200, results, {}];
    });
        
    // Pass through any requests for application files, so these are still allowed.
    $httpBackend.whenGET(/.*/).passThrough();
    
    // Get the mock data from json file.
    $http.get("data/proposals.json").then((result: any) => {
        proposals = result.data;
    });
}

angular.module("buyCoApp.services").run(SellerProposalResourceMock);
