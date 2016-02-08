BuyerResourceMockRun.$inject = ["$httpBackend", "$http", "_"];

function BuyerResourceMockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic) : void {
    // Mock only if the 'ngMockE2E' module is loaded (or 'ngMock').
    if (!$httpBackend.whenGET) {
        return;
    }
    console.log("The 'ngMockE2E' module is declared as a dependency, so mocking teh thingz (buyer things).");

    var buyers: Buyer[];
    const buyerUrl = apiUrl + "/buyer";
    const editingRegex = new RegExp(buyerUrl + "/w*", 'i');
    
    $httpBackend.whenGET(buyerUrl).respond(function(method, url, data) {
        return [200, buyers, {}];
    });
    
    $httpBackend.whenGET(editingRegex).respond(function (method, url, data) {
        const externalIdFromUrl = url.split('/').pop();
        if (!externalIdFromUrl) {
            return [500, `No buyer id in url`, {}];
        }
        const buyer: IBuyer = _.find(buyers, (buyer: IBuyer) => { return buyer.userExternalId === externalIdFromUrl; });
        return buyer ? [200, buyer, {}] : [200, {}, {}];
        // return buyer ? [200, buyer, {}] : [200, `No buyer with name ${externalIdFromUrl}`, {}];
    });
    
    $httpBackend.whenPOST(editingRegex).respond(function (method, url, data) {
        alert('Currently the backend is mocked so you cannot save. This should only happen in the test environment');
        return false;
    });
        
    // Pass through any other requests, so things still work :).
    $httpBackend.whenGET(/.*/).passThrough();
    $httpBackend.whenPOST(/.*/).passThrough();
    
    $http.get("data/buyers.json").then((result: any) => {
        buyers = result.data;
    });
}

angular.module("buyCoApp.services").run(BuyerResourceMockRun);
