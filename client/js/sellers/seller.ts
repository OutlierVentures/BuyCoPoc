/**
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
    countryCode: string;
    telephone: string;
    region: string;
    regionCode: string;
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

// TODO BW dd 2016-01-17: Move to `common/country-region.js` for possible reuse.

interface ICountry {
    name: string;
    filename: string;
    code: string;
    continent: string;
}


class Country implements ICountry {
    name: string;
    filename: string;
    code: string;
    continent: string;
}

interface IRegion {
    name: string;
    code: string;
}

class Region implements IRegion {
    name: string;
    code: string;
}

//END TODO BW
