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
     * ATTENTION! Write models in order for REFERENCES
     * @defaultValue `assets/databases/model.json`
     */
    models?: string | UteObjects;
    /**
     * Source project environment file
     */
    environment: { storage: any } | any;
    /**
     * Link to server for sync data
     * @default `environment.server`
     */
    syncServer?: string;
    /**
     * Date of last app sync to server
     * @default `environment.syncDate`
     *
     * Attention! Need to be updated when user `SignIn`
     */
    syncDate?: Date;
    /**
     * Name of filed for values search
     * @default `createdBy`
     */
    syncField?: string;
    /**
     * Name of values for search beetwen server & app
     * @default `environment.syncName`
     *
     * Attention! Need to be updated when user `SignIn`
     */
    syncName?: string;
    /**
     * List of model to ignore
     * @default `logs`, `media`
     */
    syncIgnore?: string[];
}
