var mongoose = require("mongoose");
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
    circleMemberships: [{
            circleId: mongoose.Schema.Types.ObjectId,
            startDate: Date,
            endDate: Date
        }]
});
exports.User = mongoose.model("Users", exports.userSchema);
exports.getUserByAccessToken = function (token, cb) {
    exports.User.findOne({ accessToken: token }, function (err, user) {
        if (!user) {
            cb("Not found", null);
        }
        cb(null, user);
    });
};
exports.getUsersInCircle = function (circleId, cb) {
    exports.User.find({})
        .where("circleMemberships.circleId").equals(circleId)
        .exec(cb);
};
//# sourceMappingURL=userModel.js.map