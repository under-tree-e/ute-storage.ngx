import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { lastValueFrom } from "rxjs";
// import { environment } from "src/environments/environment";
import { PlatformLocation } from "@angular/common";
// import { UteObjects } from "@interfaces/object";
// import { UteApis } from "@interfaces/api";
// import { CustomHeaderData, HttpOptions } from "@interfaces/http-opt";
// import { ApiConst } from "src/constantes/api";
import * as qs from "qs";
import { Capacitor } from "@capacitor/core";
import { UteObjects } from "../interfaces/object";
import { UteApis } from "../interfaces/api";
import { ApiConst } from "../contantes/api";

@Injectable({
    providedIn: "root",
})
export class CoreHttpService {
    private options: {
        body?: any;
        headers?: HttpHeaders | undefined;
    } = {};

    constructor(private http: HttpClient, private platformLocation: PlatformLocation) {
        this.Init();
    }

    public async Init() {
        console.log("HttpService - Init");
        // console.log(`${new Date().toISOString()} => HttpService`);

        let deviceId: string = "";
        try {
            deviceId = await this.httpLocal("assets/deviceId");
        } catch {}
        this.options = {
            headers: new HttpHeaders({
                "Content-Type": "application/json",
                Session: btoa(
                    JSON.stringify({
                        deviceId: deviceId,
                        device: Capacitor.getPlatform(),
                        date: new Date().toISOString().split("T")[0],
                    })
                ),
            }),
        };
    }

    private httpAddress(): string {
        const link: string = environment.server ? environment.server : `${location.protocol}//${location.host}${this.platformLocation.getBaseHrefFromDOM()}`;
        return `${link}${link.endsWith("/") ? "api/" : "/api/"}`;
    }

    /**
     * Get data from local files
     * @param path - path to file
     * @returns data from file OR error
     */
    public httpLocal<T>(path: string): Promise<T> {
        return new Promise((resolve, reject) => {
            lastValueFrom(this.http.get<T>(path))
                .then((response: any) => {
                    resolve(response);
                })
                .catch((error: any) => {
                    reject(error);
                });
        });
    }

    /**
     * Send request to server
     * @param sqlMethod - SQL method `('GET', 'POST', 'PUT', 'DELETE'...)`
     * @param json - request body
     * @param httpOptions - additional option as *`custom DB (only local)`*, *`Auth token`* and *`local storage service`*
     * @returns
     */
    public httpRequest(sqlMethod: string, json: UteApis[]): Promise<UteObjects> {
        return new Promise(async (resolve, reject) => {
            let response: any = {};
            try {
                sqlMethod = sqlMethod.toUpperCase();

                // Declare base parameters
                let reqMethod: string = "http";
                let jsonConvert: UteObjects = { body: [] };
                let jsonMethods: UteApis[] = json.filter((js: UteApis) => js.method);

                // Check if only one method and not default
                if (jsonMethods.length > 0) {
                    if (jsonMethods.length > 1) {
                        reject("Http request not supported multiple Methods");
                        return;
                    }
                    reqMethod = jsonMethods[0].method as string;
                    jsonConvert["body"] = [jsonMethods[0].select];
                } else {
                    jsonConvert["body"] = json.map((rq: any) => {
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
                }

                let rp: any = {
                    u: `${this.httpAddress()}${reqMethod}`,
                    b: jsonConvert["body"],
                    o: this.options,
                };

                // Convert method to function
                let httpMethod: any = this.http.get(rp.u, rp.o);
                switch (sqlMethod) {
                    case "GET":
                        let jsonString = qs.stringify(jsonConvert);
                        if (jsonString.length > 5000) {
                            throw "GET request too long!";
                        }

                        httpMethod = this.http.get(`${this.httpAddress()}${reqMethod}${jsonString ? "?" + jsonString : ""}`, this.options);
                        break;
                    case "POST":
                        httpMethod = this.http.post(rp.u, rp.b, rp.o);
                        break;
                }

                // Send request
                response = await lastValueFrom(httpMethod);
                resolve(response);
            } catch (error) {
                reject(error);
            }
        });
    }
}
