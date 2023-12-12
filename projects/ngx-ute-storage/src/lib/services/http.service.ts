import { Injectable } from "@angular/core";
import { DBSQLiteValues, SQLiteDBConnection } from "@capacitor-community/sqlite";
import { UteApis } from "../interfaces/api";
import { UteObjects } from "../interfaces/object";
import { UteQueryStrings, UteQuerySysParams } from "../interfaces/query";
import { SqlService } from "./sql.service";
import { v4 } from "uuid";
import { ApiConst } from "../contantes/api";

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
            let newObject = Object.entries(rq).map(([key, value]) => {
                let newKey: string = key;
                Object.keys(ApiConst).map((apiKey: string, i: number) => {
                    if (apiKey === key) {
                        newKey = Object.values(ApiConst)[i];
                    }
                });
                return [newKey, value];
            });
            return Object.fromEntries(newObject);
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

            let mergeObjects = (obj1: any, obj2: any) => {
                let result: any = {};

                // Merge properties from obj1
                Object.keys(obj1).forEach((key) => {
                    if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
                        result[key] = [...obj1[key], ...obj2[key]];
                    } else {
                        result[key] = obj1[key];
                    }
                });

                // Merge properties from obj2 that are not in obj1
                Object.keys(obj2).forEach((key) => {
                    if (!obj1.hasOwnProperty(key)) {
                        result[key] = obj2[key];
                    }
                });

                return result;
            };

            try {
                let result: UteObjects = {};
                for (let req of apireq) {
                    let storageResult: UteObjects = await this.stMethod(req, sqlDB);
                    // result = { ...result, ...storageResult };
                    result = mergeObjects(result, storageResult);
                }
                console.log("result", result);

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
                let refData: string = "";
                let pragmaList: any = {};
                let pragmaTables: string[] = [];
                if (apireq.select && typeof apireq.select === "string" && apireq.select.includes("COUNT")) {
                    apireq.noref = true;
                }

                if (!apireq.noref) {
                    const queryPR: string = `PRAGMA foreign_key_list(${apireq.table});`;
                    let resultFK: any = await sqlDB.query(queryPR);

                    if (resultFK.values.length > 0) {
                        for (let fk of resultFK.values) {
                            refData += ` LEFT JOIN ${fk.table} ON ${fk.table}.${fk.to} = ${apireq.table}.${fk.from}`;
                            const queryPRF: string = `PRAGMA table_info(${fk.table});`;
                            let result: any = await sqlDB.query(queryPRF);
                            pragmaList[fk.table] = result.values.map((vl: any) => vl.name);
                            pragmaTables.push(fk.table);
                        }
                    }
                }

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("GET", apireq, pragmaList);

                // console.log(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);

                let result: DBSQLiteValues = await sqlDB.query(`SELECT ${sqlString.select} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`);

                if (result.values && pragmaTables && pragmaTables.length > 0) {
                    let newResult: UteObjects = this.convertToObjects(result.values, pragmaTables);
                    resolve({ [apireq.table as string]: newResult });
                } else if (result.values) {
                    if (sqlString.select?.includes("COUNT")) {
                        resolve({ [apireq.table as string]: result.values[0]["COUNT(*)"] });
                    } else {
                        resolve({ [apireq.table as string]: result.values });
                    }
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
                            apireq.select && !apireq.select[vl.name] ? ((apireq.select as UteObjects)[vl.name] = v4()) : null;
                            break;
                        case "'@DATE'":
                            apireq.select && !apireq.select[vl.name] ? ((apireq.select as UteObjects)[vl.name] = new Date()) : null;
                            break;
                    }
                });

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("POST", apireq);

                console.log(`INSERT INTO ${apireq.table} ${sqlString.insert};`);

                let result: any = await sqlDB.run(`INSERT INTO ${apireq.table} ${sqlString.insert} ${UteQuerySysParams.ren} *;`);

                console.log(result);

                resolve({
                    [apireq.table as string]: result.values,
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

                // console.log(`UPDATE ${apireq.table} SET ${sqlString.update} WHERE ${sqlString.where};`);

                await sqlDB.query(`UPDATE ${apireq.table} SET ${sqlString.update} WHERE ${sqlString.where};`);

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

                // console.log(`DELETE FROM ${apireq.table} WHERE ${sqlString.where};`);

                await sqlDB.query(`DELETE FROM ${apireq.table} WHERE ${sqlString.where};`);
                resolve({
                    [apireq.table as string]: [apireq.where],
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
                            const newKey: string = key.replace(`${table}_`, "").charAt(0).toLowerCase() + key.replace(`${table}_`, "").slice(1);

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

            const processObject = (obj: any) => {
                for (const key in newObject) {
                    if (typeof obj[key] === "object" && obj[key] !== null) {
                        obj[key] = processObject(obj[key]);
                    }
                }

                const allNull = Object.values(obj).every((value) => value === null);

                return allNull ? null : obj;
            };

            newObject = processObject(newObject);

            newObjects.push(newObject);
        });

        return newObjects;
    }
}
