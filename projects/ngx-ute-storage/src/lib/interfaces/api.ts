import { UteObjects } from "./object";

/**
 * Ute Storage API Query
 * @prop {@link UteApis.table | table}?: `string` - Table name
 * @prop {@link UteApis.select | select}?: `string[] | UteObjects` - olumns to select from table + ref table (only if `noref: false`) OR object with new data
 * @prop {@link UteApis.where | where}?: `UteObjects` - Where condition
 * @prop {@link UteApis.order | order}?: `UteObjects` - Values to order returned data from table
 * @prop {@link UteApis.noref | noref}?: `boolean` - Do not add REFERENSE tables to query result *IF IT ISSETS*
 */
export interface UteApis {
    /**
     * Table name
     * @example {table: "table"}
     */
    table?: string;
    /**
     * Columns to select from table + ref table (only if `noref: false`) OR object with new data
     * @example { select: ["column1", "column2"] }
     * @example { select: { table1: ["column1", "column2"] }, reftable: ["column1"] }
     * @example { select: { column1: value1, column2: value2 } }
     */
    select?: string[] | UteObjects;
    /**
     * Where condition. Allows cond: `AND, NOT, OR, IN, NOT IN, BETWEEN, NOT BETWEEN, LIKE, NOT LIKE`
     * @example
     */
    where?: UteObjects;
    /**
     * Values to order returned data from table. Default `desc: false | null` => `ASC`
     * @example { order: [{ column: "column1", desc: true }] }
     * @example { order: [{ column: "column1"}, { column: column2, desc: true }] }
     */
    order?: UteObjects;
    /**
     * Do not add REFERENSE tables to query result *IF IT ISSETS*
     */
    noref?: boolean;
}
