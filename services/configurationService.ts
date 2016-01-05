import fs = require('fs');
import configModel = require('../models/configModel');

/**
 * Globally cached configuration. No way to invalidate it yet; config changes require restarting, 
 * and there's only one instance of the configuration.
 */
var cachedConfig: configModel.IApplicationConfig;

export class ConfigurationService {
    basePath = "./";

    getConfiguration = () => {
        if (cachedConfig)
            return cachedConfig;

        /*************** Configuration ********************/
        var CONFIG_FILE = this.basePath + 'config.json';
        var config: configModel.IApplicationConfig;
        var configString: string;

        // We don't use fs.exists() to try to read the file; the recommended method is just opening and
        // handling an error: https://nodejs.org/api/fs.html#fs_fs_exists_path_callback
        try {
            configString = fs.readFileSync(CONFIG_FILE, 'utf8');
        }
        catch (e) {
            try {
                CONFIG_FILE = this.basePath + 'config.default.json';
                configString = fs.readFileSync(CONFIG_FILE, 'utf8');
            }
            catch (e2) {
                console.log("Error while loading config file: " + e2);
                // TODO: exit with error. No run without a valid config.
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
            // TODO: exit with error. No run without a valid config.
        }
        cachedConfig = config;
        return config;
    }
}