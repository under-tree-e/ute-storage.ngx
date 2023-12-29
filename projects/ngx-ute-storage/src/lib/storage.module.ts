import { ModuleWithProviders, NgModule } from "@angular/core";
import { UteStorageConfigs } from "./interfaces/config";
import { StorageService } from "./services/storage.service";

/**
 * The main module of SQL Storage library.</br>
 *
 * Example autoload usage:
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
 *          } as UteStorageConfigs)
 *      ]
 * })
 * class AppModule {}
 * ```
 *
 * Example manual load usage:
 *
 * ```typescript
 * import { StorageService } from 'ngx-ute-storage';
 *
 * StorageService.initialize({
 *      name: "DB",
 *      db: "assets/databases/",
 *      model: "src/interfaces/models/",
 * } as UteStorageConfigs);
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
     * @param config - Ute Storage Configs Params `(UteStorageConfigs)`:
     *
     * - name: `string`</br>
     * - db?: `string`</br>
     * - model?: `string`</br>
     * - environment: `Object`
     * @returns
     */
    static forRoot(config?: UteStorageConfigs): ModuleWithProviders<NgxUteStorageModule> {
        return {
            ngModule: NgxUteStorageModule,
            providers: [StorageService, { provide: "UteStorageConfig", useValue: config }],
        };
    }
}
