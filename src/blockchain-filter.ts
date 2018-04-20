import { smartvotes_operation } from "./schema/smartvotes.schema";

const steem = require("steem");

import { RawOperation, CustomJsonOperation } from "./blockchain-operations-types";

/**
 * Searches blockchain for smartvotes operations of an user.
 * @param {string} username — voter or delegator username.
 * @param {string[]} commands — list of commands to search for. If you leave it empty — all valid smartvote commands
 *     will be included in the results.
 * @param {(error: Error, result: smartvotes_operation []) => void} callback
 */
export function getOperations(username: string, commands: string [], callback: (error: Error, result: smartvotes_operation []) => void): void {
    filterHistoryRange(username, -1, [], function(op: smartvotes_operation): boolean {
        if (commands.length == 0) return true;
        else if (commands.indexOf(op.name) !== -1) {
            return true;
        }
        else return false;
    }, callback);
}

/**
 * Returns all smartvote operations of a user
 * @param {string} username
 * @param {(error: Error, result: smartvotes_operation[]) => void} callback
 */
export function getSmartvotesOperationsOfUser(username: string, callback: (error: Error, result: smartvotes_operation []) => void): void {
    filterHistoryRange(username, -1, [], undefined, callback);
}

/**
 * Recursive function to iterate all blockchain operations of a user.
 * @param {string} username
 * @param {number} from — absolute number of operation (or -1 if we want the most recent one). We start
 * with -1 and then pass absolute numbers of operations minus one until less than 1000 operations is returned.
 * @param {smartvotes_operation[]} recentOps — array of operations loaded so far sorted from the newest to the oldest.
 * @param {((op: smartvotes_operation) => boolean) | undefined} filter — custom filter or undefined.
 * @param {(error: Error, result: smartvotes_operation[]) => void} callback
 */
function filterHistoryRange(username: string, from: number, recentOps: smartvotes_operation [],
                            filter: ((op: smartvotes_operation) => boolean) | undefined, callback: (error: Error, result: smartvotes_operation []) => void) {
    steem.api.getAccountHistory(username, from, 1000, function(error: Error, result: any) {
        if (error) callback(error, []);
        else {
            if (result.length == 0) {
                callback(error, recentOps);
            }
            else {
                const resultFiltered: smartvotes_operation [] = filterAndTransformSmartvoteOps(result, filter);
                recentOps = resultFiltered.concat(recentOps);

                if (result.length < 1000) { // all operations were loaded
                    callback(error, recentOps);
                }
                else { // if length == 1000 -> there are more ops to load
                    const from = result[0][0] - 1; // absolute number of oldest loaded operation, minus one
                    filterHistoryRange(username, from, recentOps, filter, callback);
                }
            }
        }
    });
}

/**
 * Filters and transforms smartvotes operations out of all user's operations.
 * @param {RawOperation[]} rawOps — list of all user's operations
 * @param {(op: smartvotes_operation) => boolean} filter — custom filter for operations
 * @returns {CustomJsonOperation[]} — list of user's smartvotes operations
 */
function filterAndTransformSmartvoteOps(rawOps: RawOperation [], filter: ((op: smartvotes_operation) => boolean) | undefined): smartvotes_operation [] {
    const out: smartvotes_operation [] = [];

    for (const i in rawOps) {
        const rawOp: RawOperation = rawOps[i];
        if (rawOp[1].op[0] == "custom_json" && rawOp[1].op[1].id == "smartvote") {
                const jsonStr: string = rawOp[1].op[1].json;
                const op: smartvotes_operation = JSON.parse(jsonStr) as smartvotes_operation;

            if (typeof filter == "undefined" || filter == undefined || filter(op)) {
                out.push(op);
            }
        }
    }

    return out;
}