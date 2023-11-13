import { Inject, Injectable } from "@angular/core";
import { Capacitor } from "@capacitor/core";
import { UteModuleConfigs } from "@interfaces/config";
import { CapacitorSQLite, SQLiteDBConnection, SQLiteConnection, capSQLiteResult, DBSQLiteValues } from "@capacitor-community/sqlite";
import { defineCustomElements as jeepSqlite } from "jeep-sqlite/loader";
import { lastValueFrom } from "rxjs";
import { HttpClient } from "@angular/common/http";
import { v4 } from "uuid";
import { UteApis } from "@interfaces/api";
import { UteObjects } from "@interfaces/object";
import { UteQueryStrings, UteQuerySysParams, UteQueryWRParams } from "@interfaces/query";
import * as fs from "fs";

@Injectable({
    providedIn: "root",
})
export class StorageService {
    private sqlite: SQLiteConnection = {} as SQLiteConnection;
    private sqlitePlugin: any = null;
    private defaultDB: string = "";
    private platform: string = Capacitor.getPlatform();
    private requestDB: string = this.defaultDB;
    private stMethod: typeof this.getStorage | typeof this.postStorage | typeof this.putStorage | typeof this.deleteStorage = null!;

    constructor(@Inject("config") private config: UteModuleConfigs, private http: HttpClient) {
        if (!this.config) {
            throw Error(`Empty config params`);
        } else {
            this.defaultDB = this.config.name;

            if (!this.config.sync) {
                this.initialize();
            }
        }
    }

    /**
     * Initialization module
     * @returns boolean result
     */
    public initialize() {
        return new Promise(async (resolve, reject) => {
            try {
                this.sqlitePlugin = CapacitorSQLite;
                this.sqlite = new SQLiteConnection(this.sqlitePlugin);

                switch (this.platform) {
                    case "ios":
                    case "android":
                        //
                        break;
                    case "web":
                        jeepSqlite(window);
                        const jeepEl: any = document.createElement("jeep-sqlite");
                        document.body.appendChild(jeepEl);
                        jeepEl.autoSave = true;
                        await customElements.whenDefined("jeep-sqlite");
                        await this.initWebStore();
                        break;
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
                if (update) {
                    console.log("Storage Updates Start");
                }

                let isMainDB: boolean = await this.isDatabase(this.defaultDB);
                if (!isMainDB || update) {
                    let sqlDB: SQLiteDBConnection = await this.dbConnect(this.defaultDB);

                    let modelFiles: any = await fs.promises.readdir(`${process.cwd()}/src/app/models/`);
                    let models: any = {};

                    for (let file of modelFiles) {
                        let fileName: string = file.split(".")[0];
                        let fileModel: any = require(`${this.config.model ? this.config.model : "src/interfaces/models/"}`);
                        models[fileName] = fileModel;
                    }

                    // let models: any = await lastValueFrom(this.http.get(`${this.config.model ? this.config.model : 'src/interfaces/models/'}models.json?v=` + Date.now()));

                    const tableNames = Object.keys(models);

                    let createTableQueries: string[] = [];
                    for (let tableName of tableNames) {
                        const tableDefinition = models[tableName];
                        let modelsData: any[] = [];
                        let tableRefences: string[] = [];
                        let columnDefinitions = Object.keys(tableDefinition).map((columnName) => {
                            const columnDefinition: any = tableDefinition[columnName];

                            const columnType: string = ` ${columnDefinition.type}`;
                            const primaryKey: string = columnDefinition.primaryKey ? ` ${UteQuerySysParams.prk}` : "";
                            const autoIncrement: string = columnDefinition.autoIncrement ? ` ${UteQuerySysParams.aui}` : "";
                            const allowNull: string = columnDefinition.allowNull === undefined || columnDefinition.allowNull ? "" : ` ${UteQuerySysParams.non}`;
                            const references: string = columnDefinition.references
                                ? `${UteQuerySysParams.fok} (${columnName}) ${UteQuerySysParams.ref} ${columnDefinition.references.replace(".", "(")})`
                                : "";
                            if (references) {
                                tableRefences.push(references);
                            }

                            let param: string = `${columnName}${columnType}${autoIncrement}${primaryKey}${allowNull}${
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
                            const queryPR: string = `${UteQuerySysParams.pra}(${tableName});`;
                            let result = await sqlDB.query(queryPR);

                            if (result.values && result.values.length > 0) {
                                createTableQueries.push(`${UteQuerySysParams.drt} ${UteQuerySysParams.iex} ${tableName}_new;`);
                                createTableQueries.push(`${UteQuerySysParams.crt} ${tableName}_new (${columnDefinitions.join(", ")});`);
                                let columnsString: string = modelsData
                                    .filter((md: any) => result.values?.some((vl: any) => md.name === vl.name))
                                    .map((md: any) => md.name)
                                    .join(", ");
                                createTableQueries.push(
                                    `${UteQuerySysParams.ins} ${tableName}_new (${columnsString}) ${UteQuerySysParams.sel} ${columnsString} ${UteQuerySysParams.fro} ${tableName};`
                                );
                                createTableQueries.push(`${UteQuerySysParams.drt} ${tableName};`);
                                createTableQueries.push(`${UteQuerySysParams.alt} ${tableName}_new ${UteQuerySysParams.ret} ${tableName};`);
                            }
                        }
                    }

                    for (let query of createTableQueries) {
                        await sqlDB.execute(query);
                    }

                    await this.closeConnection(this.defaultDB);
                }

                let databasesFile: UteObjects<any> = await lastValueFrom(this.http.get(`${this.config.db ? this.config.db : "assets/databases/"}databases.json?v=` + Date.now()));
                if (databasesFile) {
                    let dbList: string[] = databasesFile["databases"];
                    for (let dbName of dbList) {
                        this.requestDB = dbName;
                        let isCurDB: boolean = await this.isDatabase(dbName);
                        if (!isCurDB) {
                            await this.copyFromAssets();
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
     * Prepare interaction with DB
     * @param method - http method (GET, POST, PUT, DELETE)
     * @param apireq - request api object or array of it
     * @param dbName - DB name
     * @returns object with array of request datas
     */
    public request(method: string, apireq: UteApis[], dbName?: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            if (!dbName) {
                dbName = this.defaultDB;
            }

            switch (method) {
                case "GET":
                    this.stMethod = this.getStorage;
                    break;
                case "POST":
                    this.stMethod = this.postStorage;
                    break;
                case "PUT":
                    this.stMethod = this.putStorage;
                    break;
                case "DELETE":
                    this.stMethod = this.deleteStorage;
                    break;
                default:
                    reject("Incorect method");
                    break;
            }

            try {
                let result: UteObjects = {};
                for (let req of apireq) {
                    let storageResult: UteObjects = await this.stMethod(req, dbName);
                    result = { ...result, ...storageResult };
                }

                resolve(result);
            } catch (error: any) {
                reject(error);
                return;
            }
        });
    }

    /**
     *
     * @param apireq
     * @param dbName
     * @returns
     */
    private getStorage(apireq: UteApis, dbName: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            let sqlDB: SQLiteDBConnection = await this.dbConnect(dbName);
            // console.log(this.sqlDB);
            try {
                const queryPR: string = `PRAGMA foreign_key_list(${apireq.table});`;
                let resultFK: any = await sqlDB.query(queryPR);
                console.log(apireq.table);
                console.log(resultFK);
                let refData: string = "";
                let pragmaList: any = {};

                if (resultFK.values.length > 0) {
                    for (let fk of resultFK.values) {
                        refData += `INNER JOIN ${fk.table} ON ${fk.table}.${fk.to} = ${apireq.table}.${fk.from}`;
                        const queryPRF: string = `PRAGMA table_info(${fk.table});`;
                        let result: any = await sqlDB.query(queryPRF);
                        pragmaList[fk.table] = result.values.map((vl: any) => vl.name);
                    }
                }
                console.log(refData);
                console.log(pragmaList);

                let sqlString: UteQueryStrings = this.sqlConvert("GET", apireq, pragmaList);
                console.log(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);
                let result: DBSQLiteValues = await sqlDB.query(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);
                console.log(result);

                resolve({ [apireq.table as string]: result.values ? result.values : [] });
            } catch (error) {
                reject(error);
                return;
            }
        });
    }

    /**
     *
     * @param apireq
     * @param dbName
     * @returns
     */
    private postStorage(apireq: UteApis, dbName: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            let sqlDB: SQLiteDBConnection = await this.dbConnect(dbName);
            // console.log(this.sqlDB);
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }

                const queryPR: string = `PRAGMA table_info(${apireq.table});`;
                let resultPR = await sqlDB.query(queryPR);
                // console.log(resultPR);
                resultPR.values?.map((vl: any) => {
                    switch (vl.dflt_value) {
                        case "'@UUID4'":
                            apireq.select && !apireq.select[vl.name] ? (apireq.select[vl.name] = v4()) : null;
                            break;
                        case "'@DATE'":
                            apireq.select && !apireq.select[vl.name] ? (apireq.select[vl.name] = new Date().toISOString()) : null;
                            break;
                    }
                });
                // console.log(apireq);

                let sqlString: UteQueryStrings = this.sqlConvert("POST", apireq);
                // console.log(`INSERT INTO ${apireq.table} ${sqlString.insert};`);
                let result: any = await sqlDB.run(`INSERT INTO ${apireq.table} ${sqlString.insert};`);

                resolve({
                    [apireq.table as string]:
                        result.changes && result.changes.lastId
                            ? {
                                  ...apireq.select,
                                  ...{ id: result.changes.lastId },
                              }
                            : [],
                });
            } catch (error) {
                reject(error);
                return;
            }
        });
    }

    /**
     *
     * @param apireq
     * @param dbName
     * @returns
     */
    private putStorage(apireq: UteApis, dbName: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            let sqlDB: SQLiteDBConnection = await this.dbConnect(dbName);
            // console.log(this.sqlDB);
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }
                let sqlString: UteQueryStrings = this.sqlConvert("PUT", apireq);
                // console.log(`UPDATE ${apireq.table} SET ${sqlString.update} WHERE ${sqlString.where};`);

                await sqlDB.run(`UPDATE ${apireq.table} SET ${sqlString.update} WHERE ${sqlString.where};`);

                resolve({
                    [apireq.table as string]: apireq.select,
                });
            } catch (error) {
                reject(error);
                return;
            }
        });
    }

    /**
     *
     * @param apireq
     * @param dbName
     * @returns
     */
    private deleteStorage(apireq: UteApis, dbName: string): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            let sqlDB: SQLiteDBConnection = await this.dbConnect(dbName);
            // console.log(this.sqlDB);
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }
                let sqlString: UteQueryStrings = this.sqlConvert("DELETE", apireq);
                // console.log(`DELETE FROM ${apireq.table} WHERE ${sqlString.where};`);

                await sqlDB.run(`DELETE FROM ${apireq.table} WHERE ${sqlString.where};`);
                resolve({
                    [apireq.table as string]: apireq.where,
                });
            } catch (error) {
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
     *
     * @param method
     * @param apireq
     * @returns
     */
    private sqlConvert(method: string, apireq: UteApis, refs: UteObjects | null = null): UteQueryStrings {
        apireq.noref ? (refs = null) : null;
        let selectArray: any = apireq.select && Array.isArray(apireq.select) ? JSON.parse(JSON.stringify(apireq.select)) : apireq.select;

        if (typeof selectArray === "object" && typeof selectArray != "string") {
            if (method === ("POST" || "PUT")) {
                delete selectArray.id;
                delete selectArray.sysData;
            }
        }

        let stringSelect = (): string => {
            return this.genSelect(selectArray, apireq, refs).join(", ");
        };

        let stringInsert = (): string => {
            return selectArray
                ? `(${Object.keys(selectArray).join(", ")}) ${UteQuerySysParams.val} (${Object.values(selectArray)
                      .map((st: any) => (typeof st === "string" ? `'${st}'` : st))
                      .join(", ")})`
                : "";
        };

        let stringUpdate = (): string => {
            return selectArray
                ? `${Object.keys(selectArray)
                      .map((st: any) => `${st} = ${typeof selectArray[st] === "string" ? `'${selectArray[st]}'` : selectArray[st]}`)
                      .join(", ")}`
                : "";
        };

        let stringWhere = (): string => {
            return apireq.where ? this.genWhere(apireq.where) : "";
        };

        switch (method) {
            case "POST":
                return {
                    insert: stringInsert(),
                };
            case "PUT":
                return {
                    update: stringUpdate(),
                    where: stringWhere(),
                };
            case "DELETE":
                return {
                    where: stringWhere(),
                };
            default:
                return {
                    select: stringSelect(),
                    where: stringWhere(),
                };
        }
    }

    /**
     *
     * @param select
     * @param apireq
     * @param refs
     * @returns
     */
    private genSelect(select: any, apireq: UteApis, refs: any): string[] {
        if (!select) {
            select = refs ? [...[`${apireq.table}.*`], ...this.genRefs(refs)] : ["*"];
        } else {
            if (Array.isArray(select)) {
                if (refs) {
                    select = select.map((sa: string) => {
                        sa = `${apireq.table}.${sa}`;
                        return sa;
                    });
                    if (refs != "refs") {
                        select = [...select, ...this.genRefs(refs)];
                    }
                }
            } else if (typeof select === "string" && select.toLowerCase() === "count") {
                select = [`${UteQuerySysParams.cou}(*)`];
            } else if (typeof select === "object") {
                let newSelect: string[] = [];
                Object.values(select).map((stv: any, istv: number) => {
                    let table: string = Object.keys(select)[istv];
                    if (table === apireq.table) {
                        newSelect = [...newSelect, ...this.genSelect(stv, { table: table, select: stv }, "refs")];
                    } else {
                        newSelect = [...newSelect, ...this.genRefs(refs, { table: table, value: stv })];
                    }
                });
                select = newSelect;
            } else {
                select = ["*"];
            }
        }
        return select;
    }

    /**
     *
     * @param refs
     * @param filter
     * @returns
     */
    private genRefs(refs: any, filter?: { table: string; value: string[] }): string[] {
        if (refs) {
            let refsArray: string[] = [];
            if (filter) {
                refsArray = refs[filter.table]
                    .filter((rf: string) => filter.value.some((fl: string) => fl === rf))
                    .map((rv: string) => `${filter.table}.${rv} ${UteQuerySysParams.as} ${filter.table}_${rv}`);
            } else {
                Object.values<string[]>(refs).map((rc: string[], irc: number) => {
                    let table: string = Object.keys(refs)[irc];
                    refsArray = rc.map((rv: string) => `${table}.${rv} ${UteQuerySysParams.as} ${table}_${rv}`);
                });
            }
            return refsArray;
        } else {
            return [];
        }
    }

    /**
     *
     * @param obj
     * @returns
     */
    private convertToSQL(obj: any) {
        let operator = Object.keys(obj)[0];
        const conditions = obj[operator].map((conditionObj: any) => {
            if (typeof conditionObj === "object") {
                const innerKey = Object.keys(conditionObj)[0];

                const innerValue = conditionObj[innerKey];
                if (typeof innerValue === "object") {
                    return `${innerKey} ${this.genWhere(innerValue)}`;
                } else {
                    return `${innerKey} = ${typeof innerValue === "string" ? `'${innerValue}'` : innerValue}`;
                }
            } else {
                return `'${conditionObj}'`;
            }
        });

        return `${conditions.join(` ${operator} `)}`;
    }

    /**
     *
     * @param data
     * @returns
     */
    private genWhere(data: any) {
        const topLevelConditions = [];

        for (let key in data) {
            if (Array.isArray(data[key])) {
                const subConditions = data[key].map((subObj: any) => {
                    if (Array.isArray(subObj[Object.keys(subObj)[0]])) {
                        return this.convertToSQL(subObj);
                    } else {
                        return this.convertToSQL({ [key]: [subObj] });
                    }
                });

                if (key === UteQueryWRParams.bet) {
                    topLevelConditions.push(`${key} ${subConditions.join(` ${UteQueryWRParams.and} `)}`);
                } else if (key === UteQueryWRParams.in) {
                    topLevelConditions.push(`${key} (${subConditions.join(`, `)})`);
                } else {
                    topLevelConditions.push(subConditions.join(` ${key} `));
                }
            } else if (typeof data[key] === "object") {
                let sub: any = this.genWhere(data[key]);
                topLevelConditions.push(`${key} ${sub}`);
            } else {
                topLevelConditions.push(`${key} = '${data[key]}'`);
            }
        }

        return topLevelConditions.join();
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
    private createConnection(database: string, encrypted: boolean, mode: string, version: number, readonly?: boolean): Promise<SQLiteDBConnection> {
        return new Promise(async (resolve, reject) => {
            if (this.sqlite != null) {
                try {
                    const readOnly = readonly ? readonly : false;
                    const db: SQLiteDBConnection = await this.sqlite.createConnection(database, encrypted, mode, version, readOnly);
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
            if (this.sqlite != null) {
                try {
                    await this.sqlite.saveToLocalDisk(this.defaultDB);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`no connection open for ${this.defaultDB}`));
            }
        });
    }

    /**
     * Get a database from local disk and save it to store
     * @param overwrite
     * @returns
     */
    public async getFromLocalDiskToStore(overwrite?: boolean): Promise<void> {
        return new Promise(async (resolve, reject) => {
            const mOverwrite: boolean = overwrite != null ? overwrite : true;
            if (this.sqlite != null) {
                try {
                    await this.sqlite.getFromLocalDiskToStore(mOverwrite);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                reject(new Error(`can't download the database`));
            }
        });
    }

    /**
     * Copy databases from public/assets/databases folder to application databases folder
     */
    private copyFromAssets(overwrite?: boolean): Promise<void> {
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
     * Import from a Json Object
     * @param jsonstring
     */
    // public async importFromJson(jsonstring: string): Promise<void> {
    //     return new Promise(async (resolve, reject) => {
    //         if(this.sqlite != null) {
    //             try {
    //                 resolve(await this.sqlite.importFromJson(jsonstring));
    //             } catch (error) {
    //                 reject(error);
    //             }
    //         } else {
    //             reject(new Error(`no connection open`));
    //         }
    //     });
    // }

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
}
