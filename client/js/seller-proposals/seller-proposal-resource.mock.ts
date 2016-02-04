SellerProposalResourceMock.$inject = ["$httpBackend", "$http", "_", "uri"];

function SellerProposalResourceMock(
        $httpBackend: ng.IHttpBackendService,
        $http: ng.IHttpService,
        _: UnderscoreStatic,
        uri: uri.URIStatic) : void {
    // Mock only if the 'ngMockE2E' module is loaded (or 'ngMock').
    if (!$httpBackend.whenGET) {
        return;
    } else {
        // return;
    }
    console.log("The 'ngMockE2E' module is declared as a dependency, so mocking teh thingz (seller-propoal things).");
    
    var proposals: IProposal[];
    const url = apiUrl + "/proposal/";
    
    // Return all proposals for basic url.
    $httpBackend.whenGET(url).respond(function(method, url, data) {
        return [200, proposals, {}];
    });

    // // Return filtered proposals when there are url parameters
    const proposalRegex = new RegExp(url + "/\?w*", 'i');
    $httpBackend.whenGET(proposalRegex).respond(function (method, url, data) {
        // Get the filter parameters from the URL - if any.
        var uri = new URI(url);
        const category = uri.search(true).category;
        const sku = uri.search(true).partNumber;
        const maxPrice = uri.search(true).maxPrice;
        const minimumTotalAmount = uri.search(true).minimumTotalAmount;
        
        // Filter on the specified parameters
        const results: IProposal[] = _.filter(proposals, (item: IProposal) => {
            let partnrTest = new RegExp(sku);
            let inFilter = 
                (!category || category===item.subCategory) &&
                (!sku || partnrTest.test(item.productSku)) &&
                (!maxPrice || parseInt(maxPrice)>=item.maxPrice) &&
                (!minimumTotalAmount || parseInt(minimumTotalAmount)<item.totalAmount);
            return inFilter;
        });
        return [200, results || [], {}];
    });
        
    // Pass through any requests for application files, so these are still allowed.
    // $httpBackend.whenGET(/.*/).passThrough();
    // $httpBackend.whenPOST(/.*/).passThrough();
    
    // Get the mock data from json file.
    $http.get("data/proposals.json").then((result: any) => {
        proposals = result.data;
    });
}

angular.module("buyCoApp.services").run(SellerProposalResourceMock);
