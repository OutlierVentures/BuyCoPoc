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

/**
 * Return message type as bootstrap class. 
 * @param type Enum MessageType, for instance Succes.
 * @returns bootstrap class as string, for instance 'alert-success'.
 */
var messageTypeAsBsClass: (type: MessageType) => string = (type) => {
    return `alert-${MessageType[type]}`;
};

class SellerSignupController implements ISellerSignUp {
    seller: Seller;
    message: string;
    messageType: MessageType;
    private sellerResource: ISellerResourceClass;

    static $inject = [
        "$rootScope",
        "$http",
        "$location",
        "$route",
        "identityService",
        "dataAccessService"
    ];

    constructor(
        private $rootScope: BuyCoRootScope,
        private $http: ng.IHttpService,
        private $location: ng.ILocationService,
        private $route: ng.route.IRouteService,
        private identityService: IdentityService,
        private dataAccessService: IDataAccessService
    ) {
        this.message = "test";
        this.messageType = MessageType.Success;
        let creds: ICredentials = { accessToken: this.$rootScope.userInfo.accessToken, externalId: this.$rootScope.userInfo.externalId }
        this.sellerResource = this.dataAccessService.getSellerResource(creds);
        this.getSeller();
        this.$rootScope.$on("loggedOn", (event: any, data: any) => {
        });
    }

    getSeller() {
        if (this.$rootScope.userInfo) {
            this.sellerResource.get(
                { },
                (data: Seller) => {
                    if (data) {
                        alert(`seller has Mongo data: ${data}`);
                        this.seller = data;
                    } else {
                        // User doesn't exist yet, initialize seller object with on user info
                        // Set isActive to true, as the user will sign up as active seller if he saves the form.
                        this.seller = new Seller(this.$rootScope.userInfo.externalId, this.$rootScope.userInfo.email, true);
                    }
                },
                (httpResponse: any) => {
                    console.log(httpResponse);
                    alert(`error getting seller: ${httpResponse}`);
                }
            );
        }
    }

    messageClass() {
        return messageTypeAsBsClass(this.messageType);
    };

    signUp() {
        var t = this;
        t.sellerResource.save(
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
        // alert("signing up");
        /*
        this.$http({
            method: "POST",
            url: apiUrl + "/seller/signup",
            headers: { AccessToken: t.$rootScope.userInfo.accessToken }
        }).success((resultData: any) => {
            this.statusMessage = "Signed up as seller.";
            this.seller = resultData;
        }).error((error) => {                
            // Handle error.
            console.log("Error signing up:");
            console.log(error);

            // TODO: show notification
            this.statusMessage = error;
        });
        */
    }
}

angular.module("buyCoApp")
.controller("SellerSignupController", SellerSignupController);
