import { Inject, Injectable } from "@angular/core";
import { UteModuleConfigs } from "../interfaces/config";
import { StorageService } from "./storage.service";

@Injectable({
    providedIn: "root",
})
export class InjectService {
    constructor(@Inject("config") private config: UteModuleConfigs, private storageService: StorageService) {
        if (!this.config) {
            throw Error(`Empty config params`);
        } else {
            this.storageService.initialize(this.config);
        }
    }
}
