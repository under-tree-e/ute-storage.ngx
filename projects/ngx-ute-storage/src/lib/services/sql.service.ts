import { Injectable } from "@angular/core";
import { UteApis } from "../interfaces/api";
import { UteObjects } from "../interfaces/object";
import { UteQueryStrings, UteQuerySysParams, UteQueryWRParams } from "../interfaces/query";

@Injectable({
    providedIn: "root",
})
export class SqlService {
    constructor() {}

    /**
     *
     * @param method
     * @param apireq
     * @returns
     */
    public sqlConvert(method: string, apireq: UteApis, refs: UteObjects | null = null): UteQueryStrings {
        apireq.noref || (refs && Object.keys(refs).length === 0) ? (refs = null) : null;

        let selectArray: any = apireq.select && Array.isArray(apireq.select) ? JSON.parse(JSON.stringify(apireq.select)) : apireq.select;

        if (typeof selectArray === "object" && typeof selectArray != "string") {
            if (method === ("POST" || "PUT")) {
                delete selectArray.id;
            }
        }

        let stringSelect = (): string => {
            return this.genSelect(selectArray, apireq, refs).join(", ");
        };

        let stringInsert = (): string => {
            if (selectArray) {
                const names: string[] = (refs as any[]).filter((r: any) => r.name !== "id").map((r: any) => r.name);
                let values: any[] = selectArray.map((s: any) => {
                    let vl: any[] = [];
                    names.map((n: string) => {
                        if (s[n] === undefined) {
                            vl.push(`NULL`);
                        } else {
                            let val = s[n];
                            if (typeof val === "string" && val) {
                                val = `'${val}'`;
                            } else if (val instanceof Date) {
                                val = `'${new Date(val).toISOString()}'`;
                            } else if (val === "NULL" || val === "") {
                                val = `NULL`;
                            }
                            vl.push(val);
                        }
                    });
                    return vl;
                });

                return `(${names.join(", ")}) ${UteQuerySysParams.val} (${values.join("), (")})`;
            } else {
                return "";
            }
        };

        let stringUpdate = (): string => {
            if (selectArray) {
                selectArray = Object.fromEntries(Object.entries(selectArray));
            }

            return selectArray
                ? `${Object.keys(selectArray)
                      .map((st: any) => {
                          let val = selectArray[st];
                          if (typeof val === "string" && val) {
                              val = `'${val}'`;
                          } else if (val instanceof Date) {
                              val = `'${new Date(val).toISOString()}'`;
                          } else if (val === "NULL" || val === "") {
                              val = `NULL`;
                          }
                          return `${st} = ${val}`;
                      })
                      .join(", ")}`
                : "";
        };

        let stringWhere = (): string => {
            return apireq.where ? this.genWhere(apireq.where, refs ? apireq.table : null) : "";
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
            } else if (typeof select === "string" && select.toUpperCase() === UteQuerySysParams.cou) {
                select = [`${UteQuerySysParams.cou}(*)`];
            } else if (typeof select === "string" && select.toUpperCase().includes(UteQuerySysParams.cou)) {
                select = [`${select.charAt(0).toUpperCase() + select.slice(1)}`];
            } else if (typeof select === "string" && select.toUpperCase().includes(UteQuerySysParams.sum)) {
                const regex = /SUM\('([^']+)'\)(?: as (\w+))?/i;
                const match = select.match(regex);

                if (match) {
                    const value = match[1];
                    const name = match[2] || null;
                    select = [`${UteQuerySysParams.sum}(${value})${name ? ` as ${name}` : ""}`];
                } else {
                    select = [select];
                }
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
                let array: string[] = refs[filter.table]
                    .filter((rf: string) => filter.value.some((fl: string) => fl === rf))
                    .map((rv: string) => `${filter.table}.${rv} ${UteQuerySysParams.as} ${filter.table}_${rv}`);
                refsArray = [...refsArray, ...array];
            } else {
                Object.values<string[]>(refs).map((rc: string[], irc: number) => {
                    let table: string = Object.keys(refs)[irc];
                    let array: string[] = rc.map((rv: string) => `${table}.${rv} ${UteQuerySysParams.as} ${table}_${rv}`);
                    refsArray = [...refsArray, ...array];
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
    private convertToSQL(obj: any, refs: any) {
        let operator = Object.keys(obj)[0];
        const conditions = obj[operator].map((conditionObj: any) => {
            if (typeof conditionObj === "object") {
                const innerKey = Object.keys(conditionObj)[0];

                const innerValue = conditionObj[innerKey];
                if (typeof innerValue === "object") {
                    return `${refs ? `${refs}.${innerKey}` : innerKey} ${this.genWhere(innerValue, refs)}`;
                } else {
                    return `${refs ? `${refs}.${innerKey}` : innerKey} = ${typeof innerValue === "string" ? `'${innerValue}'` : innerValue}`;
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
    private genWhere(data: any, refs: any) {
        const topLevelConditions = [];

        for (let key in data) {
            if (Array.isArray(data[key])) {
                const subConditions = data[key].map((subObj: any) => {
                    if (Array.isArray(subObj[Object.keys(subObj)[0]])) {
                        return this.convertToSQL(subObj, refs);
                    } else {
                        return this.convertToSQL({ [key]: [subObj] }, refs);
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
                let sub: any = this.genWhere(data[key], refs);
                topLevelConditions.push(`${refs ? `${refs}.${key}` : key} ${sub}`);
            } else {
                if (key === UteQueryWRParams.lik || key === UteQueryWRParams.likN) {
                    topLevelConditions.push(`${key} '${data[key]}'`);
                } else if (key === UteQueryWRParams.not) {
                    topLevelConditions.push(`IS ${key} '${data[key]}'`);
                } else if (key === UteQueryWRParams.is) {
                    topLevelConditions.push(`${key} '${data[key]}'`);
                } else if (key === UteQueryWRParams.gt || key === UteQueryWRParams.gte || key === UteQueryWRParams.lt || key === UteQueryWRParams.lte) {
                    switch (key) {
                        case UteQueryWRParams.gt:
                            topLevelConditions.push(`> '${data[key]}'`);
                            break;
                        case UteQueryWRParams.gte:
                            topLevelConditions.push(`>= '${data[key]}'`);
                            break;
                        case UteQueryWRParams.lt:
                            topLevelConditions.push(`< '${data[key]}'`);
                            break;
                        case UteQueryWRParams.lte:
                            topLevelConditions.push(`<= '${data[key]}'`);
                            break;
                    }
                } else {
                    let value: any = typeof data[key] === "string" ? `'${data[key]}'` : data[key];

                    topLevelConditions.push(`${refs ? `${refs}.${key}` : key} = ${value}`);
                }
            }
        }

        return topLevelConditions.join();
    }
}
