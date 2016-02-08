/**
* Buyer as a Typescript interface.
*/
interface IBuyer {
    userExternalId: string; // FK.
    isActive: Boolean;
    email: string;
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    countryCode: string;
    telephone: string;
    region: string;
    regionCode: string;
}

class Buyer implements IBuyer {
    dateCreated: Date;
    dateUpdated: Date;
    company: string;
    addressLine1: string;
    addressLine2: string;
    postalCode: string;
    city: string;
    country: string;
    countryCode: string;
    telephone: string;
    region: string;
    regionCode: string;
    
    constructor(
        public userExternalId: string, // FK.
        public email: string,
        public isActive: Boolean) {
    }
}
