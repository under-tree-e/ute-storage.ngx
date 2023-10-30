import { UteObjects } from "@interfaces/object";

/**
 * Ute Storage API Query
 * @param {string} tb - Table name
 * @param {string[] | UteObjects} st - Select values
 * @param {UteObjects} wr - Where values
 */
export interface UteApis {
    tb?: string;
    st?: string[] | UteObjects;
    wr?: UteObjects;
}
