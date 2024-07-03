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
    private authToken: string = "";

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
                if (this.authToken) {
                    this.options.headers = this.options.headers?.set("Authorization", `Bearer ${this.authToken}`);
                }
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
        return new Observable((obs) => {
            this.syncStages = 2;
            this.syncStage = 1;
            this.authToken = config.environment.session.authToken;

            obs.next({ status: SyncStatusList.syncCheck, stage: `${this.syncStage} / ${this.syncStages}` });
            try {
                const func = async () => {
                    await this.generateOptions();

                    if (!config.sync!.server) config.sync!.server = config.environment.appServer;
                    if (!config.sync!.field) config.sync!.field = "createdBy";
                    if (!config.sync!.value) config.sync!.value = config.environment.session!.uuid;
                    if (!config.sync!.date) config.sync!.date = config.environment.session!.syncDate;
                    if (!config.sync!.last) config.sync!.last = config.environment.session!.lastDate;

                    if (!config.sync!.value) {
                        throw false;
                    }

                    const serverUrl: string = `${config.sync!.server}${config.sync!.server?.endsWith("/") ? "api/" : "/api/"}`;

                    const serverData: any = await lastValueFrom(
                        this.http.post(
                            `${serverUrl}sync`,
                            {
                                type: "init",
                                field: config.sync!.field,
                                name: config.sync!.value,
                                date: config.sync!.last,
                                ignore: config.sync!.ignore,
                            },
                            this.options
                        )
                    );

                    if (serverData === null) {
                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncComplete, stage: `${this.syncStage} / ${this.syncStages}`, close: true });
                        obs.complete();
                    } else {
                        this.syncStage++;
                        this.syncStages = 6;
                        obs.next({ status: SyncStatusList.syncGet, stage: `${this.syncStage} / ${this.syncStages}` });

                        const serverDate: Date | null = serverData.syncDate ? new Date(serverData.syncDate) : null;
                        const localDate: Date | null = config.sync!.date ? new Date(config.sync!.date) : null;
                        const lastDate: Date | null = config.sync!.last ? new Date(config.sync!.last) : null;
                        delete serverData.syncDate;

                        let createLocalData: UteObjects = {};
                        let updateLocalData: UteObjects = {};
                        let deleteLocalData: UteObjects = {};

                        let localData: UteObjects = await this.getSyncData(config, localDate, serverDate, lastDate, models, sqlDB);

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncAnalyse, stage: `${this.syncStage} / ${this.syncStages}` });

                        let returnServerData: UteObjects = {};
                        let deleteServerData: UteObjects = localData["deletes"] || {};

                        Object.keys(serverData).map((n: string) => {
                            if (localData[n]) {
                                const createArr = serverData[n].filter((sd: any) => !localData[n].some((ld: any) => ld.uid === sd.uid));

                                if (createArr.length) {
                                    createLocalData[n] = createArr.map((d: any) => {
                                        d.createdBy = config.sync!.value;
                                        return d;
                                    });
                                }

                                const updateArr = serverData[n].filter((sd: any) => localData[n].some((ld: any) => ld.uid === sd.uid));
                                if (updateArr.length) {
                                    updateLocalData[n] = updateArr.map((d: any) => {
                                        d.createdBy = config.sync!.value;
                                        return d;
                                    });
                                }

                                if (serverDate) {
                                    const deleteArr = localData[n].filter((sd: any) => !serverData[n].some((ld: any) => ld.uid === sd.uid) && new Date(sd.updatedAt).getTime() < serverDate.getTime());
                                    if (deleteArr.length) {
                                        deleteLocalData[n] = deleteArr.map((d: any) => {
                                            d.createdBy = config.sync!.value;
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
                                    d.createdBy = config.sync!.value;
                                    d.updatedBy = config.sync!.value;
                                    return d;
                                });
                            }
                        });

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncLocal, stage: `${this.syncStage} / ${this.syncStages}` });

                        if (Object.keys(createLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(createLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: createLocalData[m].map((d: any) => {
                                        d.createdBy = config.sync!.value;
                                        d.updatedBy = config.sync!.value;
                                        return d;
                                    }),
                                };
                            });

                            await this.httpService.request("POST", this.sortTables(models, arrayOfTables), config.models, sqlDB);
                        }

                        if (Object.keys(updateLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(updateLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    select: updateLocalData[m].map((d: any) => {
                                        d.createdBy = config.sync!.value;
                                        d.updatedBy = config.sync!.value;
                                        return d;
                                    }),
                                    where: { uid: { IN: updateLocalData[m].map((d: any) => d.uid) } },
                                };
                            });

                            await this.httpService.request("PUT", this.sortTables(models, arrayOfTables), config.models, sqlDB);
                        }

                        if (Object.keys(deleteLocalData).length) {
                            let arrayOfTables: any[] = Object.keys(deleteLocalData).map((m: string) => {
                                return {
                                    table: m,
                                    where: { uid: { IN: deleteLocalData[m].map((d: any) => d.uid) } },
                                };
                            });
                            await this.httpService.request("DELETE", this.sortTables(models, arrayOfTables, true), config.models, sqlDB);
                        }

                        this.syncStage++;
                        obs.next({ status: SyncStatusList.syncServer, stage: `${this.syncStage} / ${this.syncStages}` });

                        const newDate: Date = new Date(new Date().setMilliseconds(0));

                        await lastValueFrom(
                            this.http.post(
                                `${serverUrl}sync`,
                                {
                                    type: "update",
                                    data: [returnServerData, deleteServerData, config.sync!.value, newDate],
                                },
                                this.options
                            )
                        );

                        if (Object.keys(returnServerData).length) {
                            let arrayOfTables: any[] = Object.keys(returnServerData).map((m: string) => {
                                return {
                                    table: m,
                                    select: {
                                        createdBy: config.sync!.value,
                                        updatedBy: config.sync!.value,
                                    },
                                    where: { OR: [{ createdBy: "" }, { updatedBy: "" }] },
                                };
                            });

                            await this.httpService.request("PUT", this.sortTables(models, arrayOfTables), config.models, sqlDB);
                        }

                        await this.httpService.request(
                            "PUT",
                            [
                                {
                                    table: "users",
                                    select: {
                                        syncDate: newDate.toISOString(),
                                    },
                                    where: { uuid: config.sync!.value },
                                },
                            ],
                            config.models,
                            sqlDB
                        );
                        config.sync!.date = newDate;

                        config.environment.session!.syncDate = newDate;
                        config.environment.session!.lastDate = newDate;

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
    private getSyncData(config: UteStorageConfigs, localDate: Date | null, serverDate: Date | null, lastDate: Date | null, models: any[], sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                const ignoreList: string[] = [...(config.sync!.ignore || []), ...["logs", "media", "deletes"]];
                const models = Object.entries(config.models!).reduce((acc: any, [key, value]) => {
                    acc[key] = value._model;
                    return acc;
                }, {});
                const jsons: UteApis<any>[] = Object.keys(models!)
                    .filter((m: string) => !ignoreList.some((ig: string) => m === ig))
                    .map((m: string) => {
                        let json = {
                            table: m,
                            where: {
                                AND: [{ [config.sync!.field!]: { IN: [config.sync!.value, ""] } }],
                            },
                        };

                        if (serverDate && lastDate && localDate) {
                            if (lastDate.getTime() > serverDate.getTime()) {
                                (json.where["AND"] as any).push({
                                    updatedAt: { BETWEEN: [localDate.toISOString(), lastDate.toISOString()] },
                                });
                            } else if (lastDate.getTime() <= serverDate.getTime()) {
                                (json.where["AND"] as any).push({
                                    updatedAt: { BETWEEN: [localDate.toISOString(), serverDate.toISOString()] },
                                });
                            }
                        } else if (serverDate && localDate) {
                            (json.where["AND"] as any).push({
                                updatedAt: { BETWEEN: [localDate.toISOString(), serverDate.toISOString()] },
                            });
                        } else if (serverDate) {
                            (json.where["AND"] as any).push({
                                updatedAt: { GTE: serverDate.toISOString() },
                            });
                        }

                        return json;
                    });

                const sendData: UteObjects = await this.httpService.request("GET", this.sortTables(models, jsons), config.models, sqlDB);
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
