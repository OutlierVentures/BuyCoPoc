interface ISellerSignUp {
    seller: Seller;
    signUp(): void;
}

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
    isReadMode: boolean;
    isAddMode: boolean;
    isEditMode: boolean;
    displayModes: any;
    seller: ISeller;
    countries: ICountry[];
    currentCountry: ICountry;
    currentCountryCode: string;
    currentCountryRegionFilter: string;
    regions: IRegion[];
    currentRegion: IRegion;
    currentRegionCode: string;
    message: string;
    messageClass: string;
    form: ng.IFormController;

    private displayMode: DisplayMode;
    private messageType: MessageType;
    private sellerResource: ISellerResourceClass;
    private countryResource: ICountryResourceClass;
    private regionResource: IRegionResourceClass;
    private static defaultCountryCode: string = 'GB';

    static $inject = [
        '$scope',
        '$rootScope',
        '$q',
        'types',
        'dataAccessService',
        '_'
    ];

    constructor(
        private $scope: ISellerSignupScope,
        private $rootScope: BuyCoRootScope,
        private $q: ng.IQService,
        private types: any,
        private dataAccessService: IDataAccessService,
        private _: UnderscoreStatic
    ) {
        // this.displayMode = DisplayMode.Add;
        this.displayModes = DisplayMode;

        this.countryResource = this.dataAccessService.getCountryResource();

        // Watch the currentCountryCode and then update current country if it is changed. 
        this.$scope.$watch(() => { return this.currentCountryCode; }, (newValue, oldValue) => {
            if (this.countries && (!this.currentCountry || newValue !== oldValue)) {
                this.setCurrentCountry(newValue);
            }
        });

        this.setDisplayFlags();

        // Watch the displayMode and set the three boolean flags correctly when it changes.
        this.$scope.$watch(() => { return this.displayMode; }, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.setDisplayFlags();
            }
        });

        // Also watch the current region code.
        this.$scope.$watch(() => { return this.currentRegionCode; }, (newValue, oldValue) => {
            if (newValue !== oldValue) {
                this.setCurrentRegion(newValue);
            }
        });

        var t = this;
        this.$rootScope.$on("loggedOn", (event: any, data: any) => {
            if (!t.sellerResource) t.loadSellerResource();
        });

        if (this.$rootScope.userInfo)
            t.loadSellerResource();

        //// And watch the message type, to update the messageClass used in the view.
        //this.$scope.$watch(() => { return this.messageType; }, (newValue, oldValue) => {
        //    if ((newValue || newValue===0) && (!this.messageClass || newValue !== oldValue)) {
        //        this.messageClass = this.messageTypeAsBsClass(this.messageType);
        //    }
        //});

        this.getCountries()
            .then(() => {
                return this.getSeller();
            }).catch((err) => {
                return this.showMessage(err);
            });

        // Test the message box.
        // this.message = "Testing 1, 2, 3...";
        // this.messageType = MessageType.Success;
    }

    loadSellerResource() {
        let creds: ICredentials = { accessToken: this.$rootScope.userInfo.accessToken, externalId: this.$rootScope.userInfo.externalId };
        this.sellerResource = this.dataAccessService.getSellerResource(creds);
    }

    /** 
     * Shows the given message onscreen.
     * (default is error with Bootstrap style 'danger' if isError=true then style 'success'.)
     **/
    showMessage(message: string, isError = true) {
        let messageType = isError ? MessageType.Danger : MessageType.Success;
        if (message) {
            this.messageType = messageType;
            this.message = message;
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
                this.currentCountryRegionFilter = this.currentCountry.defaultSubdivision;
                // Get regions for newly selected country.
                this.getRegions();
            }
            this.currentCountryCode = countryCode;
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

    getSeller() {
        return this.$q((resolve, reject) => {
            if (this.$rootScope.userInfo) {
                this.sellerResource.get(
                    {},
                    (seller: ISeller) => {
                        if (seller.userExternalId) {
                            this.seller = seller;
                            this.loadCountryAndRegionDropdown();
                            this.displayMode = DisplayMode.Read;
                        } else {
                            // User doesn't exist yet, initialize seller object with on user info
                            // Set isActive to true, as the user will sign up as active seller if he saves the form.
                            this.seller = new Seller(this.$rootScope.userInfo.externalId, this.$rootScope.userInfo.email, true);
                            this.seller.countryCode = SellerSignupController.defaultCountryCode;
                            this.loadCountryAndRegionDropdown();
                            this.displayMode = DisplayMode.Add;
                        }
                        resolve(this.seller);
                    },
                    (httpResponse: any) => {
                        console.log(httpResponse);
                        const errorMessage = `Error getting seller: ${httpResponse}`;
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
                // Check if a (.json) filename is specified in the file to get the regions for this country from.
                if (!this.currentCountry.filename) {
                    // If no region file is available for this country then set regions to empty (region dropdown will be disabled or given default value in UI).
                    this.regions = null;
                    return;
                }
                try {
                    this.regionResource = this.dataAccessService.getRegionResource(this.currentCountry.filename);
                    this.regionResource.query((results: IRegion[]) => {
                        // Filter out any regions with wrong type from the result if a regionfilter was specified.
                        if (this.currentCountryRegionFilter) {
                            results = _.where(results, { 'subdivision': this.currentCountryRegionFilter });
                        }
                        this.regions = results;
                        resolve(results);
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
        if (this.form.$invalid) {
            angular.forEach(this.form.$error.required, function (field) {
                field.$setTouched();
            });
            this.showMessage("Some missing or invalid fields.");
            return;
        };
        if (!this.seller) {
            this.showMessage("Error on save.");
            return;
        }
        // Assign selected country and region from dropdown to string field.
        this.saveCountryAndRegionString();

        this.sellerResource.save(
            this.seller,
            (data: any) => {
                if (!this.$rootScope.userInfo.preferences) this.$rootScope.userInfo.preferences = <IUserPreferences>{};

                this.$rootScope.userInfo.preferences.perspective = 'seller';
                this.$rootScope.userInfo.sellerId = 'pending'; // For UX dependencies
                // alert(`success: ${data}`);
                this.seller = data.seller;
                this.showMessage('Your seller data was saved successfully.', false);
                this.displayMode = DisplayMode.Read;
            },
            (httpResponse) => {
                this.showMessage(httpResponse.message);
            });
    }

    // TODO BW dd. 2016-01-16: Refactor message box to directive for reuse on other screens.
    resetMessage() {
        this.message = '';
    }

    /* Return message type as bootstrap class. 
    * @param type Enum MessageType, for instance Succes.
    * @returns bootstrap class as string, for instance 'alert-success'.
    */
    //private messageTypeAsBsClass(type: MessageType) {
    //    let typeString = MessageType[type].toString().toLowerCase();
    //    let result = `alert-${typeString}`;
    //    return result;
    //};

    edit() {
        this.displayMode = DisplayMode.Edit;
        return false;
    }

    private saveCountryAndRegionString() {
        this.seller.country = this.currentCountry.name;
        this.seller.countryCode = this.currentCountry.code;
        // Save region if filled in.
        if (this.currentRegion) {
            this.seller.region = this.currentRegion.name;
            this.seller.regionCode = this.currentRegion.code;
        }
    }

    private loadCountryAndRegionDropdown() {
        this.setCurrentCountry(this.seller.countryCode);
        this.getRegions().
            then((result) => {
                this.setCurrentRegion(this.seller.regionCode);
            });
    }

    private setDisplayFlags() {
        this.isReadMode = this.displayMode === DisplayMode.Read;
        this.isAddMode = this.displayMode === DisplayMode.Add;
        this.isEditMode = this.displayMode === DisplayMode.Edit;
    }
}

angular.module("buyCoApp")
    .controller("SellerSignupController", SellerSignupController);
