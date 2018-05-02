import { smartvotes_operation } from "./schema/smartvotes.schema";
import { RawOperation, CustomJsonOperation, SteemPost } from "./types/blockchain-operations-types";

// TODO generate type definitions for steem-js (https://github.com/Microsoft/dts-gen). // Then TODO in tsconfig.json: allowJs=>false, declaration=>true
const steem = require("steem");

/**
 * Toolkit for blockchain operation filtering.
 */
export class BlockchainFilter {
    /**
     * Loads particular post from blockchain
     * @param author — Author of the post
     * @param permlink  — Permlink of the post
     * @param callback — a callback (can be promisified).
     */
    public static loadPost(author: string, permlink: string, callback: (error: Error | undefined, result: SteemPost) => void): void {
        steem.api.getContent(author, permlink, function(error: Error, result: any) {
                callback(error, result as SteemPost);
        });
    }

    /**
     * Searches blockchain for smartvotes operations of an user.
     * @param {string} username — voter or delegator username.
     * @param {string[]} commands — list of commands to search for. If you leave it empty — all valid smartvote commands
     *     will be included in the results.
     * @param {(error: Error, result: smartvotes_operation []) => void} callback
     */
    public static getSmartvotesOperations(username: string, commands: string [], limit: number, callback: (error: Error, result: smartvotes_operation []) => void): void {
        BlockchainFilter.filterHistoryRange(username, -1, limit, [], function(op: smartvotes_operation, rawOp: RawOperation): boolean {
            if (commands.length == 0) return true;
            else if (commands.indexOf(op.name) !== -1) {
                return true;
            }
            else return false;
        }, callback);
    }

    /**
     * Searches blockchain for smartvotes operations of an user that are older than supplied UTC date.
     * @param {string} username — voter or delegator username.
     * @param {string[]} commands — list of commands to search for. If you leave it empty — all valid smartvote commands
     *     will be included in the results.
     * @param {Date} beforeDate — only older operations will be returned.
     * @param {(error: Error, result: smartvotes_operation []) => void} callback
     */
    public static getSmartvotesOperationsBeforeDate(username: string, commands: string [], limit: number, beforeDate: Date, callback: (error: Error, result: smartvotes_operation []) => void): void {
        BlockchainFilter.filterHistoryRange(username, -1, limit, [], function(op: smartvotes_operation, rawOp: RawOperation): boolean {
            if (Date.parse(rawOp[1].timestamp + "Z"/* Z means UTC */) > beforeDate.getTime()) return false;

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
    public static getSmartvotesOperationsOfUser(username: string, callback: (error: Error | undefined, result: smartvotes_operation []) => void): void {
        BlockchainFilter.filterHistoryRange(username, -1, -1, [], undefined, callback);
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
    private static filterHistoryRange(username: string, from: number, limit: number, recentOps: smartvotes_operation [],
                                filter: ((op: smartvotes_operation, rawOp: RawOperation) => boolean) | undefined, callback: (error: Error, result: smartvotes_operation []) => void) {
        // TODO add some rate limiting for most frequent operations
        const accountHistoryLimit = (from === -1 ? 1000 : Math.min(1000, from)); // Sometimes at the end of account history "from" can be lower than 1000. In that case we should set limit to "from". It will simply load operations including the oldest one.
        console.log(accountHistoryLimit);
        steem.api.getAccountHistory(username, from, accountHistoryLimit, function(error: Error, result: any) {
            if (error) callback(error, []);
            else {
                if (result.length == 0) {
                    callback(error, recentOps);
                }
                else {
                    const resultFiltered: smartvotes_operation [] = BlockchainFilter.filterAndTransformSmartvoteOps(result, filter);
                    recentOps = resultFiltered.concat(recentOps);

                    if (result.length < 1000 || (limit > 0 && recentOps.length >= limit)) { // all operations were loaded or limit reached (if limit set)
                        callback(error, recentOps);
                    }
                    else { // if length == 1000 -> there are more ops to load
                        const from = result[0][0] - 1; // absolute number of oldest loaded operation, minus one
                        BlockchainFilter.filterHistoryRange(username, from, limit, recentOps, filter, callback);
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
    private static filterAndTransformSmartvoteOps(rawOps: RawOperation [], filter: ((op: smartvotes_operation, rawOp: RawOperation) => boolean) | undefined): smartvotes_operation [] {
        const out: smartvotes_operation [] = [];

        for (const i in rawOps) {
            const rawOp: RawOperation = rawOps[i];
            if (rawOp[1].op[0] == "custom_json" && rawOp[1].op[1].id == "smartvote") {
                    const jsonStr: string = rawOp[1].op[1].json;
                    const op: smartvotes_operation = JSON.parse(jsonStr) as smartvotes_operation;

                if (typeof filter == "undefined" || filter == undefined || filter(op, rawOp)) {
                    out.push(op);
                }
            }
        }

        return out;
    }
}