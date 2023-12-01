import { Injectable } from "@angular/core";
import { DBSQLiteValues, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { UteApis } from "../interfaces/api";
import { UteObjects } from "../interfaces/object";
import { UteQueryStrings } from "../interfaces/query";
import { SqlService } from "./sql.service";
import { v4 } from "uuid";

@Injectable({
    providedIn: "root",
})
export class HttpService {
    private stMethod: typeof this.getSql | typeof this.postSql | typeof this.putSql | typeof this.deleteSql = null!;

    constructor(private sqlService: SqlService) {}

    /**
     * Prepare interaction with DB
     * @param method - http method (GET, POST, PUT, DELETE)
     * @param apireq - request api object or array of it
     * @param dbName - DB name
     * @returns object with array of request datas
     */
    public request(method: string, apireq: UteApis[], sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        apireq = apireq.map((rq: any) => {
            let newApi: UteApis = {
                table: rq.tb,
            };
            rq.st ? (newApi.select = rq.st) : null;
            rq.wr ? (newApi.where = rq.wr) : null;
            rq.or ? (newApi.order = rq.or) : null;
            rq.no ? (newApi.noref = rq.no) : null;
            return newApi;
        });

        return new Promise(async (resolve, reject) => {
            switch (method) {
                case "GET":
                    this.stMethod = this.getSql;
                    break;
                case "POST":
                    this.stMethod = this.postSql;
                    break;
                case "PUT":
                    this.stMethod = this.putSql;
                    break;
                case "DELETE":
                    this.stMethod = this.deleteSql;
                    break;
                default:
                    reject("Incorect method");
                    break;
            }

            try {
                let result: UteObjects = {};
                for (let req of apireq) {
                    let storageResult: UteObjects = await this.stMethod(req, sqlDB);
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
    private getSql(apireq: UteApis, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                const queryPR: string = `PRAGMA foreign_key_list(${apireq.table});`;
                let resultFK: any = await sqlDB.query(queryPR);

                let refData: string = "";
                let pragmaList: any = {};
                let pragmaTables: string[] = [];

                if (resultFK.values.length > 0) {
                    for (let fk of resultFK.values) {
                        refData += ` INNER JOIN ${fk.table} ON ${fk.table}.${fk.to} = ${apireq.table}.${fk.from}`;
                        const queryPRF: string = `PRAGMA table_info(${fk.table});`;
                        let result: any = await sqlDB.query(queryPRF);
                        pragmaList[fk.table] = result.values.map((vl: any) => vl.name);
                        pragmaTables.push(fk.table);
                    }
                }

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("GET", apireq, pragmaList);

                // console.log(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);

                let result: DBSQLiteValues = await sqlDB.query(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);

                if (result.values && pragmaTables) {
                    let newResult: UteObjects = this.convertToObjects(result.values, pragmaTables);
                    if (sqlString.select?.includes("COUNT")) {
                        resolve({ [apireq.table as string]: newResult[0] });
                    } else {
                        resolve({ [apireq.table as string]: newResult });
                    }
                } else if (result.values) {
                    resolve({ [apireq.table as string]: result.values });
                } else {
                    resolve([]);
                }
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
    private postSql(apireq: UteApis, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }

                const queryPR: string = `PRAGMA table_info(${apireq.table});`;
                let resultPR = await sqlDB.query(queryPR);
                resultPR.values?.map(async (vl: any) => {
                    switch (vl.dflt_value) {
                        case "'@UUID4'":
                            apireq.select && !apireq.select[vl.name] ? (apireq.select[vl.name] = v4()) : null;
                            break;
                        case "'@DATE'":
                            apireq.select && !apireq.select[vl.name] ? (apireq.select[vl.name] = new Date().toISOString()) : null;
                            break;
                    }
                });

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("POST", apireq);
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
    private putSql(apireq: UteApis, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }
                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("PUT", apireq);

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
    private deleteSql(apireq: UteApis, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }
                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("DELETE", apireq);

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
     * @param item
     * @param tables
     * @returns
     */
    private convertToObjects(items: UteObjects[], tables: string[]) {
        let newObjects: UteObjects[] = [];

        items.map((item: UteObjects) => {
            let newObject: UteObjects = {};

            for (const key in item) {
                if (key === "COUNT(*)") {
                    newObject = item[key];
                } else {
                    let value: UteObjects = item[key];
                    let found: boolean = false;

                    for (const table of tables) {
                        if (key.includes(table)) {
                            found = true;
                            const newKey: string = key.replace(table, "").charAt(0).toLowerCase() + key.replace(table, "").slice(1);

                            if (!newObject[table]) {
                                newObject[table] = {};
                            }

                            newObject[table][newKey] = value;
                        }
                    }

                    if (!found) {
                        newObject[key] = value;
                    }
                }
            }

            newObjects.push(newObject);
        });

        return newObjects;
    }
}
