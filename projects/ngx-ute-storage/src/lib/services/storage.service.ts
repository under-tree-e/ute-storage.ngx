import { Inject, Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { UteStorageConfigs } from "../interfaces/config";
import { CapacitorSQLite, SQLiteDBConnection, SQLiteConnection, capSQLiteResult, capSQLiteChanges } from "@capacitor-community/sqlite";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";
import { HttpClient } from "@angular/common/http";
import { UteApis } from "../interfaces/api";
import { UteObjects } from "../interfaces/object";
import { UteQuerySysParams } from "../interfaces/query";
import { HttpService } from "./http.service";
import { UteModelTypes } from "../interfaces/model";
import { SyncService } from "./sync.service";
import { Observable, lastValueFrom } from "rxjs";
import { SyncResponseData } from "../interfaces/sync";

@Injectable({
    providedIn: "root",
})
export class StorageService {
    private sqlite: SQLiteConnection = {} as SQLiteConnection;
    private sqlitePlugin: any = null;
    private defaultDB: string = "";
    private platform: string = Capacitor.getPlatform();
    private requestDB: string = this.defaultDB;
    private sortModelsList: any[] = [];

    constructor(@Inject("UteStorageConfig") private config: UteStorageConfigs, private http: HttpClient, private httpService: HttpService, private syncService: SyncService) {
        if (this.config) {
            this.config.environment!.storage = this;
            this.defaultDB = this.config.name;
            this.Init(config);
        }
    }

    /**
     * Initialization module
     * @returns boolean result
     */
    public Init(config: UteStorageConfigs) {
        if (!config.environment.production) {
            console.log(`${new Date().toISOString()} => StorageService - Init`);
        }

        this.config = config;
        this.defaultDB = this.config.name;
        this.config.environment!.storage = this;
        this.sortModelsList = this.sortModels(config.models!);

        return new Promise(async (resolve, reject) => {
            try {
                this.sqlitePlugin = CapacitorSQLite;
                this.sqlite = new SQLiteConnection(this.sqlitePlugin);

                if (this.platform === "web") {
                    jeepSqlite(window);
                    const jeepEl: any = document.createElement("jeep-sqlite");
                    document.body.appendChild(jeepEl);
                    jeepEl.autoSave = true;
                    jeepEl.wasmPath = "assets";
                    await customElements.whenDefined("jeep-sqlite");
                    await this.initWebStore();
                }
                await this.migrate();
                resolve(true);
            } catch (error) {
                console.error("Ute Storage Init", error);
                reject(false);
            }
        });
    }

    /**
     * DB Create or Update - Migrate beetwen versions
     * @param update - boolean value, check true to update exists DBs
     * @returns boolean result
     */
    public migrate(update: boolean = false): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                const models = Object.entries(this.config.models!).reduce((acc: any, [key, value]) => {
                    acc[key] = value._model;
                    return acc;
                }, {});

                const isMainDB: boolean = await this.isDatabase(this.defaultDB);

                if (!isMainDB || update) {
                    console.log("Storage Build Start");

                    let sqlDB: SQLiteDBConnection = await this.dbConnect(this.defaultDB);

                    const tableNames = Object.keys(models);

                    let createTableQueries: string[] = [];
                    for (let tableName of tableNames) {
                        const tableDefinition = models[tableName];
                        let modelsData: any[] = [];
                        let tableRefences: string[] = [];
                        let columnDefinitions = Object.keys(tableDefinition).map((columnName) => {
                            const columnDefinition: any = tableDefinition[columnName];

                            const columnType: string = ` ${columnDefinition.type === UteModelTypes.str ? "VARCHAR(255)" : columnDefinition.type}`;
                            const primaryKey: string = columnDefinition.primaryKey ? ` ${UteQuerySysParams.prk}` : "";
                            const autoIncrement: string = columnDefinition.autoIncrement ? ` ${UteQuerySysParams.aui}` : "";
                            const allowNull: string = columnDefinition.allowNull === undefined || columnDefinition.allowNull ? "" : ` ${UteQuerySysParams.non}`;
                            const unique: string = columnDefinition.unique ? ` ${UteQuerySysParams.unq}` : "";
                            const references: string =
                                columnDefinition.references && columnDefinition.references.model && columnDefinition.references.key
                                    ? `${UteQuerySysParams.fok}(${columnName}) ${UteQuerySysParams.ref} ${columnDefinition.references.model}(${columnDefinition.references.key})`
                                    : "";
                            if (references) {
                                tableRefences.push(references);
                            }

                            let param: string = `${columnName}${columnType}${primaryKey}${autoIncrement}${allowNull}${unique}${
                                columnDefinition.defaultValue != undefined ? ` ${UteQuerySysParams.def} '${columnDefinition.defaultValue}'` : ""
                            }`;

                            modelsData.push({ name: columnName, params: param });
                            return param;
                        });
                        if (tableRefences.length > 0) {
                            columnDefinitions = [...columnDefinitions, ...tableRefences];
                        }

                        createTableQueries.push(`${UteQuerySysParams.crt} ${UteQuerySysParams.ine} ${tableName} (${columnDefinitions.join(", ")});`);

                        if (update) {
                            const queryPR: string = `${UteQuerySysParams.pra} ${UteQuerySysParams.tbi}(${tableName});`;
                            let result = await sqlDB.query(queryPR);

                            if (result.values && result.values.length > 0) {
                                createTableQueries.push(`${UteQuerySysParams.drt} ${UteQuerySysParams.iex} ${tableName}_new;`);
                                createTableQueries.push(`${UteQuerySysParams.crt} ${tableName}_new (${columnDefinitions.join(", ")});`);
                                let columnsString: string = modelsData
                                    .filter((md: any) => result.values?.some((vl: any) => md.name === vl.name))
                                    .map((md: any) => md.name)
                                    .join(", ");
                                createTableQueries.push(
                                    `${UteQuerySysParams.irp} ${tableName}_new (${columnsString}) ${UteQuerySysParams.sel} ${columnsString} ${UteQuerySysParams.fro} ${tableName};`
                                );
                                createTableQueries.push(`${UteQuerySysParams.drt} ${tableName};`);
                                createTableQueries.push(`${UteQuerySysParams.alt} ${tableName}_new ${UteQuerySysParams.ret} ${tableName};`);
                            }
                        }
                    }

                    if (createTableQueries && createTableQueries.length > 0) {
                        await sqlDB.query(`${UteQuerySysParams.pra} ${UteQuerySysParams.frk}=off;`);
                        for (let query of createTableQueries) {
                            await sqlDB.query(query);
                        }
                        await sqlDB.query(`${UteQuerySysParams.pra} ${UteQuerySysParams.frk}=on;`);
                    }
                    await this.closeConnection(this.defaultDB);

                    if ((!isMainDB || update) && this.config.subDB) {
                        for (let db of this.config.subDB) {
                            console.log(this.platform === "electron");
                            if(this.platform === "electron"){
                                await this.getFromHTTPRequest(db);
                            }else{
                                await this.copyFromAssets();
                            }
                        }
                    }
                }

                resolve(true);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Start sync process
     * @returns Sync status string
     */
    public startSync(): Observable<SyncResponseData | null> {
        return new Observable((obs: any) => {
            if ((this.config.sync && this.config.sync?.value) || this.config.environment.session) {
                this.dbConnect(this.defaultDB).then((sqlDB: SQLiteDBConnection) => {
                    this.syncService.sync(this.config, this.sortModelsList, sqlDB).subscribe(async (res: SyncResponseData | null) => {
                        if (res) {
                            obs.next(res);
                            if (res.close) {
                                obs.complete();
                            }
                        } else {
                            obs.next(null);
                            obs.complete();
                        }
                    });
                });
            } else {
                console.error("Empty sync parameters");
                obs.next(null);
                obs.complete();
            }
        });
    }

    /**
     *
     * @param method
     * @param apireq
     * @param dbName
     * @returns
     */
    public request<T>(method: string, apireq: UteApis<T>[], dbName?: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!dbName) {
                    dbName = this.defaultDB;
                }

                apireq.map((a: UteApis) => {
                    if (!a.user && this.config.environment.session) {
                        a.user = this.config.environment.session.uuid;
                    }
                });

                let sqlDB: SQLiteDBConnection = await this.dbConnect(dbName);
                let sqlResult: UteObjects = await this.httpService.request(method, apireq, this.config.models, sqlDB);

                resolve(sqlResult);
            } catch (error: any) {
                reject(error);
                return;
            }
        });
    }

    /**
     *
     * @param database
     * @returns
     */
    private dbConnect(database: string): Promise<SQLiteDBConnection> {
        return new Promise(async (resolve, reject) => {
            let sqlDB: SQLiteDBConnection = {} as SQLiteDBConnection;
            try {
                let isConnection = await this.isConnection(database);
                if (isConnection.result) {
                    sqlDB = await this.retrieveConnection(database);
                } else {
                    sqlDB = await this.createConnection(database, false, "no-encryption", 1);
                }
                await sqlDB.open();
                resolve(sqlDB);
            } catch (error) {
                reject(`DatabaseServiceError: ${error}`);
                return;
            }
        });
    }

    /**
     * Check if database exists
     * @param database
     */
    private isDatabase(database: string): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    let answer: capSQLiteResult = await this.sqlite.isDatabase(database);
                    resolve(answer.result ? answer.result : false);
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`no connection open`));
            }
        });
    }

    /**
     * Check if connection exists
     * @readonly readonly
     */
    private isConnection(database: string, readonly?: boolean): Promise<capSQLiteResult> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    const readOnly = readonly ? readonly : false;
                    resolve(await this.sqlite.isConnection(database, readOnly));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(`no connection open`);
            }
        });
    }

    /**
     * Retrieve an existing connection to a database
     * @param readonly
     */
    private retrieveConnection(database: string, readonly?: boolean): Promise<SQLiteDBConnection> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    const readOnly = readonly ? readonly : false;
                    resolve(await this.sqlite.retrieveConnection(database, readOnly));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(`no connection open for ${this.requestDB}`);
            }
        });
    }

    /**
     * Create a connection to a database
     * @param database
     * @param encrypted
     * @param mode
     * @param version
     */
    private createConnection(database: string, encrypted: boolean, mode: string, version: number, readonly: boolean = false): Promise<SQLiteDBConnection> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    const db: SQLiteDBConnection = await this.sqlite.createConnection(database, encrypted, mode, version, readonly);
                    if (db != null) {
                        resolve(db);
                    } else {
                        reject(`no db returned is null`);
                    }
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(`no connection open for ${this.requestDB}`);
            }
        });
    }

    /**
     * Close a connection to a database
     * @param database
     */
    private closeConnection(database: string, readonly?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    const readOnly = readonly ? readonly : false;
                    await this.sqlite.closeConnection(database, readOnly);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(`no connection open for ${this.requestDB}`);
            }
            this.requestDB = this.defaultDB;
        });
    }

    /**
     * Save a dtabase to local disk
     * @param database
     * @returns
     */
    public saveToLocalDisk(platform: string): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (platform !== "web") {
                reject(new Error(`not implemented for this platform: ${platform}`));
            }
            try {
                await this.sqlite.saveToLocalDisk(this.defaultDB);
                // lastValueFrom(this.http.get("assets/databases/databases.json"))
                //     .then((response: any) => {
                //         if (response.databaseList && response.databaseList.length) {
                //             response.databaseList.map(async (d: string) => {
                //                 await this.sqlite.saveToLocalDisk(d.split("SQLite.db")[0]);
                //             });
                //         }
                //     })
                //     .catch(() => {});
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get a database from local disk and save it to store
     * @param overwrite
     * @returns
     */
    public async getFromLocalDiskToStore(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.sqlite.getFromLocalDiskToStore(true);
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Copy databases from public/assets/databases folder to application databases folder
     * ATTENTION!!! On Electron has absolute INCORECT path, use 'getFromHTTPRequest' insted
     */
    public copyFromAssets(overwrite?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const mOverwrite: boolean = overwrite != null ? overwrite : true;
            if (this.sqlite != null) {
                try {
                    resolve(await this.sqlite.copyFromAssets(mOverwrite));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`no connection open`));
            }
        });
    }

    /**
     * Get a database from a given url
     * @param url
     * @param overwrite
     * @returns
     */
    async getFromHTTPRequest(url: string, overwrite?: boolean): Promise<void> {
        const mOverwrite: boolean = overwrite != null ? overwrite : true;
        if (url.length === 0) {
            return Promise.reject(new Error(`Must give an url to download`));
        }
        if (this.sqlite != null) {
            return this.sqlite.getFromHTTPRequest(url, mOverwrite);
        } else {
            return Promise.reject(new Error(`can't download the database`));
        }
    }

    /**
     * Is Json Object Valid
     * @param jsonstring Check the validity of a given Json Object
     */

    public async isJsonValid(jsonstring: string): Promise<capSQLiteResult> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    resolve(await this.sqlite.isJsonValid(jsonstring));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`no connection open`));
            }
        });
    }

    /**
     * Import from a Json Object
     * @param jsonstring
     */
    public async importFromJson(jsonstring: string): Promise<capSQLiteChanges> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    // if (db) {
                    //     await this.dbConnect(db);
                    // } else {
                    //     await this.dbConnect(this.defaultDB);
                    // }
                    resolve(await this.sqlite.importFromJson(jsonstring));
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`no connection open`));
            }
        });
    }

    /**
     * Initialize the Web store
     */
    private initWebStore(): Promise<void> {
        return new Promise(async (resolve, reject) => {
            if (this.platform !== "web") {
                reject(`not implemented for this platform: ${this.platform}`);
            }
            if (this.sqlite != null) {
                try {
                    await this.sqlite.initWebStore();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(`no connection open`);
            }
        });
    }

    /**
     * Sort models by references
     * @param models - Array of models
     * @returns Sorted array of models
     */
    private sortModels(storage: any) {
        let models: any = {};

        if (JSON.stringify(storage).includes("_model")) {
            Object.keys(storage).map((s: any) => {
                models[s] = storage[s]._model;
            });
        } else {
            models = JSON.parse(JSON.stringify(storage));
        }

        let references: any = {};

        // Separate objects with and without references
        let withReferences: any[] = [];
        let withoutReferences: any[] = [];

        Object.keys(models).map((k: string) => {
            const fields = models[k];

            let hasReference = false;

            for (const field in fields) {
                if (fields[field].references) {
                    hasReference = true;
                    if (!withReferences.some((w: any) => w.k === k)) {
                        withReferences.push({ k, fields });
                    }

                    if (!Array.isArray(references[k])) references[k] = [];
                    references[k].push(fields[field].references.model);
                }
            }

            if (!hasReference) {
                withoutReferences.push({ k, fields });
            }
        });

        // Sort objects with references
        withReferences.sort((a, b) => {
            return references[b.k].some((r: string) => r === a.k) ? -1 : 0;
        });

        // Combine the sorted arrays
        return [...withoutReferences.map((obj) => obj.k), ...withReferences.map((obj) => obj.k)];
    }
}
