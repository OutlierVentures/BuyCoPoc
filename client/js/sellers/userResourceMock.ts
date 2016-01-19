// var mockResource = angular
//     .module("userResourceMock",
//         ["ngMockE2E"]);
// 
// mockResource.run(mockRun);
// 
// mockRun.$inject = ["$httpBackend", "$http", "_"];
// function mockRun($httpBackend: ng.IHttpBackendService, $http: ng.IHttpService, _: UnderscoreStatic) : void {
//     var users: IUser[];
//     $http.get("client/data/users.json").then((result: any) => {
//         users = result.data;
//     });
//     const sellerUrl = "/api/users";
//     $httpBackend.whenGET(sellerUrl).respond(users);
// 
//     const editingRegex = new RegExp(sellerUrl + "/w+/i", '');
//     $httpBackend.whenGET(editingRegex).respond(function (method, url, data) {
//         const externalIdFromUrl = url.split('/').pop();
//         if (!externalIdFromUrl) {
//             return [500, `no user id in url`, {}];
//         }
//         // var seller: Seller = _.find(sellers, (seller: Seller) => { return seller.userExternalId === externalIdFromUrl; };
//         const user: IUser = _.find(users, (user: IUser) => { return user.externalId === externalIdFromUrl; });
//         return user ? [200, user, {}] : [500, `no user with id ${externalIdFromUrl}`, {}];
//     });
// 
//     // Catch all for testing purposes
//     $httpBackend.whenGET(/api\/users/).respond(function(method, url, data) {
//         return [200, users, {}];
//     });
// }
// 
