SellerResourceMockRun.$inject = ["$httpBackend", "$http", "_"];

function SellerResourceMockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic) : void {
    // Mock only if the 'ngMockE2E' module is loaded (or 'ngMock').
    if (!$httpBackend.whenGET) {
        return;
    }
    console.log("The 'ngMockE2E' module is declared as a dependency, so mocking teh thingz (seller things).");

    var sellers: Seller[];
    const sellerUrl = apiUrl + "/seller";
    const editingRegex = new RegExp(sellerUrl + "/w*", 'i');
    
    $httpBackend.whenGET(sellerUrl).respond(function(method, url, data) {
        return [200, sellers, {}];
    });
    
    $httpBackend.whenGET(editingRegex).respond(function (method, url, data) {
        const externalIdFromUrl = url.split('/').pop();
        if (!externalIdFromUrl) {
            return [500, `No seller id in url`, {}];
        }
        const seller: ISeller = _.find(sellers, (seller: ISeller) => { return seller.userExternalId === externalIdFromUrl; });
        return seller ? [200, seller, {}] : [200, {}, {}];
        // return seller ? [200, seller, {}] : [200, `No seller with name ${externalIdFromUrl}`, {}];
    });
    
    $httpBackend.whenPOST(editingRegex).respond(function (method, url, data) {
        alert('Currently the backend is mocked so you cannot save. This should only happen in the test environment');
        return false;
    });
        
    // Pass through any other requests, so things still work :).
    $httpBackend.whenGET(/.*/).passThrough();
    
    $http.get("data/sellers.json").then((result: any) => {
        sellers = result.data;
    });
}

angular.module("buyCoApp.services").run(SellerResourceMockRun);
