import { ModuleWithProviders, NgModule } from "@angular/core";
import { StorageService } from "@services/storage.service";
import { UteModuleConfigs } from "@interfaces/config";

@NgModule({
    declarations: [],
    imports: [],
    exports: [],
})
export class NgxUteStorageModule {
    static forRoot(config: UteModuleConfigs): ModuleWithProviders<NgxUteStorageModule> {
        console.log(config);
        return {
            ngModule: NgxUteStorageModule,
            providers: [StorageService, { provide: "config", useValue: config }],
        };
    }
}
