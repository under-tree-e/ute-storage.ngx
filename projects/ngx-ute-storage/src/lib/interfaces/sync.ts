export interface SyncResponseData {
    status: string;
    stage: string;
    close?: boolean;
}

export enum SyncStatusList {
    syncCheck = "syncCheck",
    syncGet = "syncGet",
    syncAnalyse = "syncAnalyse",
    syncLocal = "syncLocal",
    syncServer = "syncServer",
    syncComplete = "syncComplete",
    syncError = "syncError",
}
