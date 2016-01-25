/** Type aliases */
type AccessToken = string;
/** End type aliases */

enum MessageType {  // Bootstrap classes.
    Success = 0,
    Info = 1,
    Warning = 2,
    Danger = 3
};

let Types = {
   MessageType: MessageType 
}

angular.module("buyCoApp").constant("types", Types);