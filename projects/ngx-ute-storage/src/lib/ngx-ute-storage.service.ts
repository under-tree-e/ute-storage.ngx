import { Inject, Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { ModuleConfigs } from "./interfaces/config";

@Injectable({
    providedIn: "root",
})
export class NgxUteStorageService {
    // private sqlite: SQLiteConnection = {} as SQLiteConnection;
    // private sqlitePlugin: any;
    // private defaultDB: string = "hw";
    // private requestDB: string = this.defaultDB;
    // private stMethod: typeof this.getStorage | typeof this.postStorage | typeof this.putStorage | typeof this.deleteStorage = null!;

    constructor(@Inject("config") private config: ModuleConfigs) {
        console.log(this.config);
    }
}
