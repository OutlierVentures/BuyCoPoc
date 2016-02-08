import buyerModel = require("../../../models/buyerModel");

interface IDataAccessService {
    getBuyerResource(): ng.resource.IResourceClass<IBuyerResource>;
}

interface IBuyerResource
    extends ng.resource.IResource<buyerModel.IBuyer> {
}

class BuyerService implements IDataAccessService {
    static $inject = ["$resource"];
    constructor(private $resource: ng.resource.IResourceService) {
    }

    getBuyerResource(): ng.resource.IResourceClass<IBuyerResource> {
        return this.$resource("/api/buyers/:buyerId");
    }
}

angular.module("buyCoApp").service("BuyerService", BuyerService);