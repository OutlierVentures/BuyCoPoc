export interface IApplicationConfig {
    "useStubs": boolean,
    "server": {
        "httpPort": number,
        "httpsPort": number,
        "baseUrl": string
    },
    "database": {
        "url": string
    },
    "uphold": {
        "app": {
            "clientID": string,
            "clientSecret": string
        },
        "vaultAccount": {
            "userName": string,
            "cardBitcoinAddress": string,
            "cardId": string
        }
    },
    "ethereum": {
        "jsonRpcUrl": string,
        "nodeUrl": string
    }
}
