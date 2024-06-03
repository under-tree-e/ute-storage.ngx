import { UteModelTypes } from "./model";

export interface SyncConfigData {
    /**
     * Link to server for sync data
     * @default `environment.server`
     */

    server?: string;
    /**
     * Date of last app sync to server
     * @default `environment.syncDate`
     *
     * Attention! Need to be updated when user `SignIn`
     */
    date?: Date;
    /**
     * Name of filed for values search
     * @default `createdBy`
     */
    field?: string;
    /**
     * Name of values for search beetwen server & app
     * @default `environment.syncName`
     *
     * Attention! Need to be updated when user `SignIn`
     */
    value?: string;
    /**
     * List of model to ignore
     * @default `logs`, `media`
     */
    ignore?: string[];
}

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

export const SyncDataModel = {
    syncDate: {
        type: UteModelTypes.date,
    },
};
