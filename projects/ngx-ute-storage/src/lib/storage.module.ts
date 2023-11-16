import { ModuleWithProviders, NgModule } from "@angular/core";
import { UteModuleConfigs } from "./interfaces/config";
import { InjectService } from "./services/inject.service";

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
 *          } as UteModuleConfigs)
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
 * } as UteModuleConfigs);
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
     * @returns
     */
    static forRoot(config: UteModuleConfigs): ModuleWithProviders<NgxUteStorageModule> {
        return {
            ngModule: NgxUteStorageModule,
            providers: [InjectService, { provide: "config", useValue: config }],
        };
    }
}
