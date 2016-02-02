import express = require("express");
import { ConfigurationService } from "../../services/configurationService";
import { IApplicationConfig } from "../../models/configModel";
var fs = require('fs');
// var packageFile = require("../package.json");
// import fs = require("fs"); 

/**
 * Get some configuration.
 * Created to allow getting the 'useStubs' setting in config from the client side. 
 * Please note NEVER to return sensitive data like passwords, or even DB url's here.
 */

export interface IConfigurationController {
    useStubs(req: express.Request, res: express.Response): void;
    getVersion(req: express.Request, res: express.Response): void;
    getEthereumJsonRpcUrl(req: express.Request, res: express.Response): void;
}

export class ConfigurationController implements IConfigurationController {
    private config: IApplicationConfig;

    constructor() {
        this.config = new ConfigurationService().getConfiguration();
    }

    useStubs = (req: express.Request, res: express.Response) => {
        res.send(200, this.config.useStubs);
    };

    getVersion = (req: express.Request, res: express.Response) => {
        // Might, but doesn't work (Mac only?):
        // var version = process.env.npm_package_version;
        // res.send(version);
        
        // Should work with Node>v0.12, but doesn't:
        // var packageFile = require("./package.json"); 
        // var packageInfo = JSON.parse(packageFile);
        // res.send(packageInfo.version);
        
        var json = JSON.parse(fs.readFileSync('package.json', 'utf8'));
        var version = json.version;
        res.send(version);
    };

    getEthereumJsonRpcUrl = (req: express.Request, res: express.Response) => {
        var url: string;

        // If the Ethereum node is wrapped in a HTTPS proxy, we present
        // that URL for clients to connect to.
        if (this.config.ethereum.httpsProxy)
            url = this.config.server.baseUrl + ":" + this.config.ethereum.httpsProxy.port;
        else
            // If no HTTPS wrapper, pass the plain JSON RPC URL as we know it.
            this.config.ethereum.jsonRpcUrl;

        res.send(url);
    };
}

