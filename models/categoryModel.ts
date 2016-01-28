interface ICategoryBase {
    name: string;
    totalProposalCount: number;
}

/**
 * A sub category of BuyCo's, e.g. "Camera"
 */
export interface ISubCategory extends ICategoryBase {

}

/**
 * A main category of BuyCo's, e.g. "Electronics"
 */
export interface IMainCategory extends ICategoryBase{    
    subcategories: ISubCategory[];
}

// TODO: move function to convert string representation "[main] - [sub]" back and forth here.