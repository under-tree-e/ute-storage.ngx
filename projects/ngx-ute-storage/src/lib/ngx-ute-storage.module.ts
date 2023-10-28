import { ModuleWithProviders, NgModule } from "@angular/core";
import { NgxUteStorageComponent } from "./ngx-ute-storage.component";
import { NgxUteStorageService } from "./ngx-ute-storage.service";
import { ModuleConfigs } from "./interfaces/config";

@NgModule({
    declarations: [NgxUteStorageComponent],
    imports: [],
    exports: [NgxUteStorageComponent],
})
export class NgxUteStorageModule {
    static forRoot(config: ModuleConfigs): ModuleWithProviders<NgxUteStorageModule> {
        console.log(config);
        return {
            ngModule: NgxUteStorageModule,
            providers: [NgxUteStorageService, { provide: "config", useValue: config }],
        };
    }
}
