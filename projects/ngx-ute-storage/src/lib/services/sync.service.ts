import { Injectable } from "@angular/core";
import { UteStorageConfigs } from "../interfaces/config";
import { UteObjects } from "../interfaces/object";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Capacitor } from "@capacitor/core";
import { Observable, lastValueFrom } from "rxjs";
import { HttpService } from "./http.service";
import { SQLiteDBConnection } from "@capacitor-community/sqlite";
import { SyncResponseData, SyncStatusList } from "../interfaces/sync";
import { UteApis } from "../interfaces/api";

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
    public sync(config: UteStorageConfigs, models: any[], sqlDB: SQLiteDBConnection): Observable<SyncResponseData | null> {
        // console.log("config", config);
        return new Observable((obs) => {
            // console.log(111);
            this.syncStages = 2;
            this.syncStage = 1;

            obs.next({ status: SyncStatusList.syncCheck, stage: `${this.syncStage} / ${this.syncStages}` });
            try {
                const func = async () => {
                    await this.generateOptions();

                    if (!config.syncServer) config.syncServer = config.environment.server;
                    if (!config.syncField) config.syncField = "createdBy";
                    if (!config.syncName) config.syncName = config.environment.syncName;
                    if (!config.syncDate) config.syncDate = config.environment.syncDate;

                    if (!config.syncName) {
                        throw false;
                    }

                    const serverUrl: string = `${config.syncServer}${config.syncServer?.endsWith("/") ? "api/" : "/api/"}`;

                    const serverData: any = await lastValueFrom(
                        this.http.post(
                            `${serverUrl}sync`,
                            {
                                type: "init",
                                field: config.syncField,
                                name: config.syncName,
                                date: config.syncDate,
                                ignore: config.syncIgnore,
                            },
                            this.options
                        )
                    );
                    // console.log(serverData);

                    if (serverData === null) {
                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                        obs.complete();
                    } else {
                        this.syncStage++;
                        this.syncStages = 6;
                        obs.next({ status: SyncStatusList.syncGet, stage: `${this.syncStage} / ${this.syncStages}` });

                        const user: any = serverData.users;
                        delete serverData.users;

                        let createLocalData: UteObjects = {};
                        let updateLocalData: UteObjects = {};
                        let deleteLocalData: UteObjects = {};

                        let localData: UteObjects = await this.getSyncData(config, models, sqlDB);
                        // console.log(localData);

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncAnalyse, stage: `${this.syncStage} / ${this.syncStages}` });

                        let returnServerData: UteObjects = {};
                        let deleteServerData: UteObjects = localData["deletes"] || {};

                        Object.keys(serverData).map((n: string) => {
                            if (localData[n]) {
                                const createArr = serverData[n].filter((sd: any) => !localData[n].some((ld: any) => ld.uid === sd.uid));
                                if (createArr.length) {
                                    createLocalData[n] = createArr.map((d: any) => {
                                        d.createdBy = config.syncName;
                                        return d;
                                    });
                                }

                                const updateArr = serverData[n].filter((sd: any) => localData[n].some((ld: any) => ld.uid === sd.uid));
                                if (updateArr.length) {
                                    updateLocalData[n] = updateArr.map((d: any) => {
                                        d.createdBy = config.syncName;
                                        return d;
                                    });
                                }

                                if (user.syncDate) {
                                    const deleteArr = localData[n].filter((sd: any) => !serverData[n].some((ld: any) => ld.uid === sd.uid));
                                    if (deleteArr.length) {
                                        deleteLocalData[n] = deleteArr.map((d: any) => {
                                            d.createdBy = config.syncName;
                                            return d;
                                        });
                                    }
                                }
                            } else {
                                if (serverData[n].length) {
                                    createLocalData[n] = serverData[n];
                                }
                            }
                        });

                        Object.keys(localData).map((n: string) => {
                            if (n !== "deletes" && user) {
                                const returnArr = localData[n].filter((dl: any) => dl.updatedAt.getTime() > new Date(user.syncDate));
                                if (returnArr.length)
                                    returnServerData[n] = returnArr.map((d: any) => {
                                        d.createdBy = config.syncName;
                                        return d;
                                    });
                            }
                        });
                        // console.log(returnServerData);
                        // return;

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncLocal, stage: `${this.syncStage} / ${this.syncStages}` });

                        // console.log(createLocalData);
                        if (Object.keys(createLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(createLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: createLocalData[m].map((d: any) => (d.createdBy = config.syncName)),
                                };
                            });
                            await this.httpService.request("POST", this.sortTables(Object.keys(models), arrayOfTables), sqlDB);
                        }

                        // console.log(updateLocalData);
                        if (Object.keys(updateLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(updateLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: updateLocalData[m].map((d: any) => (d.createdBy = config.syncName)),
                                    where: { uid: { IN: updateLocalData[m].map((d: any) => d.uid) } },
                                };
                            });

                            await this.httpService.request("PUT", this.sortTables(Object.keys(models), arrayOfTables), sqlDB);
                        }

                        // console.log(deleteLocalData);
                        if (Object.keys(deleteLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(deleteLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    where: { uid: { IN: deleteLocalData[m].map((d: any) => d.uid) } },
                                };
                            });

                            await this.httpService.request("DELETE", this.sortTables(Object.keys(models), arrayOfTables), sqlDB);
                        }

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncServer, stage: `${this.syncStage} / ${this.syncStages}` });

                        await lastValueFrom(
                            this.http.post(
                                `${serverUrl}sync`,
                                {
                                    type: "update",
                                    data: [returnServerData, deleteServerData, config.syncName],
                                },
                                this.options
                            )
                        );

                        await this.httpService.request(
                            "PUT",
                            [
                                {
                                    table: "users",
                                    select: {
                                        syncDate: new Date().toISOString(),
                                    },
                                    where: { uuid: config.syncName },
                                },
                            ],
                            sqlDB
                        );

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                    }
                };
                func()
                    .then(() => {
                        obs.complete();
                    })
                    .catch((error) => {
                        console.error(error);
                        obs.next(null);
                        obs.complete();
                    });
            } catch (error) {
                console.error(error);
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
    private getSyncData(config: UteStorageConfigs, models: any[], sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            // console.log(111);

            try {
                const ignoreList: string[] = [...(config.syncIgnore || []), ...["logs", "media", "deletes"]];
                const jsons: UteApis<any>[] = Object.keys(models)
                    .filter((m: string) => !ignoreList.some((ig: string) => m === ig))
                    .map((m: string) => {
                        return {
                            table: m,
                            where: {
                                AND: [
                                    { [config.syncField!]: { IN: [config.syncName, ""] } },
                                    { updatedAt: config.syncDate ? { BETWEEN: [config.syncDate, new Date().toISOString()] } : { LTE: new Date().toISOString() } },
                                ],
                            },
                        };
                    });
                // console.log(jsons);

                const sendData: UteObjects = await this.httpService.request("GET", jsons, sqlDB);
                // console.log(JSON.stringify(sendData));
                resolve(sendData);
            } catch (error) {
                reject(error);
            }
        });
    }

    private sortTables(models: string[], tables: any[]): any[] {
        // Create a lookup for the order of table values in inputArray
        const tableOrder = Object.keys(models).reduce((acc: any, table: any, index: number) => {
            acc[table] = index;
            return acc;
        }, {});

        // Sort inputData based on the order defined in inputArray
        const sortedData = tables.sort((a, b) => tableOrder[a.table] - tableOrder[b.table]);

        return sortedData;
    }
}
