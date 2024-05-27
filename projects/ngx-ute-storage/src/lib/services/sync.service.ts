import { Injectable } from "@angular/core";
import { UteStorageConfigs } from "../interfaces/config";
import { UteObjects } from "../interfaces/object";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Capacitor } from "@capacitor/core";
import { Observable, lastValueFrom } from "rxjs";
import { HttpService } from "./http.service";
import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { SyncResponseData, SyncStatusList } from "../interfaces/sync";

@Injectable({
    providedIn: "root",
})
export class SyncService {
    private options: {
        body?: any;
        headers?: HttpHeaders | undefined;
    } = {};
    private syncStages: number = 2;
    private syncStage: number = 1;

    constructor(private http: HttpClient, private httpService: HttpService) {}

    /**
     * Generate http option to server secure allows
     * @returns `boolean` status
     */
    private generateOptions(): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                this.options = {
                    headers: new HttpHeaders({
                        "Content-Type": "application/json",
                        Session: btoa(
                            JSON.stringify({
                                deviceId: await lastValueFrom(this.http.get("assets/deviceId")),
                                device: Capacitor.getPlatform(),
                                date: new Date().toISOString().split("T")[0],
                            })
                        ),
                    }),
                };
                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Start sync process
     * @param config - Sync settings
     * @param sqlDB - DB for connection
     * @returns Boolean status
     */
    public sync(config: UteStorageConfigs, sqlDB: SQLiteDBConnection): Observable<SyncResponseData | null> {
        console.log("config", config);

        return new Observable((obs) => {
            console.log(111);

            obs.next({ status: SyncStatusList.syncCheck, stage: `${this.syncStage} / ${this.syncStages}` });
            try {
                async () => {
                    await this.generateOptions();
                    const serverUrl: string = `${config.syncServer}${config.syncServer?.endsWith("/") ? "api/" : "/api/"}`;

                    const serverData: any = await lastValueFrom(
                        this.http.post(
                            `${serverUrl}sync`,
                            {
                                type: "init",
                                field: config.syncField,
                                name: config.syncName,
                                date: config.syncDate,
                            },
                            this.options
                        )
                    );
                    console.log(serverData);

                    if (serverData === null) {
                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                        obs.complete();
                    } else {
                        this.syncStage++;
                        this.syncStages = 6;
                        obs.next({ status: SyncStatusList.syncGet, stage: `${this.syncStage} / ${this.syncStages}` });

                        let createLocalData: UteObjects = {};
                        let updateLocalData: UteObjects = {};
                        let deleteLocalData: UteObjects = {};

                        let localData: UteObjects = await this.getSyncData(config, sqlDB);

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncAnalyse, stage: `${this.syncStage} / ${this.syncStages}` });

                        let returnServerData: UteObjects = {};
                        let deleteServerData: UteObjects = localData["deletes"];

                        Object.keys(serverData).map((n: string) => {
                            if (localData[n]) {
                                createLocalData[n] = serverData[n].filter((sd: any) => !localData[n].some((ld: any) => ld.uid === sd.uid));
                                updateLocalData[n] = serverData[n].filter((sd: any) => localData[n].some((ld: any) => ld.uid === sd.uid));
                                deleteLocalData[n] = localData[n].filter((sd: any) => !serverData[n].some((ld: any) => ld.uid === sd.uid));
                            } else {
                                createLocalData[n] = serverData[n];
                            }
                        });

                        Object.keys(localData).map((n: string) => {
                            if (n !== "deletes") {
                                returnServerData[n] = localData[n].filter((dl: any) => dl.updatedAt.getTime() > new Date(serverData.users[0].syncDate));
                            }
                        });

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncLocal, stage: `${this.syncStage} / ${this.syncStages}` });

                        await this.httpService.request(
                            "POST",
                            Object.keys(createLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: createLocalData[m],
                                };
                            }),
                            sqlDB
                        );
                        await this.httpService.request(
                            "PUT",
                            Object.keys(updateLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: updateLocalData[m],
                                };
                            }),
                            sqlDB
                        );
                        await this.httpService.request(
                            "DELETE",
                            Object.keys(deleteLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: deleteLocalData[m],
                                };
                            }),
                            sqlDB
                        );

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncServer, stage: `${this.syncStage} / ${this.syncStages}` });

                        await lastValueFrom(
                            this.http.post(
                                `${serverUrl}sync`,
                                {
                                    type: "update",
                                    data: [returnServerData, deleteServerData],
                                },
                                this.options
                            )
                        );

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                    }
                };
            } catch (error) {
                obs.next(null);
                obs.complete();
            }
        });
    }

    /**
     * Get local DB data
     * @param config - Sync settings
     * @param sqlDB - DB for connection
     * @returns Object with data
     */
    private getSyncData(config: UteStorageConfigs, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                const sendData: UteObjects = await this.httpService.request(
                    "GET",
                    Object.keys(config.models!)
                        .filter((m: string) => m !== ("logs" || "media" || "users"))
                        .map((m: string) => {
                            return {
                                table: m,
                                where: {
                                    AND: {
                                        [config.syncField!]: config.syncName,
                                        changedAt: { BETWEEN: [config.syncDate, new Date()] },
                                    },
                                },
                            };
                        }),
                    sqlDB
                );
                console.log(JSON.stringify(sendData));
                resolve(sendData);
            } catch (error: any) {
                reject(error);
            }
        });
    }
}
