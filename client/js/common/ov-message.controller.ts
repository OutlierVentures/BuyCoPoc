"use strict";

interface IMessageControllerScope extends ng.IScope {
    message: string;
    messageType: MessageType;
    messageClass: string;
    hasValidationError: boolean;
}

class OVMessageController {

    static $inject = ["$scope"];
    constructor(
        private $scope: IMessageControllerScope
    ) {
        this.$scope.hasValidationError = false;
        // And message type, to update the messageClass used in the view.
        this.$scope.$watch(() => { return this.$scope.messageType; }, (newValue, oldValue) => {
            if ((newValue || newValue===0) && (!this.$scope.messageClass || newValue !== oldValue)) {
            this.$scope.messageClass = this.messageTypeAsBsClass(this.$scope.messageType);
            }
        });
    }

    /** Clear the message (and hide the alert). */    
    resetMessage() {
        this.$scope.message = ""; 
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
}

angular.module("buyCoApp").controller('ovMessageController', OVMessageController);
