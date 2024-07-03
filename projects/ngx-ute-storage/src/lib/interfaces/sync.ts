import { UteModelTypes } from "./model";

export interface SyncConfigData {
    /**
     * Link to server for sync data
     * @default `environment.server`
     */

    server?: string;
    /**
     * Date of last app sync to server
     * @default `environment.session.syncDate`
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
     * @default `environment.session.uuid`
     *
     * Attention! Need to be updated when user `SignIn`
     */
    value?: string;
    /**
     * List of model to ignore
     * @default `logs`, `media`
     */
    ignore?: string[];
    /**
     * Last local data update
     * @default `environment.session.lastDate`
     */
    last?: Date;
}

export interface SyncResponseData {
    status: string;
    stage: string;
    close?: boolean;
}

export interface SyncData {
    syncDate?: Date;
    lastDate?: Date;
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

export const SessionDataModel = {
    authToken: {
        type: UteModelTypes.str,
    },
    migration: {
        type: UteModelTypes.str,
    },
};
