import express = require('express');
import cachedProposalService = require('../../services/cachedProposalService');

export class CacheController {

    constructor() {
    }

    public update(req: express.Request, res: express.Response) {
        var cps = new cachedProposalService.CachedProposalService();
        cps.initialize()
            .then(result => {
                return cps.ensureMongoCache();
            }, err => {
                res.status(500).json({
                    "status": "Error",
                    "location": "initializing CachedProposalService",
                    "error": err
                });
                return null;
            })
            .then(result=> {
                res.status(200).json(result);
            }, err => {
                res.status(500).json({
                    "status": "Error",
                    "location": "updating proposal cache",
                    "error": err,
                });
            });
    };

    public fullRefresh(req: express.Request, res: express.Response) {
        var cps = new cachedProposalService.CachedProposalService();
        
        // TODO: remove duplication of calls to initialize, ensureMongoCache as in update().
        cps.initialize()
            .then(result => {
                return cps.clearMongoCache();
            }).then(result => {
                return cps.ensureMongoCache();
            }, err => {
                res.status(500).json({
                    "status": "Error",
                    "location": "initializing CachedProposalService",
                    "error": err
                });
                return null;
            })
            .then(result=> {
                res.status(200).json(result);
            }, err => {
                res.status(500).json({
                    "status": "Error",
                    "location": "updating proposal cache",
                    "error": err,
                });
            });
    };

}

