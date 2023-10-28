export interface DBModels {
    type: ModelTypes;
    autoIncrement: boolean;
    primaryKey: boolean;
    allowNull: boolean;
    defaultValue: ModelDefaultValues | number | string;
}

enum ModelTypes {
    int = "INTERGER",
    var = "VARCHAR(255)",
    bool = "BOOLEAN",
    date = "DATE",
    text = "TEXT",
}

enum ModelDefaultValues {
    uuid = "@UUID4",
    date = "@DATE",
}
