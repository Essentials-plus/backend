import NodeCache from "node-cache";

export const appCache = new NodeCache({ stdTTL: 100 });

export const getProductsForProductsPageCacheKeyPreffix = "getProductsForProductsPage";
export const deleteProductsForProductsPageCache = () => {
  appCache.del(appCache.keys().filter((key) => key.startsWith(getProductsForProductsPageCacheKeyPreffix)));
};

export const getValidatedZipCodeInfoCacheKeyPreffix = "getValidatedZipCodeInfo";
export const deleteGetValidatedZipCodeInfoCache = () => {
  appCache.del(appCache.keys().filter((key) => key.startsWith(getValidatedZipCodeInfoCacheKeyPreffix)));
};
