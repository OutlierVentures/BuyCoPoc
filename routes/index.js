var path = require('path');
function index(req, res) {
    // TODO: check whether we already have an authorization token for the user.
    var fullPath = path.resolve('client/index.html');
    res.sendFile(fullPath);
}
exports.index = index;
;
//# sourceMappingURL=index.js.map