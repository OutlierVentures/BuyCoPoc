interface IWindowServiceWithUnderscore extends ng.IWindowService {
    _: UnderscoreStatic;
}
    
var underscoreService = function($window: IWindowServiceWithUnderscore) {
    return $window._;
}

// A typed version of the underscore library. 
underscoreService.$inject = ["$window"];
angular.module("buyCoApp.services").factory("_", underscoreService);

// BW I have tried but I think it's not possible to do this with an angular.service() and a Typescript 'class' instead.
// At least when I did that I ended up not being able to use simply '_' in the calling classes, but would have to use '_._', 'underscoreService._',
// or at define a local alias `const _ = underscoreService._` before every use, which somewhat defeats the purpose of naming the library underscore in the first place :S.
    
// class UnderscoreService  {    
//     public underscore: UnderscoreStatic;
//     static $inject = ["$window"];
//     constructor(private $window: IWindowServiceWithUnderscore) {
//         this.underscore = this.$window._;
//     }
// }
// var underscoreService = new UnderscoreService(..); //
// var _ = underscoreService.underscore;
// 
// angular.module("buyCoApp.services").service("_");
