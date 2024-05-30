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

                    console.log({
                        type: "init",
                        field: config.syncField,
                        name: config.syncName,
                        date: config.syncDate,
                        ignore: config.syncIgnore,
                    });

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
                    console.log(serverData);
                    // return;

                    if (serverData === null) {
                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                        obs.complete();
                    } else {
                        this.syncStage++;
                        this.syncStages = 6;
                        obs.next({ status: SyncStatusList.syncGet, stage: `${this.syncStage} / ${this.syncStages}` });

                        const serverDate: Date | null = serverData.syncDate ? new Date(serverData.syncDate) : null;
                        const localDate: Date | null = config.syncDate ? new Date(config.syncDate) : null;
                        delete serverData.syncDate;

                        let createLocalData: UteObjects = {};
                        let updateLocalData: UteObjects = {};
                        let deleteLocalData: UteObjects = {};

                        let localData: UteObjects = await this.getSyncData(config, localDate, serverDate, models, sqlDB);
                        console.log(localData);
                        // return;

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncAnalyse, stage: `${this.syncStage} / ${this.syncStages}` });

                        let returnServerData: UteObjects = {};
                        let deleteServerData: UteObjects = localData["deletes"] || {};

                        Object.keys(serverData).map((n: string) => {
                            // console.log(serverData[n]);
                            // console.log(localData[n]);

                            if (localData[n]) {
                                const createArr = serverData[n].filter((sd: any) => !localData[n].some((ld: any) => ld.uid === sd.uid));
                                // console.log(createArr);

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

                                if (serverDate) {
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
                            let returnArr = [];
                            if (n !== "deletes" && serverDate) {
                                returnArr = localData[n].filter((dl: any) => dl.updatedAt.getTime() > serverDate.getTime());
                            } else if (!serverDate) {
                                returnArr = localData[n];
                            }
                            if (returnArr.length) {
                                returnServerData[n] = returnArr.map((d: any) => {
                                    d.createdBy = config.syncName;
                                    d.updatedBy = config.syncName;
                                    return d;
                                });
                            }
                        });
                        // console.log(localData);

                        // console.log(createLocalData);
                        // console.log(updateLocalData);
                        // console.log(deleteLocalData);
                        // console.log(deleteServerData);
                        // console.log(returnServerData);
                        // return;

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncLocal, stage: `${this.syncStage} / ${this.syncStages}` });

                        console.log(createLocalData);
                        if (Object.keys(createLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(createLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: createLocalData[m].map((d: any) => {
                                        d.createdBy = config.syncName;
                                        d.updatedBy = config.syncName;
                                        return d;
                                    }),
                                };
                            });
                            console.log(this.sortTables(models, arrayOfTables));

                            await this.httpService.request("POST", this.sortTables(models, arrayOfTables), sqlDB);
                        }

                        console.log(updateLocalData);
                        if (Object.keys(updateLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(updateLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: updateLocalData[m].map((d: any) => {
                                        d.createdBy = config.syncName;
                                        d.updatedBy = config.syncName;
                                        return d;
                                    }),
                                    where: { uid: { IN: updateLocalData[m].map((d: any) => d.uid) } },
                                };
                            });
                            console.log(this.sortTables(models, arrayOfTables));

                            await this.httpService.request("PUT", this.sortTables(models, arrayOfTables), sqlDB);
                        }

                        console.log(deleteLocalData);
                        if (Object.keys(deleteLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(deleteLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    where: { uid: { IN: deleteLocalData[m].map((d: any) => d.uid) } },
                                };
                            });
                            // console.log(this.sortTables(models, arrayOfTables, true));

                            await this.httpService.request("DELETE", this.sortTables(models, arrayOfTables, true), sqlDB);
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

                        if (Object.keys(returnServerData).length) {
                            let arrayOfTables: any[] = Object.keys(returnServerData).map((m: string) => {
                                return {
                                    table: m,
                                    select: {
                                        createdBy: config.syncName,
                                        updatedBy: config.syncName,
                                    },
                                    where: { OR: [{ createdBy: "" }, { updatedBy: "" }] },
                                };
                            });
                            console.log(this.sortTables(models, arrayOfTables));

                            await this.httpService.request("PUT", this.sortTables(models, arrayOfTables), sqlDB);
                        }

                        const newDate: Date = serverDate ? serverDate! : new Date();
                        await this.httpService.request(
                            "PUT",
                            [
                                {
                                    table: "users",
                                    select: {
                                        syncDate: newDate.toISOString(),
                                    },
                                    where: { uuid: config.syncName },
                                },
                            ],
                            sqlDB
                        );
                        config.syncDate = newDate;

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
    private getSyncData(config: UteStorageConfigs, localDate: Date | null, serverDate: Date | null, models: any[], sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                const ignoreList: string[] = [...(config.syncIgnore || []), ...["logs", "media", "deletes"]];
                const jsons: UteApis<any>[] = Object.keys(config.models!)
                    .filter((m: string) => !ignoreList.some((ig: string) => m === ig))
                    .map((m: string) => {
                        let json = {
                            table: m,
                            where: {
                                AND: [{ [config.syncField!]: { IN: [config.syncName, ""] } }],
                            },
                        };

                        if (serverDate && localDate) {
                            (json.where["AND"] as any).push({
                                updatedAt: { BETWEEN: [localDate.toISOString(), serverDate.toISOString()] },
                            });
                        } else if (serverDate) {
                            (json.where["AND"] as any).push({
                                updatedAt: { LTE: serverDate.toISOString() },
                            });
                        }

                        return json;
                    });
                // console.log(jsons);

                const sendData: UteObjects = await this.httpService.request("GET", this.sortTables(models, jsons), sqlDB);
                // console.log(JSON.stringify(sendData, null, 2));
                resolve(sendData);
            } catch (error) {
                reject(error);
            }
        });
    }

    private sortTables(models: string[], tables: any[], reverse: boolean = false): any[] {
        const tableOrder = Object.keys(models).reduce((acc: any, table: any, index: number) => {
            acc[table] = index;
            return acc;
        }, {});

        const list: any[] = tables.sort((a, b) => tableOrder[a.table] - tableOrder[b.table]);
        if (reverse) {
            return list.reverse();
        } else {
            return list;
        }
    }
}
