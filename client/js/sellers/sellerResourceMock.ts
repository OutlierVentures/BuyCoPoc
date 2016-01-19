mockRun.$inject = ["$httpBackend", "$http", "_"];

function mockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic) : void {
    if (!$httpBackend.whenGET) {
        console.log("Cannot use $httpBackend.whenGet! The 'ngMockE2E' module is probably not declared as a dependency. Exiting.");
        return;
    }
    var sellers: Seller[];
    const sellerUrl = "/api/seller";
    const editingRegex = new RegExp(sellerUrl + "/w*", 'i');
    
    // Catch all for testing purposes
    $httpBackend.whenGET(sellerUrl).respond(function(method, url, data) {
        return [200, sellers, {}];
    });
    
    $httpBackend.whenGET(editingRegex).respond(function (method, url, data) {
        const externalIdFromUrl = url.split('/').pop();
        if (!externalIdFromUrl) {
            return [500, `No seller id in url`, {}];
        }
        // var seller: Seller = _.find(sellers, (seller: Seller) => { return seller.userExternalId === externalIdFromUrl; };
        // let _ = underscoreService;
        const seller: ISeller = _.find(sellers, (seller: ISeller) => { return seller.userExternalId === externalIdFromUrl; });
        return seller ? [200, seller, {}] : [200, {}, {}];
        // return seller ? [200, seller, {}] : [200, `No seller with name ${externalIdFromUrl}`, {}];
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
