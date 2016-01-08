var mockResource = angular
    .module("sellerResourceMock",
        ["ngMockE2E"]);

mockResource.run(mockRun);

mockRun.$inject = ["$httpBackend", "$http", "_"];
function mockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: any) : void {
    var sellers: Seller[];
    $http.get("client/data/sellers.json").then((result: any) => {
        sellers = result.data;
    });
    const sellerUrl = "/api/sellers";
    $httpBackend.whenGET(sellerUrl).respond(sellers);

    const editingRegex = new RegExp(sellerUrl + "/w+/i", '');
    $httpBackend.whenGET(editingRegex).respond(function (method, url, data) {
        const externalIdFromUrl = url.split('/').pop();
        if (!externalIdFromUrl) {
            return [500, `no seller id in url`, {}];
        }
        // var seller: Seller = _.find(sellers, (seller: Seller) => { return seller.userExternalId === externalIdFromUrl; };
        const seller: Seller = _.find(sellers, (seller: Seller) => { return seller.userExternalId === externalIdFromUrl; });
        return seller ? [200, seller, {}] : [500, `no seller with name ${externalIdFromUrl}`, {}];
    });

    // Catch all for testing purposes
    $httpBackend.whenGET(/api\/sellers/).respond(function(method, url, data) {
        return [200, sellers, {}];
    });
                
    // Pass through any requests for application files
    $httpBackend.whenGET(/app/).passThrough();
}

