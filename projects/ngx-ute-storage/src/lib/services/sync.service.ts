import { Injectable } from "@angular/core";
import { UteStorageConfigs } from "../interfaces/config";
import { UteApis } from "../interfaces/api";
import { UteObjects } from "../interfaces/object";
import { ApiConst } from "../contantes/api";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { PlatformLocation } from "@angular/common";
import { Capacitor } from "@capacitor/core";
import { lastValueFrom, map } from "rxjs";

@Injectable({
    providedIn: "root",
})
export class SyncService {
    private options: {
        body?: any;
        headers?: HttpHeaders | undefined;
    } = {};

    // private syncDate: Date = new Date();
    // private tableList: string[] = ["groups", "accounts", "archives", "banks", "budgets", "categories", "clears", "goals", "records", "stores"];
    // private syncData: any = {};
    // private syncAdd: any = {};
    // private syncChange: any = {};
    // private syncRemove: any = {};

    constructor(private http: HttpClient, private platformLocation: PlatformLocation) {}

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

    public sync(config: UteStorageConfigs): Promise<any> {
        return new Promise(async (resolve, reject) => {
            try {
                await this.generateOptions();
                const serverUrl: string = `${config.syncServer}${config.syncServer?.endsWith("/") ? "api/" : "/api/"}`;

                const initAns: any = await lastValueFrom(
                    this.http.post(
                        `${serverUrl}sync`,
                        {
                            name: config.syncName,
                            date: config.syncDate,
                        },
                        this.options
                    )
                );

                if (initAns) {
                }
            } catch (error) {
                reject(error);
            }

            // let result: any = { status: 0, complete: false };
            // console.log(GlobalSession.auth);
            // console.log(public env = environment;.online);
            // console.log(public env = environment;.server);
            // console.log(GlobalSession.token);

            // if (GlobalSession.needSync) {
            // } else {
            //     result.complete = true;
            //     resolve(result);
            // }

            // if (environment.online && GlobalSession.token) {
            // 	obs.next(result);
            // 	this.getData().subscribe((status: boolean) => {
            // 		if(status){
            // 			GlobalSession.syncDate = new Date();
            // 			let json: Api = {
            // 				table: "users",
            // 				select: {"syncDate": GlobalSession.syncDate},
            // 				where: {uuid: GlobalSession.uuid}
            // 			};
            // 			this.httpService.httpRequest("PUT", json, {app: true}).subscribe(() => {
            // 				json.where.uuid = GlobalSession.auth;
            // 				this.httpService.httpRequest("PUT", json, {local: true}).subscribe(() => {});
            // 			});
            // 			this.syncAdd = {server: {}, local: {}};
            // 			this.syncChange = {server: {}, local: {}};
            // 			this.syncRemove = {server: {}, local: {}};
            // 			let localReload: Api[] = [];
            // 			Object.values(this.syncData.local).map((x: any, i: number) => {
            // 				x.map((z: any) => {
            // 					if(z.createdBy != GlobalSession.auth){
            // 						z.createdBy = GlobalSession.auth;
            // 						localReload.push({
            // 							table: (Object.keys(this.syncData.local) as any)[i],
            // 							select: {"createdBy": GlobalSession.auth},
            // 							where: {"uid": z.uid}
            // 						});
            // 					}
            // 				});
            // 			});
            // 			this.httpService.httpRequest("PUT", localReload, {app: true}).subscribe(() => {
            // 				this.getClears().subscribe((remove: any) => {
            // 					this.setSort(remove).subscribe((needSync) => {
            // 						if(needSync){
            // 							this.reloadData().subscribe(() => {
            // 								this.setData().subscribe(() => {
            // 									result.complete = true;
            // 									obs.next(result);
            // 									obs.complete();
            // 								});
            // 							});
            // 						}else{
            // 							result.complete = true;
            // 							obs.next(result);
            // 							obs.complete();
            // 						}
            // 					});
            // 				});
            // 			});
            // 		}else{
            // 			result.complete = true;
            // 			obs.next(result);
            // 			obs.complete();
            // 		}
            // 	});
            // } else {
            //     result.complete = true;
            //     resolve(result);
            // }
        });
    }

    private checkVersions() {}

    // private getData(): Observable<boolean> {
    //     this.syncData = { server: {}, local: {} };
    //     return new Observable((obs) => {
    //         // let jsons: UteApis<any>[] = this.tableList.map((x: string) => {
    //         //     return {
    //         //         // table: x,
    //         //         // select: ["uid", "changedAt", "createdBy"],
    //         //         // where: {
    //         //         // 	"createdBy": {
    //         //         // 		"IN": [GlobalSession.auth, GlobalSession.uuid]
    //         //         // 	}
    //         //         // }
    //         //     } as UteApis<any>;
    //         // });
    //         // this.httpService.httpRequest("GET", jsons, {local: true}).subscribe((serverAnswer: any) => {
    //         // 	if(serverAnswer.status == 426){
    //         // 		GlobalSession.token = "update";
    //         // 		obs.next(false);
    //         // 		obs.complete();
    //         // 	}else{
    //         // 		Object.keys(serverAnswer).map((x: any, i: number) => {
    //         // 			this.syncData.server[x] = Object.values(serverAnswer)[i];
    //         // 		});
    //         // 		this.httpService.httpRequest("GET", jsons, {app: true}).subscribe((appAnswer: any) => {
    //         // 			Object.keys(appAnswer).map((x: any, i: number) => {
    //         // 				this.syncData.local[x] = Object.values(appAnswer)[i];
    //         // 			});
    //         // 			obs.next(true);
    //         // 			obs.complete();
    //         // 		});
    //         // 	}
    //         // });
    //     });
    // }

    // private getClears(): Observable<any[]> {
    //     return new Observable((obs) => {
    //         // let json: UteApis<ClearsData> = {
    //         //     // table: "clears",
    //         //     // where: {
    //         //     // 	"createdBy": {
    //         //     // 		"IN": [GlobalSession.auth, GlobalSession.uuid]
    //         //     // 	}
    //         //     // }
    //         // };
    //         // let remove: any[] = [];
    //         // this.httpService.httpRequest("GET", json, {app: true}).subscribe((appClear: any) => {
    //         // 	this.httpService.httpRequest("GET", json, {local: true}).subscribe((serverClear: any) => {
    //         // 		appClear.clears.map((q: any) => {
    //         // 			if(!serverClear.clears.some((s: any) => s.uid == q.uid)){
    //         // 				if(!Array.isArray(this.syncAdd.local.clears)){
    //         // 					this.syncAdd.local.clears = [];
    //         // 				}
    //         // 				this.syncAdd.local.clears.push(q);
    //         // 				if(!remove.some((s: any) => s.uid == q.uid)){
    //         // 					remove.push(q);
    //         // 				}
    //         // 			}
    //         // 		});
    //         // 		serverClear.clears.map((q: any) => {
    //         // 			if(!appClear.clears.some((s: any) => s.uid == q.uid)){
    //         // 				if(!Array.isArray(this.syncAdd.local.clears)){
    //         // 					this.syncAdd.local.clears = [];
    //         // 				}
    //         // 				this.syncAdd.server.clears.push(q);
    //         // 				if(!remove.some((s: any) => s.uid == q.uid)){
    //         // 					remove.push(q);
    //         // 				}
    //         // 			}
    //         // 		});
    //         // 		obs.next(remove);
    //         // 		obs.complete();
    //         // 	});
    //         // });
    //     });
    // }

    // private setSort(remove: any[]): Observable<boolean> {
    //     return new Observable((obs) => {
    //         this.tableList.map((table: string) => {
    //             if (!this.syncData.server[table]) {
    //                 this.syncData.server[table] = [];
    //             }
    //             if (!this.syncData.local[table]) {
    //                 this.syncData.local[table] = [];
    //             }

    //             this.syncData.server[table].map((z: any) => {
    //                 let index = this.syncData.local[table].map((s: any) => s.uid).indexOf(z.uid);
    //                 if (index == -1) {
    //                     if (!remove.some((s: any) => s.uid == z.uid)) {
    //                         if (!Array.isArray(this.syncAdd.local[table])) {
    //                             this.syncAdd.local[table] = [];
    //                         }
    //                         this.syncAdd.local[table].push(z);
    //                     } else {
    //                         if (!Array.isArray(this.syncRemove.server[table])) {
    //                             this.syncRemove.server[table] = [];
    //                         }
    //                         this.syncRemove.server[table].push(z);
    //                     }
    //                 } else {
    //                     let item = this.syncData.local[table][index];
    //                     if (new Date(z.changedAt).getTime() > new Date(item.changedAt).getTime()) {
    //                         if (!remove.some((s: any) => s.uid == z.uid)) {
    //                             if (!Array.isArray(this.syncChange.local[table])) {
    //                                 this.syncChange.local[table] = [];
    //                             }
    //                             this.syncChange.local[table].push(z);
    //                         } else {
    //                             if (!Array.isArray(this.syncRemove.server[table])) {
    //                                 this.syncRemove.server[table] = [];
    //                             }
    //                             this.syncRemove.server[table].push(z);
    //                         }
    //                     }
    //                 }
    //             });
    //             this.syncData.local[table].map((z: any) => {
    //                 let index = this.syncData.server[table].map((s: any) => s.uid).indexOf(z.uid);
    //                 if (index == -1) {
    //                     if (!remove.some((s: any) => s.uid == z.uid)) {
    //                         if (!Array.isArray(this.syncAdd.server[table])) {
    //                             this.syncAdd.server[table] = [];
    //                         }
    //                         this.syncAdd.server[table].push(z);
    //                     } else {
    //                         if (!Array.isArray(this.syncRemove.local[table])) {
    //                             this.syncRemove.local[table] = [];
    //                         }
    //                         this.syncRemove.local[table].push(z);
    //                     }
    //                 } else {
    //                     let item = this.syncData.server[table][index];
    //                     if (new Date(z.changedAt).getTime() > new Date(item.changedAt).getTime()) {
    //                         if (!remove.some((s: any) => s.uid == z.uid)) {
    //                             if (!Array.isArray(this.syncChange.server[table])) {
    //                                 this.syncChange.server[table] = [];
    //                             }
    //                             this.syncChange.server[table].push(z);
    //                         } else {
    //                             if (!Array.isArray(this.syncRemove.local[table])) {
    //                                 this.syncRemove.local[table] = [];
    //                             }
    //                             this.syncRemove.local[table].push(z);
    //                         }
    //                     }
    //                 }
    //             });
    //         });

    //         if (
    //             Object.keys(this.syncAdd.server).length > 0 ||
    //             Object.keys(this.syncAdd.local).length > 0 ||
    //             Object.keys(this.syncChange.server).length > 0 ||
    //             Object.keys(this.syncChange.local).length > 0 ||
    //             Object.keys(this.syncRemove.server).length > 0 ||
    //             Object.keys(this.syncRemove.local).length > 0
    //         ) {
    //             obs.next(true);
    //             obs.complete();
    //         } else {
    //             obs.next(false);
    //             obs.complete();
    //         }
    //     });
    // }

    // private reloadData(): Observable<boolean> {
    //     return new Observable((obs) => {
    //         // let jsonsAS: UteApis<any>[] = Object.keys(this.syncAdd.server).map((x: any, ix: number) => {
    //         //     let uidList: any[] = (Object.values(this.syncAdd.server) as any)[ix].map((z: any) => z.uid);
    //         //     return {
    //         //         table: x,
    //         //         where: uidList.map((q: any) => q),
    //         //     };
    //         // });
    //         // let jsonsCS: UteApis<any>[] = Object.keys(this.syncChange.server).map((x: any, ix: number) => {
    //         //     let uidList: any[] = (Object.values(this.syncChange.server) as any)[ix].map((z: any) => z.uid);
    //         //     return {
    //         //         table: x,
    //         //         where: uidList.map((q: any) => q),
    //         //     };
    //         // });
    //         // let jsonsServer: UteApis<any>[] = [...jsonsAS, ...jsonsCS];
    //         // jsonsServer.map((x: UteApis<any>) => {
    //         //     if (Array.isArray(x.where)) {
    //         //         x.where = {
    //         //             uid: {
    //         //                 IN: x.where,
    //         //             },
    //         //         };
    //         //     }
    //         // });
    //         // let jsonsAL: UteApis<any>[] = Object.keys(this.syncAdd.local).map((x: any, ix: number) => {
    //         //     let uidList: any[] = (Object.values(this.syncAdd.local) as any)[ix].map((z: any) => z.uid);
    //         //     return {
    //         //         table: x,
    //         //         where: uidList.map((q: any) => q),
    //         //     };
    //         // });
    //         // let jsonsCL: UteApis<any>[] = Object.keys(this.syncChange.local).map((x: any, ix: number) => {
    //         //     let uidList: any[] = (Object.values(this.syncChange.local) as any)[ix].map((z: any) => z.uid);
    //         //     return {
    //         //         table: x,
    //         //         where: uidList.map((q: any) => q),
    //         //     };
    //         // });
    //         // let jsonsLocal: UteApis<any>[] = [...jsonsAL, ...jsonsCL];
    //         // jsonsLocal.map((x: UteApis<any>) => {
    //         //     if (Array.isArray(x.where)) {
    //         //         x.where = {
    //         //             uid: {
    //         //                 IN: x.where,
    //         //             },
    //         //         };
    //         //     }
    //         // });
    //         // this.httpService.httpRequest("GET", jsonsServer, {app: true}).subscribe((localReload: any) => {
    //         // 	jsonsAS.map((jas: any) => {
    //         // 		let array = localReload[jas.table].filter((lr: any) => {
    //         // 			if(jas.where.uid.IN.some((x: any) => x == lr.uid)){
    //         // 				return true;
    //         // 			}else{
    //         // 				return false;
    //         // 			}
    //         // 		}).map((lr: any) => lr);
    //         // 		this.syncAdd.server[jas.table] = array
    //         // 	});
    //         // 	jsonsCS.map((jas: any) => {
    //         // 		let array = localReload[jas.table].filter((lr: any) => {
    //         // 			if(jas.where.uid.IN.some((x: any) => x == lr.uid)){
    //         // 				return true;
    //         // 			}else{
    //         // 				return false;
    //         // 			}
    //         // 		}).map((lr: any) => lr);
    //         // 		this.syncChange.server[jas.table] = array
    //         // 	});
    //         // 	// this.httpService.httpRequest("GET", jsonsLocal, {local: true}).subscribe((serverReload: any) => {
    //         // 	// 	jsonsAL.map((jas: any) => {
    //         // 	// 		let array = serverReload[jas.table].filter((lr: any) => {
    //         // 	// 			if(jas.where.uid.IN.some((x: any) => x == lr.uid)){
    //         // 	// 				return true;
    //         // 	// 			}else{
    //         // 	// 				return false;
    //         // 	// 			}
    //         // 	// 		}).map((lr: any) => lr);
    //         // 	// 		this.syncAdd.local[jas.table] = array
    //         // 	// 	});
    //         // 	// 	jsonsCL.map((jas: any) => {
    //         // 	// 		let array = serverReload[jas.table].filter((lr: any) => {
    //         // 	// 			if(jas.where.uid.IN.some((x: any) => x == lr.uid)){
    //         // 	// 				return true;
    //         // 	// 			}else{
    //         // 	// 				return false;
    //         // 	// 			}
    //         // 	// 		}).map((lr: any) => lr);
    //         // 	// 		this.syncChange.local[jas.table] = array
    //         // 	// 	});
    //         // 	// 	obs.next(true);
    //         // 	// 	obs.complete();
    //         // 	// });
    //         // });
    //     });
    // }

    // private setData(): Observable<boolean> {
    //     return new Observable((obs) => {
    //         // let jsonsAS: UteApis<any>[] = [];
    //         // Object.keys(this.syncAdd.server).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncAdd.server) as any)[ix].map((z: any) => z);
    //         //     jsonsAS.push({
    //         //         table: x,
    //         //         select: dataList,
    //         //     });
    //         // });
    //         // let jsonsCS: UteApis<any>[] = [];
    //         // Object.keys(this.syncChange.server).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncChange.server) as any)[ix].map((z: any) => z);
    //         //     dataList.map((m: any) => {
    //         //         jsonsCS.push({
    //         //             table: x,
    //         //             select: m,
    //         //             where: { uid: m.uid },
    //         //         });
    //         //     });
    //         // });
    //         // let jsonsDS: UteApis<any>[] = [];
    //         // Object.keys(this.syncRemove.server).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncRemove.server) as any)[ix].map((z: any) => z);
    //         //     dataList.map((m: any) => {
    //         //         jsonsDS.push({
    //         //             table: x,
    //         //             where: { uid: m.uid },
    //         //         });
    //         //     });
    //         // });
    //         // let jsonsAL: UteApis<any>[] = [];
    //         // Object.keys(this.syncAdd.local).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncAdd.local) as any)[ix].map((z: any) => z);
    //         //     jsonsAL.push({
    //         //         table: x,
    //         //         select: dataList,
    //         //     });
    //         // });
    //         // let jsonsCL: UteApis<any>[] = [];
    //         // Object.keys(this.syncChange.local).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncChange.local) as any)[ix].map((z: any) => z);
    //         //     dataList.map((m: any) => {
    //         //         jsonsCL.push({
    //         //             table: x,
    //         //             select: m,
    //         //             where: { uid: m.uid },
    //         //         });
    //         //     });
    //         // });
    //         // let jsonsDL: UteApis<any>[] = [];
    //         // Object.keys(this.syncRemove.local).map((x: any, ix: number) => {
    //         //     let dataList: any[] = (Object.values(this.syncRemove.local) as any)[ix].map((z: any) => z);
    //         //     dataList.map((m: any) => {
    //         //         jsonsDL.push({
    //         //             table: x,
    //         //             where: { uid: m.uid },
    //         //         });
    //         //     });
    //         // });
    //         // this.httpService.httpRequest("POST", jsonsAS, {local: true}).subscribe(() => {
    //         // 	this.httpService.httpRequest("POST", jsonsAL, {app: true}).subscribe(() => {
    //         // 		this.httpService.httpRequest("PUT", jsonsCS, {local: true}).subscribe(() => {
    //         // 			this.httpService.httpRequest("PUT", jsonsCL, {app: true}).subscribe(() => {
    //         // 				this.httpService.httpRequest("DELETE", jsonsDS, {local: true}).subscribe(() => {
    //         // 					this.httpService.httpRequest("DELETE", jsonsDL, {app: true}).subscribe(() => {
    //         // 						obs.next(true);
    //         // 						obs.complete();
    //         // 					});
    //         // 				});
    //         // 			});
    //         // 		});
    //         // 	});
    //         // });
    //     });
    // }
}
