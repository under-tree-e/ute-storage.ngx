/**
 * Ute Storage Configs Params
 * @prop {@link UteModuleConfigs.name | name}: `string` - Default DB name
 * @prop {@link UteModuleConfigs.db | db}?: `string` - Path to additional DB
 * @prop {@link UteModuleConfigs.model | model}?: `string` - Path to models files
 *
 * If `sync: true` Use example code to init storage:</br>
 *
 * Example: `StorageService.initialize()`;
 */
export interface UteModuleConfigs {
    /**
     * Default DB name
     */
    name: string;
    /**
     * Path to additional DB
     * @defaultValue `assets/databases/`
     */
    db?: string;
    /**
     * Path to models files
     * @defaultValue `src/interfaces/models/`
     */
    model?: string;
}
