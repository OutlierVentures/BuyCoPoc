import server = require('./server');

var theServer = new server.Server();
var theApp = theServer.createApp();

theServer.run(theApp);