interface IDataAccessService {
    getSellerResource(creds: ICredentials): ng.resource.IResourceClass<ISellerResource>;
}

interface ISellerResource
    extends ng.resource.IResource<ISeller> {
}

interface ISellerResourceClass extends
    ng.resource.IResourceClass<ISellerResource> {
}

interface ICredentials {
    externalId: string
    accessToken: string
}


class DataAccessService implements IDataAccessService {
    static $inject = ["$resource"];
    constructor(private $resource: ng.resource.IResourceService) {
    }

    getSellerResource(creds: ICredentials): ng.resource.IResourceClass<ISellerResource> {
        // const result2 = this.$resource("/api/seller/:sellerId");
        const result = this.$resource("/api/seller", { }, {
            get: {
                method: "GET",
                headers: creds
            },
            post: {
                method: "POST",
                headers: creds
            }
        });
        return result;
    };
}

angular
    .module("buyCoApp")
    .service("dataAccessService", DataAccessService);
