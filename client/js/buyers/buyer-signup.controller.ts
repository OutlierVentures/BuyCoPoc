interface IBuyerSignUp {
    buyer: Buyer;
    signUp(): void;
}

// Set the properties on scope that have a $watch
// (not the other props, as we don't use $scope but controller-as syntax).
interface IBuyerSignupScope extends ng.IScope {
    currentCountryCode: string;
    currentRegionCode: string;
    messageType: string;
}

class BuyerSignupController implements IBuyerSignUp {
    displayMode: DisplayMode;
    displayModes: any;
    buyer: IBuyer;
    countries: ICountry[];
    currentCountry: ICountry;
    currentCountryCode: string;
    regions: IRegion[];
    currentRegion: IRegion;
    currentRegionCode: string;
    message: string;
    messageClass: string;
    form: ng.IFormController;
    
    private messageType: MessageType;
    private buyerResource: IBuyerResourceClass;
    private countryResource: ICountryResourceClass;
    private regionResource: IRegionResourceClass;
    private static defaultCountryCode: string = "GB";

    static $inject = [
        "$scope",
        "$rootScope",
        "$q",
        "types",
        "dataAccessService",
        "_"
    ];

    constructor(
        private $scope: IBuyerSignupScope,
        private $rootScope: BuyCoRootScope,
        private $q: ng.IQService,
        private types: any,
        private dataAccessService: IDataAccessService,
        private _: UnderscoreStatic
    ) {
        this.displayMode = DisplayMode.Add;
        this.displayModes = DisplayMode; 
        let creds: ICredentials = { accessToken: this.$rootScope.userInfo.accessToken, externalId: this.$rootScope.userInfo.externalId };
        this.buyerResource = this.dataAccessService.getBuyerResource(creds);
        this.countryResource = this.dataAccessService.getCountryResource();
        
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
            if ((newValue || newValue===0) && (!this.messageClass || newValue !== oldValue)) {
                this.messageClass = this.messageTypeAsBsClass(this.messageType);
            }
        });
        
        this.$rootScope.$on("loggedOn", (event: any, data: any) => {
            this.messageType = MessageType.Success;
            this.message=`Welcome ${this.$rootScope.userInfo.name}!`;
        });
           
        this.getCountries()
        .then(() => {
            return this.getBuyer();
        }).catch((err) => {
            return this.showMessage(err);
        });
            
        // Test the message box.
        // this.message = "Testing 1, 2, 3...";
        // this.messageType = MessageType.Success;
    }
    
    /** 
     * Shows the given message on screens
     * (default is error with Bootstrap style 'danger' if isError=true then style 'success'.)
     **/
    showMessage(message: string, isError = true) {
        let messageType = isError ? MessageType.Danger : MessageType.Success;
        if (message) { 
            this.messageType = messageType;
            this.message=message;
        }
    }
    
    setCurrentCountry(countryCode: string) {
        if (countryCode && this.countries) {
            let oldCountryCode = this.currentCountry; 
            this.currentCountry = _.find(this.countries, (aCountry) => {
                return aCountry.code === countryCode;
            });
            if (!this.currentCountry) {
                this.showMessage(`No country found with code ${countryCode}`);
            }
            
            // Update the regions dropdown and reset the region value if the country changed.
            if (oldCountryCode !== this.currentCountry) {
                // Reset current selected country.
                this.currentRegionCode = null;
                // Get regions for newly selected country.
                this.getRegions();
            }
            this.currentCountryCode=countryCode;
        }
    }

    setCurrentRegion(regionCode: string) {
        if (this.regions) {
            if (regionCode) {
                this.currentRegion = _.find(this.regions, (region: IRegion) => {
                    return region.code === regionCode; 
                });
            } else {
                this.currentRegion = null;
            }
            this.currentRegionCode = regionCode;
        }
    }
    
    getBuyer() {
        return this.$q((resolve, reject) => {
            if (this.$rootScope.userInfo) {
                this.buyerResource.get(
                    { },
                    (buyer: IBuyer) => {
                        if (buyer.userExternalId) {
                            this.buyer = buyer;
                            this.loadCountryAndRegionDropdown();
                            this.displayMode = DisplayMode.Read;
                        } else {
                            // User doesn't exist yet, initialize buyer object with on user info
                            // Set isActive to true, as the user will sign up as active buyer if he saves the form.
                            this.buyer = new Buyer(this.$rootScope.userInfo.externalId, this.$rootScope.userInfo.email, true);
                            this.buyer.countryCode = BuyerSignupController.defaultCountryCode;
                            this.loadCountryAndRegionDropdown();
                            this.displayMode = DisplayMode.Add;
                        }
                        resolve(this.buyer);
                    },
                    (httpResponse: any) => {
                        console.log(httpResponse);
                        let errorMessage = `Error getting buyer: ${httpResponse}`;
                        // throw new Error(errorMessage);
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
                        resolve(result);
                    }, (err: any) => {
                        reject(err);
                    });
                } catch (err) {
                    reject(err);
                }
            }
        });
    }

    signUp() {
        if(this.form.$invalid) {
            angular.forEach(this.form.$error.required, function(field) {
                field.$setTouched();
            });
            this.showMessage("Some missing or invalid fields.");
            return;
        };
        if (!this.buyer) {
            this.showMessage("Error on save.");
            return;
        }
        // Assign selected country and region from dropdown to string field.
        this.saveCountryAndRegionString();
         
        this.buyerResource.save(
            this.buyer,
            (data: any) => {
                if (!this.$rootScope.userInfo.preferences) this.$rootScope.userInfo.preferences = <IUserPreferences>{};

                this.$rootScope.userInfo.preferences.perspective = "buyer";            
                this.$rootScope.userInfo.buyerId = "pending"; // For UX dependencies
                // alert(`success: ${data}`);
                this.buyer = data.buyer;
                this.showMessage('Your buyer data was saved successfully', false);
                this.displayMode = DisplayMode.Read;
            },
            (httpResponse) => {
                this.showMessage(httpResponse.message);
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
        this.buyer.country = this.currentCountry.name;
        this.buyer.countryCode = this.currentCountry.code;
        // Save region if filled in.
        if (this.currentRegion) {
            this.buyer.region = this.currentRegion.name;
            this.buyer.regionCode = this.currentRegion.code;
        }
    }
    
    private loadCountryAndRegionDropdown() {
        this.setCurrentCountry(this.buyer.countryCode);
        this.getRegions().
        then((result) => {
            this.setCurrentRegion(this.buyer.regionCode);
        });
    }
}

angular.module("buyCoApp")
.controller("BuyerSignupController", BuyerSignupController);
