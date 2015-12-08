var mongoose = require("mongoose");
/**
 * Membership token of the user for a specific circle.
 */
// Circle membership is stored in the user document itself, not in a separate collection. To be able
// to work with this in a productive, typesafe manner we define it as a class. That way a circle
// membership can be created like so:
//  var cm = new CircleMembership();
//  cm.circleId = "12345";
//  myUser.circleMemberships.push(cm);
var CircleMembership = (function () {
    function CircleMembership() {
    }
    return CircleMembership;
})();
exports.CircleMembership = CircleMembership;
exports.userSchema = new mongoose.Schema({
    name: String,
    externalId: String,
    accessToken: String,
    // In the schema we use the shorthand syntax for schema, as we don't need access to the Schema object itself.
    // The Schema is only a necessity to let Mongoose do its magic.
    // http://stackoverflow.com/a/16493881/81949
    circleMemberships: [{
            circleId: mongoose.Schema.Types.ObjectId,
            startDate: Date,
            endDate: Date
        }]
});
/**
 * An individual user of the system, authenticated on one or more authentication providers.
 */
exports.User = mongoose.model("Users", exports.userSchema);
/**
 * Get a user by their access token.
 */
exports.getUserByAccessToken = function (token, cb) {
    exports.User.findOne({ accessToken: token }, function (err, user) {
        // TODO: use promise to wait for creating new user.
        if (!user) {
            // No user with this token.
            cb("Not found", null);
        }
        // TODO: check for validity of the token.
        cb(null, user);
    });
};
/**
 * Gets the users who are in a certain circle.
 */
exports.getUsersInCircle = function (circleId, cb) {
    exports.User.find({})
        .where("circleMemberships.circleId").equals(circleId)
        .exec(cb);
};
//# sourceMappingURL=userModel.js.map