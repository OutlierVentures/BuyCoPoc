interface ISellerSignUp {
    seller: Seller;
    signUp(): void;
}

enum MessageType {  // Bootstrap classes.
    Success = 0,
    Info = 1,
    Warning = 2,
    Danger = 3
};

enum DisplayMode {
    Add = 0,
    Read = 1,
    Edit = 2
};

// Set the properties on scope that have a $watch
// (not the other props, as we don't use $scope but controller-as syntax).
interface ISellerSignupScope extends ng.IScope {
    currentCountryCode: string;
    currentRegionCode: string;
    messageType: string;
}

class SellerSignupController implements ISellerSignUp {
    displayMode: DisplayMode;
    seller: ISeller;
    countries: ICountry[];
    currentCountry: ICountry;
    currentCountryCode: string;
    regions: IRegion[];
    currentRegion: IRegion;
    currentRegionCode: string;
    message: string;
    messageClass: string;
    
    private messageType: MessageType;
    private sellerResource: ISellerResourceClass;
    private countryResource: ICountryResourceClass;
    private regionResource: IRegionResourceClass;
    private static defaultCountryCode: string = "GB";

    static $inject = [
        "$scope",
        "$rootScope",
        "$q",
        "dataAccessService",
        "_"
    ];

    constructor(
        private $scope: ISellerSignupScope,
        private $rootScope: BuyCoRootScope,
        private $q: ng.IQService,
        private dataAccessService: IDataAccessService,
        private _: UnderscoreStatic
    ) {
        this.displayMode = DisplayMode.Add; 
        let creds: ICredentials = { accessToken: this.$rootScope.userInfo.accessToken, externalId: this.$rootScope.userInfo.externalId };
        this.sellerResource = this.dataAccessService.getSellerResource(creds);
        this.countryResource = this.dataAccessService.getCountryResource();
        this.getCountries()
        .then(this.getSeller)
        .then(this.getRegions).
        catch((err) => {
            this.setError(err);
        });
        
        
        // Watch the currentCountryCode and then update current country if it is changed. 
        this.$scope.$watch(() => { return this.currentCountryCode; }, (newValue, oldValue) => {
            if (this.countries && (!this.currentCountry || newValue !== oldValue)) {
                this.setCurrentCountry(newValue);
            }
        });
        
        // Also watch the current region code.
        this.$scope.$watch(() => { return this.currentRegionCode; }, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.setCurrentRegion(newValue);
            }
        });
        
        // And message type, to update the messageClass used in the view.
        this.$scope.$watch(() => { return this.messageType; }, (newValue, oldValue) => {
            if (newValue && (!this.messageClass || newValue !== oldValue)) {
                this.messageClass = this.messageTypeAsBsClass(this.messageType);
            }
        });
        
        this.$rootScope.$on("loggedOn", (event: any, data: any) => {
            this.messageType = MessageType.Success;
            this.message=`Welcome ${this.$rootScope.userInfo.name}!`;
        });
               
        // Test the message box.
        // this.message = "Testing 1, 2, 3...";
        // this.messageType = MessageType.Success;
    }
    
    /** Shows the given error message on screen (with style 'danger'.) */
    setError(error: string) {
        if (error) {
            this.messageType = MessageType.Danger;
            this.message=error;
        }
    }
    
    setCurrentCountry(countryCode: string) {
        if (countryCode && this.countries) {
            this.currentCountryCode=countryCode;
            let oldCountryCode = this.currentCountry; 
            this.currentCountry = _.find(this.countries, (country: ICountry) => {
                return country.code === countryCode;
            });
            if (!this.currentCountry) {
                this.setError(`No country found with code ${countryCode}`);
            }
            
            // Update the regions dropdown and reset the region value if the country changed.
            this.getRegions();
            if (oldCountryCode !== this.currentCountry) {
                this.currentRegion = null;
            }
        }
    }

    setCurrentRegion(regionCode: string) {
        if (regionCode && this.regions) {
            this.currentRegionCode = regionCode;
            this.currentRegion = _.find(this.regions, (region: IRegion) => {
                return region.code === regionCode; 
            });
            if (!this.currentRegion) {
                this.setError(`No region found with code ${regionCode}`);
            }
        }
    }
    
    getSeller() {
        return this.$q((resolve, reject) => {
            if (this.$rootScope.userInfo) {
                this.sellerResource.get(
                    { },
                    (data: ISeller) => {
                        if (data) {
                            this.seller = data;
                            this.loadCountryAndRegionDropdown();
                        } else {
                            // User doesn't exist yet, initialize seller object with on user info
                            // Set isActive to true, as the user will sign up as active seller if he saves the form.
                            this.seller = new Seller(this.$rootScope.userInfo.externalId, this.$rootScope.userInfo.email, true);
                            this.seller.countryCode = SellerSignupController.defaultCountryCode;
                            this.loadCountryAndRegionDropdown();
                        }
                        resolve();
                    },
                    (httpResponse: any) => {
                        console.log(httpResponse);
                        let errorMessage = `Error getting seller: ${httpResponse}`;
                        reject(errorMessage);
                    }
                );
            }
        });
    }
    
    getCountries() {
        return this.$q((resolve, reject) => {
            try {
                this.countryResource.query((result: ICountry[]) => {
                    this.countries = result;
                    resolve();
                }, (err: any) => {
                    this.messageType = MessageType.Danger;
                    this.message = err;
                });
            } catch (err) {
                reject(err);
            }
        });
    };

    getRegions() {
        return this.$q((resolve, reject) => {
            // Retrieve the regions (only if the user has selected a country).
            if (this.currentCountry) {
                try {
                    this.regionResource = this.dataAccessService.getRegionResource(this.currentCountry.filename);
                    this.regionResource.query((result: IRegion[]) => {
                        this.regions = result;
                        resolve();
                    }, (err: any) => {
                        // this.setError(err);
                        reject(err);
                    });
                } catch (err) {
                    reject(err);
                    // this.setError(err)
                }
            }
        });
    }

    signUp() {
        if (!this.seller) {
            this.setError("Error on save.");
            return;
        }
        // Assign selected country and region from dropdown to string field.
        this.saveCountryAndRegionString();
         
        this.sellerResource.save(
            this.seller,
            (data: any) => {
                alert(`success: ${data}`);
                this.message = 'You signed up as seller';
                this.messageType = MessageType.Success;
            },
            (httpResponse) => {
                alert(`fail: ${httpResponse}`);
                this.message = httpResponse.message;
                this.messageType = MessageType.Danger;
            });
    }
    
    // TODO BW dd. 2016-01-16: Refactor message box to directive for reuse on other screens.
    resetMessage() {
        this.message = ""; 
    }
 
    /* Return message type as bootstrap class. 
    * @param type Enum MessageType, for instance Succes.
    * @returns bootstrap class as string, for instance 'alert-success'.
    */   
    private messageTypeAsBsClass(type: MessageType) {
        let typeString = MessageType[type].toString().toLowerCase();
        let result = `alert-${typeString}`;
        return result;
    };
    
    private saveCountryAndRegionString() {
        this.seller.country = this.currentCountry.name;
        this.seller.region = this.currentRegion.name;
    }
    
    private loadCountryAndRegionDropdown() {
        this.setCurrentCountry(this.seller.countryCode);
        this.setCurrentRegion(this.seller.regionCode);
    }
}

angular.module("buyCoApp")
.controller("SellerSignupController", SellerSignupController);
