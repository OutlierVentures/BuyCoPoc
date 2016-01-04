import request = require('request');
import sellerModel = require('../models/sellerModel');
import configurationService = require('./configurationService');
import Q = require('q');

interface IBigNumber {
    toNumber(): number
}

export class ProposalService {
    config = new configurationService.ConfigurationService().getConfiguration();

    constructor() {
    }

    /**
     * Save seller.
     */
    save(): Q.Promise<Array<sellerModel.ISeller>> {
        var deferred = Q.defer<Array<sellerModel.ISeller>>();
        var t = this;

        user.save(function(saveErr, saveRes) {
            if (saveErr) {
                res.status(500).json({
                    "error": saveErr,
                    "error_location": "saving user data",
                    "status": "Error",
                });
            } else {
                res.status(200).json(saveRes);
            }
        });

        return deferred.promise;
    }

}