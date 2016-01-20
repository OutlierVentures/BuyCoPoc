mockRun.$inject = ["$httpBackend", "$http", "_"];

function mockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic) : void {
    if (!$httpBackend.whenGET) {
        console.log("Cannot use $httpBackend.whenGet! The 'ngMockE2E' (or 'ngMock') module is probably not declared as a dependency. Exiting.");
        return;
    }
    var proposals: IProposal[];
    const sellerUrl = "/api/seller";
    const editingRegex = new RegExp(sellerUrl + "/w*", 'i');
    
    // Catch all for testing purposes
    $httpBackend.whenGET(sellerUrl).respond(function(method, url, data) {
        return [200, proposals, {}];
    });
    
    $httpBackend.whenGET(editingRegex).respond(function(method, url, data) {
        const maxPrice = url.split('/').pop();
        const minAmount = url.split('/').pop();
        
        const proposal: IProposal = _.any (proposals, (item: IProposal) => {
            var isMatch = 
                (!maxPrice || item.maxPrice > maxPrice) &&
                (!minAmount || item.totalAmount >= minAmount);
            return isMatch 
            
        });
        return [200, proposal, {}];
    });
    
    $httpBackend.whenPOST(editingRegex).respond(function (method, url, data) {
        alert('Currently the backend is mocked so you cannot save. This should only happen in the test environment');
        return false;
    });
        
    // Pass through any requests for application files, so these are still allowed.
    // $httpBackend.whenGET("client/data/sellers.json").passThrough();
    $httpBackend.whenGET(/.*/).passThrough();
    
    $http.get("data/sellers.json").then((result: any) => {
        sellers = result.data;
    });
}

angular.module("buyCoApp.services").run(mockRun);
