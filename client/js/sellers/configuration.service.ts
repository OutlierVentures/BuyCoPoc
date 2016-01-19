interface IConfigurationService {
    getUseStubs(): ng.IPromise<boolean>;
    getVersion(): ng.IPromise<string>;
}

class ConfigurationService implements IConfigurationService {
    static $inject = ["$http", "$q"];
        constructor(
            private $http: ng.IHttpService,
            private $q: ng.IQService) {
    }

    getUseStubs() {
        return this.$q((resolve, reject) => {
             this.$http.get(apiUrl + "/config/usestubs")
             .then(result => {
                resolve(result.data);
             }).catch((err) => {
                reject(err);
            });
        });
    }
    
    getVersion() {
        return this.$q((resolve, reject) => {
            this.$http.get(apiUrl + "/config/getversion")
             .then(result => {
                resolve(result.data);
             }).catch((err) => {
                reject(err);
            });
        });
    }
}

angular.module("buyCoApp").service("configurationService", ConfigurationService);