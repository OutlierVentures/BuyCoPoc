var path = require('path');
function index(req, res) {
    var fullPath = path.resolve('client/index.html');
    res.sendFile(fullPath);
}
exports.index = index;
;
//# sourceMappingURL=index.js.map