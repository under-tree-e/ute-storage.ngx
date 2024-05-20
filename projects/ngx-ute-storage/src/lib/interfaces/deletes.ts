import { UteModelDefaultValues, UteModelTypes, UteStorageModels } from "./model";
import { UteObjects } from "./object";

export const DeletesDataModel = {
    id: {
        type: UteModelTypes.int,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
    },
    uid: {
        type: UteModelTypes.str,
        allowNull: false,
        defaultValue: UteModelDefaultValues.uuid,
        unique: true,
    },
    model: {
        type: UteModelTypes.str,
        allowNull: false,
        defaultValue: "",
    },
    createdBy: {
        type: UteModelTypes.str,
        allowNull: false,
        defaultValue: "",
    },
    updatedAt: {
        type: UteModelTypes.date,
        allowNull: false,
        defaultValue: UteModelDefaultValues.date,
    },
} as UteObjects<UteStorageModels>;

export interface DeletesModel {
    id?: number;
    uid: string;
    model: string;
    createdBy: string;
    updatedAt: Date;
}

export interface DeletesData extends DeletesModel {}
