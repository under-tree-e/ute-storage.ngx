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
}
