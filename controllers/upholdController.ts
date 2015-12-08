import express = require("express");
import _ = require('underscore');
import upholdService = require("../services/upholdService");
import serviceFactory = require('../services/serviceFactory');

export class UpholdController {
    getCards(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var brs = serviceFactory.createUpholdService(token);

        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500,
                    {
                        "status": "Error",
                        "error": err,
                    });
            } else {
                res.json(cards);
            }
        });
    }

    getCardsWithBalance(req: express.Request, res: express.Response) {
        var token = req.header("AccessToken");

        var brs = serviceFactory.createUpholdService(token);

        brs.getCards(function (err, cards) {
            if (err) {
                res.json(500,
                    {
                        "status": "Error",
                        "error": err,
                    });
            } else {
                // Extract cards with non-zero balance
                var cardsWithBalance = _(cards).filter((c) => {
                    return c.balance > 0;
                });

                res.json(cardsWithBalance);
            }
        });
    }
}