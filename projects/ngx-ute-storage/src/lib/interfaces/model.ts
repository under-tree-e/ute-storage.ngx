/**
 * Ute Storage Models Structure
 * @prop {@link UteStorageModels.type | type}: `UteModelTypes` - Field type
 * @prop {@link UteStorageModels.autoIncrement | autoIncrement}?: `boolean` - Use "Auto Increment" for field
 * @prop {@link UteStorageModels.primaryKey | primaryKey}?: `boolean` - Set field as "Primary Key"
 * @prop {@link UteStorageModels.allowNull | allowNull}?: `boolean` - Set field not allow "Empty" values
 * @prop {@link UteStorageModels.defaultValue | defaultValue}?: `UteModelDefaultValues | number | string` - Default value for field if it`s empty
 * @prop {@link UteStorageModels.references | references}?: `string` - Name of table & column to assotiation beetwen tables</br>
 *
 * Example: `Table.Column`
 */

export interface UteStorageModels {
    /**
     * Field type
     */
    type: UteModelTypes;
    /**
     * Use "Auto Increment" for field
     */
    autoIncrement?: boolean;
    /**
     * Set field as "Primary Key"
     */
    primaryKey?: boolean;
    /**
     * Set field not allow "Empty" values
     */
    allowNull?: boolean;
    /**
     * Default value for field if it`s empty on insert
     */
    defaultValue?: UteModelDefaultValues | number | string;
    /**
     * Name of table & column to assotiation beetwen tables
     * @example "{ models: 'Table', key: 'Column' }"
     */
    references?: { model: string; key: string };
}

/**
 * Ute Storage Models Type enum
 * @prop int: `INTERGER`
 * @prop str: `STRING`
 * @prop bool: `BOOLEAN`
 * @prop date: `DATE`
 * @prop text: `TEXT`
 */
export enum UteModelTypes {
    int = "INTERGER",
    str = "STRING",
    bool = "BOOLEAN",
    date = "DATE",
    text = "TEXT",
}

/**
 * Ute Storage Models Default values enum
 * @prop uuid: `UUID4 string`
 * @prop date: `new Date()`
 */
export enum UteModelDefaultValues {
    uuid = "@UUID4",
    date = "@DATE",
    fiof = "@FIRSTOF",
}
