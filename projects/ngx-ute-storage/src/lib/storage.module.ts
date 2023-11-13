import { ModuleWithProviders, NgModule } from "@angular/core";
import { StorageService } from "@services/storage.service";
import { UteModuleConfigs } from "@interfaces/config";

/**
 * The main module of SQL Storage library. Example usage:
 *
 * ```typescript
 * import { NgxUteStorageModule } from 'ngx-ute-storage';
 *
 * @NgModule({
 *      imports: [
 *          NgxUteStorageModule.forRoot({
 *              name: "DB",
 *              db: "assets/databases/",
 *              model: "src/interfaces/models/",
 *              sync: false
 *          } as UteModuleConfigs)
 *      ]
 * })
 * class AppModule {}
 * ```
 *
 */
@NgModule({
    declarations: [],
    imports: [],
    exports: [],
})
export class NgxUteStorageModule {
    /**
     * @param config - Ute Storage Configs Params `(UteModuleConfigs)`:
     *
     * - name: `string`</br>
     * - db?: `string`</br>
     * - model?: `string`</br>
     * - sync?: `boolean`</br>
     *
     * If `sync: true` Use example code to init storage:
     * @example
     * StorageService.initialize();
     *
     * @returns
     */
    static forRoot(config: UteModuleConfigs): ModuleWithProviders<NgxUteStorageModule> {
        return {
            ngModule: NgxUteStorageModule,
            providers: [StorageService, { provide: "config", useValue: config }],
        };
    }
}
