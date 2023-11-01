/**
 * Ute Storage Query String for DB Request
 * @param {string} select - SELECT part of query string (column1, column2)
 * @param {string} insert - INSERT part of query string ((column1) VALUES (value1))
 * @param {string} update - UPDATE part of query string (column1 = value1, column2 = value2)
 * @param {string} where - WHERE part of query string (condition)
 */
export interface UteQueryStrings {
    select?: string;
    insert?: string;
    update?: string;
    where?: string;
}

export enum UteQuerySysParams {
    pra = "PRAGMA table_info",

    sel = "SELECT",
    cou = "COUNT",
    fro = "FROM",

    ins = "INSERT INTO",
    set = "SET",

    upd = "UPDATE",
    val = "VALUES",

    del = "DELETE FROM",

    whe = "WHERE",
}

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
