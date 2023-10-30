/**
 * Ute Storage Models Structure
 * @param {UteModelTypes} type - Field type
 * @param {boolean} autoIncrement - Use "Auto Increment" for field
 * @param {boolean} primaryKey - Set field as "Primary Key"
 * @param {boolean} allowNull - Set field not allow "Empty" values
 * @param {UteModelDefaultValues | number | string} defaultValue - Default value for field if it`s empty
 */
export interface UteStorageModels {
    type: UteModelTypes;
    autoIncrement: boolean;
    primaryKey: boolean;
    allowNull: boolean;
    defaultValue: UteModelDefaultValues | number | string;
}

enum UteModelTypes {
    int = "INTERGER",
    var = "VARCHAR(255)",
    bool = "BOOLEAN",
    date = "DATE",
    text = "TEXT",
}

enum UteModelDefaultValues {
    uuid = "@UUID4",
    date = "@DATE",
}
