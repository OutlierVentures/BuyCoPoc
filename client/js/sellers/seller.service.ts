import sellerModel = require("../../../models/sellerModel");

export interface IDataAccessService {
    getSellerResource(): ng.resource.IResourceClass<ISellerResource>;
}

export interface ISellerResource
    extends ng.resource.IResource<sellerModel.ISeller> {
}

export class SellerService implements IDataAccessService {
    static $inject = ["$resource"];
    constructor(private $resource: ng.resource.IResourceService) {
    }

    getSellerResource(): ng.resource.IResourceClass<ISellerResource> {
        return this.$resource("/api/sellers/:sellerId");
    }
}

angular.module("buyCoApp").service("SellerService", SellerService);
