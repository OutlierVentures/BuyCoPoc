﻿/**
* Seller as a Typescript interface.
*/
interface ISeller {
    userExternalId: string; // FK.
    isActive: Boolean;
    email: string;
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressline2: string;
    postalCode: string;
    city: string;
    country: string;
    telephone: string;
    region: string;
}

class Seller implements ISeller {
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressline2: string;
    postalCode: string;
    city: string;
    country: string;
    telephone: string;
    region: string;

    constructor(
        public userExternalId: string, // FK.
        public email: string,
        public isActive: Boolean) {
    }
}
