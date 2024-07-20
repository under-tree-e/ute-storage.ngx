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
    public request(method: string, apireq: UteApis[], models: UteObjects, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
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
                    // Remove incorrect fields from request
                    if (req.select && !Array.isArray(req.select) && typeof req.select === "object") {
                        const queryPRF: string = `PRAGMA table_info(${req.table});`;
                        let result: any = await sqlDB.query(queryPRF);

                        let filterSelect: any = {};
                        Object.keys(req.select).map((rs: string, irs: number) => {
                            if (result.values.some((vl: any) => rs === vl.name)) {
                                filterSelect[rs] = Object.values(req.select as any)[irs];
                            }
                        });
                        req.select = filterSelect;
                    }

                    let storageResult: UteObjects = await this.stMethod(req, models, sqlDB);
                    result = mergeObjects(result, storageResult);
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
    private getSql(apireq: UteApis, models: UteObjects, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                let refData: string = "";
                let pragmaList: any = {};
                let pragmaTables: string[] = [];
                if (
                    apireq.select &&
                    typeof apireq.select === "string" &&
                    (apireq.select.toUpperCase().includes(UteQuerySysParams.cou) || apireq.select.toUpperCase().includes(UteQuerySysParams.sum))
                ) {
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

                const sqlString: UteQueryStrings = this.sqlService.sqlConvert("GET", apireq, pragmaList);
                let selectString: string = `SELECT ${sqlString.select || "*"} FROM ${apireq.table} ${refData ? refData : ""} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`;
                selectString = selectString.replace(/(\s{2,})/g, " ");

                let result: DBSQLiteValues = await sqlDB.query(selectString);

                if (models[apireq.table!] && Array.isArray(models[apireq.table!]._secure) && result.values) {
                    models[apireq.table!]._secure.map((sf: string) => {
                        result.values!.map((item: any) => {
                            delete item[sf];
                        });
                    });
                }

                if (result.values && pragmaTables && pragmaTables.length > 0) {
                    let newResult: UteObjects[] = this.convertToObjects(result.values, pragmaTables);
                    resolve({ [apireq.table as string]: await this.converter(apireq.table!, newResult, sqlDB, pragmaTables) });
                } else if (result.values) {
                    if (sqlString.select?.includes(UteQuerySysParams.cou)) {
                        if (sqlString.select.toUpperCase() === UteQuerySysParams.cou) {
                            resolve({ [(apireq.table as string) + "Count"]: result.values[0][`${UteQuerySysParams.cou}(*)`] });
                        } else {
                            resolve({ [(apireq.table as string) + "Count"]: result.values[0][sqlString.select] });
                        }
                    } else if (sqlString.select?.includes(UteQuerySysParams.sum)) {
                        const regex = /SUM\(([^']+)\)(?: as (\w+))?/i;
                        const match = sqlString.select.match(regex);

                        if (match) {
                            const value = match[1];
                            const name = match[2] || null;
                            resolve({ [name ? name : (apireq.table as string) + "Sum"]: result.values[0][name ? name : `${UteQuerySysParams.sum}(${value})`] });
                        } else {
                            throw "incorect request";
                        }
                    } else {
                        resolve({ [apireq.table as string]: await this.converter(apireq.table!, result.values, sqlDB) });
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
    private postSql(apireq: UteApis, models: UteObjects, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (!Array.isArray(apireq.select)) {
                    apireq.select = [apireq.select];
                }

                const queryPR: string = `PRAGMA table_info(${apireq.table});`;
                let resultPR = await sqlDB.query(queryPR);

                resultPR.values?.map(async (vl: any) => {
                    if (vl.dflt_value) {
                        switch (vl.dflt_value) {
                            case "'@UUID4'":
                                apireq.select.map((as: UteObjects) => {
                                    as && !as[vl.name] ? (as[vl.name] = v4()) : null;
                                });
                                break;
                            case "'@DATE'":
                                apireq.select.map((as: UteObjects) => {
                                    as && !as[vl.name] ? (as[vl.name] = new Date().toISOString()) : null;
                                });
                                break;
                            default:
                                apireq.select.map((as: UteObjects) => {
                                    if (as && !as[vl.name]) {
                                        if (vl.dflt_value.startsWith("'") && vl.dflt_value.endsWith("'")) {
                                            as[vl.name] = vl.dflt_value.slice(1, -1);
                                        } else {
                                            as[vl.name] = vl.dflt_value;
                                        }
                                    }
                                });
                                break;
                        }
                    }
                });

                if (models[apireq.table!] && typeof models[apireq.table!]._stamp === "object") {
                    const stamps: any = models[apireq.table!]._stamp;
                    if (stamps.time && typeof stamps.time === "boolean") {
                        apireq.select.map((s: any) => {
                            s.createdAt = new Date().toISOString();
                            s.updatedAt = new Date().toISOString();
                        });
                    } else if (stamps.time && typeof stamps.time === "object") {
                        if (stamps.time.createdAt) {
                            if (typeof stamps.time.createdAt === "string") {
                                apireq.select.map((s: any) => {
                                    s[stamps.time.createdAt] = new Date().toISOString();
                                });
                            } else {
                                apireq.select.map((s: any) => {
                                    s.createdAt = new Date().toISOString();
                                });
                            }
                        }
                        if (stamps.time.updatedAt) {
                            if (typeof stamps.time.updatedAt === "string") {
                                apireq.select.map((s: any) => {
                                    s[stamps.time.updatedAt] = new Date().toISOString();
                                });
                            } else {
                                apireq.select.map((s: any) => {
                                    s.updatedAt = new Date().toISOString();
                                });
                            }
                        }
                    }

                    if (apireq.user) {
                        if (stamps.user && typeof stamps.user === "boolean") {
                            apireq.select.map((s: any) => {
                                s.createdBy = apireq.user;
                                s.updatedBy = apireq.user;
                            });
                        } else if (stamps.user && typeof stamps.user === "object") {
                            if (stamps.user.createdBy) {
                                if (typeof stamps.user.createdBy === "string") {
                                    apireq.select.map((s: any) => {
                                        s[stamps.time.createdBy] = apireq.user;
                                    });
                                } else {
                                    apireq.select.map((s: any) => {
                                        s.createdBy = apireq.user;
                                    });
                                }
                            }
                            if (stamps.user.updatedBy) {
                                if (typeof stamps.user.updatedBy === "string") {
                                    apireq.select.map((s: any) => {
                                        s[stamps.time.updatedBy] = apireq.user;
                                    });
                                } else {
                                    apireq.select.map((s: any) => {
                                        s.updatedBy = apireq.user;
                                    });
                                }
                            }
                        }
                    }
                }

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("POST", apireq, resultPR.values);
                let createString: string = `INSERT INTO ${apireq.table} ${sqlString.insert}`;
                createString = createString.replace(/(\s{2,})/g, " ");

                let result: any = await sqlDB.run(createString);

                result = await this.getSql(
                    {
                        table: apireq.table,
                        where: {
                            id: result.changes.lastId,
                        },
                    },
                    models,
                    sqlDB
                );

                if (Array.isArray(models[apireq.table!]._secure) && result.values) {
                    models[apireq.table!]._secure.map((sf: string) => {
                        result.values!.map((item: any) => {
                            delete item[sf];
                        });
                    });
                }

                resolve(result);
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
    private putSql(apireq: UteApis, models: UteObjects, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }

                if (models[apireq.table!] && typeof models[apireq.table!]._stamp === "object") {
                    const stamps: any = models[apireq.table!]._stamp;
                    if (stamps.time && typeof stamps.time === "boolean") {
                        apireq.select.updatedAt = new Date().toISOString();
                    } else if (stamps.time && typeof stamps.time === "object") {
                        if (stamps.time.updatedAt) {
                            if (typeof stamps.time.updatedAt === "string") {
                                apireq.select[stamps.time.updatedAt] = new Date().toISOString();
                            } else {
                                apireq.select.updatedAt = new Date().toISOString();
                            }
                        }
                    }

                    if (apireq.user) {
                        if (stamps.user && typeof stamps.user === "boolean") {
                            apireq.select.updatedBy = apireq.user;
                        } else if (stamps.user && typeof stamps.user === "object") {
                            if (stamps.user.updatedBy) {
                                if (typeof stamps.user.updatedBy === "string") {
                                    apireq.select[stamps.time.updatedBy] = apireq.user;
                                } else {
                                    apireq.select.updatedBy = apireq.user;
                                }
                            }
                        }
                    }
                }

                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("PUT", apireq);
                let updateString: string = `UPDATE ${apireq.table} SET ${sqlString.update} ${sqlString.where ? `WHERE ${sqlString.where}` : ""};`;
                updateString = updateString.replace(/(\s{2,})/g, " ");

                await sqlDB.run(updateString);

                let result = await this.getSql(
                    {
                        table: apireq.table,
                        where: apireq.where,
                    },
                    models,
                    sqlDB
                );

                if (Array.isArray(models[apireq.table!]._secure) && result[apireq.table as any]) {
                    models[apireq.table!]._secure.map((sf: string) => {
                        result[apireq.table as any]!.map((item: any) => {
                            delete item[sf];
                        });
                    });
                }

                resolve(result);

                // resolve({
                //     [apireq.table as string]: apireq.select,
                // });
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
    private deleteSql(apireq: UteApis, models: UteObjects, sqlDB: SQLiteDBConnection): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                if (Array.isArray(apireq.select)) {
                    reject("request not object");
                    return;
                }
                let sqlString: UteQueryStrings = this.sqlService.sqlConvert("DELETE", apireq);
                let deleteString: string = `DELETE FROM ${apireq.table} ${sqlString.where ? "WHERE " + sqlString.where : ""};`;
                deleteString = deleteString.replace(/(\s{2,})/g, " ");

                await sqlDB.run(deleteString);

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
                if (key === `${UteQuerySysParams.cou}(*)`) {
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

    private converter(table: string, values: any[], sqlDB: SQLiteDBConnection, refs?: string[]): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            try {
                values = await this.boolConverter(table, values, sqlDB, refs);
                values = await this.dateConverter(table, values, sqlDB, refs);
                resolve(values);
            } catch (error) {
                reject(error);
            }
        });
    }

    private boolConverter(table: string, values: any[], sqlDB: SQLiteDBConnection, refs?: string[]): Promise<UteObjects[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const queryPR: string = `PRAGMA table_info(${table});`;
                let resultPR: any = await sqlDB.query(queryPR);
                resultPR.values.map((fr: any) => {
                    if (fr.type === "BOOLEAN") {
                        values = values.map((vl: any) => {
                            if (vl && vl[fr.name] != undefined) {
                                vl[fr.name] = vl[fr.name] ? true : false;
                            }
                            if (refs && refs.length > 0) {
                                refs.map(async (rf: string) => {
                                    let array: any = await this.boolConverter(rf, [vl[rf]], sqlDB);
                                    vl[rf] = array[0];
                                });
                            }
                            return vl;
                        });
                    }
                });

                resolve(values);
            } catch (error) {
                reject(error);
            }
        });
    }

    private dateConverter(table: string, values: any[], sqlDB: SQLiteDBConnection, refs?: string[]): Promise<UteObjects[]> {
        return new Promise(async (resolve, reject) => {
            try {
                const queryPR: string = `PRAGMA table_info(${table});`;
                let resultPR: any = await sqlDB.query(queryPR);
                resultPR.values.map((fr: any) => {
                    if (fr.type === "DATE" || fr.type === "DATETIME") {
                        values = values.map((vl: any) => {
                            if (vl[fr.name] != undefined) {
                                vl[fr.name] = vl[fr.name] ? new Date(vl[fr.name]) : null;
                            }
                            if (refs && refs.length > 0) {
                                refs.map(async (rf: string) => {
                                    let array: any = await this.boolConverter(rf, [vl[rf]], sqlDB);
                                    vl[rf] = array[0];
                                });
                            }
                            return vl;
                        });
                    }
                });

                resolve(values);
            } catch (error) {
                reject(error);
            }
        });
    }
}
