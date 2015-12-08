var fs = require('fs');
var cachedConfig;
var ConfigurationService = (function () {
    function ConfigurationService() {
        this.getConfiguration = function () {
            if (cachedConfig)
                return cachedConfig;
            var CONFIG_FILE = './config.json';
            var config;
            var configString;
            try {
                configString = fs.readFileSync(CONFIG_FILE, 'utf8');
            }
            catch (e) {
                try {
                    CONFIG_FILE = './config.default.json';
                    configString = fs.readFileSync(CONFIG_FILE, 'utf8');
                }
                catch (e2) {
                    console.log("Error while loading config file: " + e2);
                }
            }
            console.log("Using configuration from " + CONFIG_FILE);
            configString = configString.replace(/^\uFEFF/, '');
            try {
                config = JSON.parse(configString);
            }
            catch (e) {
                console.log("Error while parsing config file: " + e);
            }
            cachedConfig = config;
            return config;
        };
    }
    return ConfigurationService;
})();
exports.ConfigurationService = ConfigurationService;
//# sourceMappingURL=configurationService.js.map