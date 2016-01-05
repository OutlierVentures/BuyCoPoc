import Seller = require("../../../models/sellerModel");

var mockResource = angular
    .module("sellerResourceMock",
        ["ngMockE2E"]);

mockResource.run(mockRun);
    
mockRun.$inject = ["$httpBackend"];
function mockRun($httpBackend: ng.IHttpBackendService) : void {
    var sellers: Seller.ISeller[] = [];
    var seller: Seller.ISeller.IProduct;

    seller = new Seller(1, "Leaf Rake", "GDN-0011", new Date(2009, 2, 19), 19.95,
        "Leaf rake with 48-inch wooden handle.",
        "http://openclipart.org/image/300px/svg_to_png/26215/Anonymous_Leaf_Rake.png");
    sellers.push(product);

    var productUrl = "/api/products";

    $httpBackend.whenGET("/api/sellers").respond(sellers);

    var editingRegex = new RegExp(productUrl + "/[0-9][0-9]*", '');
    $httpBackend.whenGET(editingRegex).respond(function(method, url, data) {
        var product = { "productId": 0 };
        var parameters = url.split('/');
        var length = parameters.length;
        var id = +parameters[length - 1];

        if (id > 0) {
            for (var i = 0; i < products.length; i++) {
                if (products[i].productId == id) {
                    product = products[i];
                    break;
                }
            }
        }
        return [200, product, {}];
    });

    // Catch all for testing purposes
    $httpBackend.whenGET(/api/).respond(function(method, url, data) {
        return [200, products, {}];
    });
                
    // Pass through any requests for application files
    $httpBackend.whenGET(/app/).passThrough();
}

