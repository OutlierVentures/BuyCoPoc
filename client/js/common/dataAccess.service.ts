module buyCo.Common {
    export interface IDataAccessService {
        getSellerResource(accessToken: string): ng.resource.IResourceClass<ISellerResource>;
    }

    export interface ISellerResource
        extends ng.resource.IResource<Models.ISeller> {
    }

    export interface ISellerResourceClass extends
        ng.resource.IResourceClass<ISellerResource> {
    }

    export class DataAccessService implements IDataAccessService {
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
} 