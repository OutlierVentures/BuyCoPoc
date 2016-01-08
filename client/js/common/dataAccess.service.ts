interface IDataAccessService {
    getSellerResource(accessToken: string): ng.resource.IResourceClass<ISellerResource>;
}

interface ISellerResource
    extends ng.resource.IResource<ISeller> {
}

interface ISellerResourceClass extends
    ng.resource.IResourceClass<ISellerResource> {
}

class DataAccessService implements IDataAccessService {
    static $inject = ["$resource"];
    constructor(private $resource: ng.resource.IResourceService) {
    }

    getSellerResource(accessToken: string): ng.resource.IResourceClass<ISellerResource> {
        const result = this.$resource("/api/seller/:sellerId");
        const result2 = this.$resource("/api/seller/:sellerId", {
            post: {
                method: "POST",
                headers: { "AccessToken": accessToken }
            }
        });
        return result;
    };
}

angular
    .module("buyCoApp")
    .service("dataAccessService", DataAccessService);
