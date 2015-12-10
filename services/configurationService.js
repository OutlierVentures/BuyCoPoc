var fs = require('fs');
var cachedConfig;
var ConfigurationService = (function () {
    function ConfigurationService() {
        this.getConfiguration = function () {
            if (cachedConfig)
                return cachedConfig;
            /*************** Configuration ********************/
            var CONFIG_FILE = './config.json';
            var config;
            var configString;
            // We don't use fs.exists() to try to read the file; the recommended method is just opening and
            // handling an error: https://nodejs.org/api/fs.html#fs_fs_exists_path_callback
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
            // Strip the BOM character as readFileSync doesn't do that.
            configString = configString.replace(/^\uFEFF/, '');
            try {
                // Parse config file.
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