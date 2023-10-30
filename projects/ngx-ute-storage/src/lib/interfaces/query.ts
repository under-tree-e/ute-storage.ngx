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
