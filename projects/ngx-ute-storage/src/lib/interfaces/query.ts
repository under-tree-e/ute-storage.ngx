/**
 * Ute Storage Query String for DB Request
 * @prop {@link UteQueryStrings.select | select}?: `string` - SELECT part of query string
 *
 * Example: `column1, column2`
 * @prop {@link UteQueryStrings.insert | insert}?: `string` - INSERT part of query string
 *
 * Example: `(column1) VALUES (value1)`
 * @prop {@link UteQueryStrings.update | update}?: `string` - UPDATE part of query string
 *
 * Example: `column1 = value1, column2 = value2`
 * @prop {@link UteQueryStrings.where | where}?: `string` - WHERE part of query string
 *
 * Example: `condition`
 */
export interface UteQueryStrings {
    /**
     * SELECT part of query string
     */
    select?: string;
    /**
     * INSERT part of query string
     */
    insert?: string;
    /**
     * UPDATE part of query string
     */
    update?: string;
    /**
     * WHERE part of query string
     */
    where?: string;
}

/**
 * Ute Storage Query String GLOBAL params enum
 * @prop pra: `PRAGMA table_info`
 * @prop sel: `SELECT`
 * @prop cou: `COUNT`
 * @prop fro: `FROM`
 * @prop ins: `INSERT INTO`
 * @prop set: `SET`
 * @prop inj: `INNER JOIN`
 * @prop on: `ON`
 * @prop upd: `UPDATE`
 * @prop val: `VALUES`
 * @prop del: `DELETE FROM`
 * @prop whe: `WHERE`
 */
export enum UteQuerySysParams {
    pra = "PRAGMA",
    tbi = "table_info",
    frk = "foreign_keys",

    bta = "BEGIN TRANSACTION",

    com = "COMMIT",

    prk = "PRIMARY KEY",
    aui = "AUTO_INCREMENT",
    non = "NOT NULL",
    fok = "FOREIGN KEY",
    ref = "REFERENCES",
    def = "DEFAULT",
    crt = "CREATE TABLE",
    ine = "IF NOT EXISTS",
    iex = "IF EXISTS",
    drt = "DROP TABLE",
    alt = "ALTER TABLE",
    ret = "RENAME TO",
    as = "AS",

    sel = "SELECT",
    cou = "COUNT",
    fro = "FROM",

    ins = "INSERT INTO",
    irp = "INSERT OR REPLACE INTO",
    set = "SET",

    inj = "INNER JOIN",
    on = "ON",

    upd = "UPDATE",
    val = "VALUES",

    del = "DELETE FROM",

    whe = "WHERE",
}

/**
 * Ute Storage Query String WHERE params enum
 * @prop and: `AND`
 * @prop not: `NOT`
 * @prop or: `OR`
 * @prop in: `IN`
 * @prop inN: `NOT IN`
 * @prop bet: `BETWEEN`
 * @prop betN: `NOT BETWEEN`
 * @prop lik: `LIKE`
 * @prop likN: `NOT LIKE`
 * @prop ord: `ORDER BY`
 * @prop ordA: `ASC`
 * @prop ordD: `DESC`
 */
export enum UteQueryWRParams {
    and = "AND",
    not = "NOT",
    or = "OR",

    in = "IN",
    inN = "NOT IN",

    bet = "BETWEEN",
    betN = "NOT BETWEEN",

    lik = "LIKE",
    likN = "NOT LIKE",

    ord = "ORDER BY",
    ordA = "ASC",
    ordD = "DESC",
}
