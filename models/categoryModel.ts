interface ICategoryBase {
    name: string;
    totalProposalCount: number;
    /**
     * URL of the main category image, relative to /api/. For example "category/data/Food%20and%20drink/main.jpg"
     */
    imageUrl: string;
}

/**
 * A sub category of BuyCos, e.g. "Camera"
 */
export interface ISubCategory extends ICategoryBase {

}

/**
 * A main category of BuyCos, e.g. "Electronics"
 */
export interface IMainCategory extends ICategoryBase{    
    subCategories: ISubCategory[];
}

// TODO: move function to convert string representation "[main] - [sub]" back and forth here.