import { UteObjects } from "./object";

/**
 * Ute Storage API Query
 * @prop {@link UteApis.method | method}?: `string` - Custom method on the server
 * @prop {@link UteApis.table | table}?: `string` - Table name
 * @prop {@link UteApis.select | select}?: `string[] | UteObjects` - columns to select from table + ref table (only if `noref: false`) OR object with new data
 * @prop {@link UteApis.where | where}?: `UteObjects` - Where condition
 * @prop {@link UteApis.order | order}?: `UteObjects` - Values to order returned data from table
 * @prop {@link UteApis.limit | limit}?: `UteObjects` - Limit number of returned values
 * @prop {@link UteApis.noref | noref}?: `boolean` - Do not add REFERENSE tables to query result *IF IT ISSETS*
 * @prop {@link UteApis.user | user}?: `boolean` - User uuid for UserStamp
 */
export interface UteApis<T = any> {
    /**
     * Calls custom method on the server, does't interact with the database directly</br>
     *
     * *`ATTENTION`: Block another fields*
     * @example {method: "method_name"}
     */
    method?: string;
    /**
     * Table name</br>
     *
     * *`ATTENTION`: Not work with `method`*
     * @example {table: "table_name"}
     */
    table?: string;
    /**
     * Columns to select from table + ref table (only if `noref: false`) OR object with new data</br>
     *
     * *`ATTENTION`: Not work with `method`*
     * @example { select: ["column1", "column2"] }
     * @example { select: { table1: ["column1", "column2"] }, reftable: ["column1"] }
     * @example { select: { column1: value1, column2: value2 } }
     */
    select?: T | T[] | UteObjects | string;
    /**
     * Where condition. Allows cond: `AND, NOT, OR, IN, NOT IN, BETWEEN, NOT BETWEEN, LIKE, NOT LIKE`</br>
     *
     * *`ATTENTION`: Not work with `method`*
     * @example
     */
    where?: UteObjects;
    /**
     * Values to order returned data from table. Default `desc: false | null` => `ASC`</br>
     * - column - Name of column
     * - desc - Use `DESC`, default `ASC`
     *
     * *`ATTENTION`: Not work with `method`*
     * @example { order: [ [ column: string, desc: boolean ] ] }
     * @example { order: [ ["column1"], [ "column2", true ] ] }
     */
    order?: any[];
    /**
     * Limit number of returned values. [ limit, step ]
     * - limit - number of values to return
     * - step - start index
     * @example { limit: [ 10, 5 ] }
     */
    limit?: number[];
    /**
     * Do not add REFERENSE tables to query result *IF IT ISSETS*</br>
     *
     * *`ATTENTION`: Not work with `method`*
     */
    noref?: boolean;
    /**
     * User uuid for UserStamp
     */
    user?: string;
}
