import { UteObjects } from "./object";

/**
 * Ute Storage Configs Params
 * @prop {@link UteStorageConfigs.name | name}: `string` - Default DB name
 * @prop {@link UteStorageConfigs.db | db}?: `string` - Path to additional DB
 * @prop {@link UteStorageConfigs.model | model}?: `string` - Path to models files
 *
 * If `sync: true` Use example code to init storage:</br>
 *
 * Example: `StorageService.initialize()`;
 */
export interface UteStorageConfigs {
    /**
     * Default DB name
     */
    name: string;
    // /**
    //  * Path to additional DB
    //  * @defaultValue `assets/databases/databases.json`
    //  */
    // db?: string;
    /**
     * Path to models files OR models object
     * @defaultValue `assets/databases/model.json`
     */
    models?: string | UteObjects;
    /**
     * Source project environment file
     */
    environment: { storage: any } | any;
}
