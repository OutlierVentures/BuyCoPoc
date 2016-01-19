import request = require('request');
import { SellerRepository, ISeller } from "../models/sellerModel";
import configurationService = require('./configurationService');
import { Promise } from "q";

// TODO BW dd. 2016-01-14: I don't know if this service is useful, since it now maps directly to SellerRepository, without adding anything. 
class SellerService {
    constructor(
        private sellerRepo: SellerRepository,
        private config,
        create: (seller: ISeller) => Promise<ISeller>,
        update) {
            sellerRepo = new SellerRepository();
            config = new configurationService.ConfigurationService().getConfiguration();
            create = this.sellerRepo.create;
            update = this.sellerRepo.update;
    }
}

//     /**
//      * Create seller.
//      */
//     create(seller: ISeller): Q.Promise<ISeller> {
//         return sellerRepo.create(seller);
//     }
// 
//     /**
//      * Update seller.
//      */
//     update(seller: ISeller): Q.Promise<ISeller> {
//         return sellerRepo.update(seller);
//     }
// }