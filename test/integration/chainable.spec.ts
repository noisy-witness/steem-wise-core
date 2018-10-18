// 3rd party imports
/* PROMISE_DEF */
import * as BluebirdPromise from "bluebird";
/* END_PROMISE_DEF */
import { expect } from "chai";
import "mocha";
import * as steem from "steem";
import { Log } from "../../src/util/Log";

// wise imports
import { SimpleTaker } from "../../src/chainable/Chainable";
import { SteemOperationNumber, SteemTransaction, Wise } from "../../src/wise";
import { SteemJsAccountHistorySupplier } from "../../src/api/directblockchain/SteemJsAccountHistorySupplier";
import { OperationNumberFilter } from "../../src/chainable/filters/OperationNumberFilter";
import { ToWiseOperationTransformer } from "../../src/chainable/transformers/ToWiseOperationTransformer";
import { DisabledApi } from "../../src/api/DisabledApi";
import { ChainableLimiter } from "../../src/chainable/limiters/ChainableLimiter";


describe("test/integration/chainable.spec.ts", () => {
    describe("SteemJsAccountHistorySupplier", () => {
        describe("SteemJsAccountHistorySupplier [username = steemprojects1]", () => {
            const wise = new Wise("steemprojects1", new DisabledApi());
            const protocol = wise.getProtocol();

            const steemprojects1Operations: SteemTransaction [] = [];

            before(function () {
                this.timeout(15000);
                return new SteemJsAccountHistorySupplier(steem, "steemprojects1")
                .branch((historySupplier) => {
                    historySupplier
                    .chain(new OperationNumberFilter("<_solveOpInTrxBug", new SteemOperationNumber(22202938, 14, 1))) // ensure no one will be able to manipulate test results by voting
                    .chain(new ToWiseOperationTransformer(protocol))
                    .chain(new ChainableLimiter(6))
                    .chain(new SimpleTaker((item: SteemTransaction): boolean => {
                        steemprojects1Operations.push(item);
                        return true;
                    }))
                    .catch((error: Error): boolean => false); // when we abort on error, the promise will be rejected with this error
                })
                .start();
            });

            it("Returns exactly 6 operations", () => {
                expect(steemprojects1Operations.length).to.be.equal(6);
            });
        });

        describe("AccountHistorySupplier [username = guest123]", () => {
            const realAndVirtual: string [] = [
                "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                "bitcoin-translation-decentralized-truth-polish-subtitles-for-andreas-m-antonopoulos-video",
                "falf",
                "20180411162422237-diceroll",
                "top-5-cities-in-bangladesh",
                "what-makes-you-you-secret-of-individuality-and-uniqueness"
            ];

            it("Loads both real and virtual operations", function() {
                this.timeout(25000);
                return new SteemJsAccountHistorySupplier(steem, "guest123")
                .branch((historySupplier) => {
                    historySupplier
                    .chain(new OperationNumberFilter("<_solveOpInTrxBug", new SteemOperationNumber(22202938, 14, 1))) // ensure no one will be able to manipulate test results by voting
                    .chain(new SimpleTaker((rawTrx: SteemTransaction): boolean => {
                        let continueLoading: boolean = true;
                        rawTrx.ops.forEach((op: [string, object]) => {
                            if (op[0] === "vote") {
                                const vote: {permlink: string} = op[1] as {permlink: string} ;

                                const indexInSamples: number = realAndVirtual.indexOf(vote.permlink);
                                if (indexInSamples !== -1) {
                                    realAndVirtual.splice(indexInSamples, 1); // remove found vote from
                                    if (realAndVirtual.length == 0) continueLoading = false;
                                }
                            }
                        });
                        return continueLoading;
                    }))
                    .catch((error: Error): boolean => false); // when we abort on error, the promise will be rejected with this error
                })
                .start()
                .then(() => {
                    if (realAndVirtual.length > 0) {
                        throw new Error("Not all votes were loaded: missing: " + JSON.stringify(realAndVirtual));
                    }
                });
            });

            const randomVoteOperationsInDescendingTimeOrder: string [] = [
                "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                "bitcoin-translation-decentralized-truth-polish-subtitles-for-andreas-m-antonopoulos-video",
                "falf",
                "20180411162422237-diceroll",
                "top-5-cities-in-bangladesh",
                "what-makes-you-you-secret-of-individuality-and-uniqueness"
            ];

            it("Loads operations in correct order: from the newest to the oldest", function() {
                this.timeout(25000);
                return new SteemJsAccountHistorySupplier(steem, "guest123")
                .branch((historySupplier) => {
                    historySupplier
                    .chain(new OperationNumberFilter("<", new SteemOperationNumber(22202938, 14, 1))) // ensure no one will be able to manipulate test results by voting
                    .chain(new SimpleTaker((rawTrx: SteemTransaction): boolean => {
                        let continueLoading: boolean = true;
                        rawTrx.ops.forEach((op: [string, object]) => {
                            if (op[0] === "vote") {
                                const vote: {permlink: string} = op[1] as {permlink: string};

                                const indexInSamples: number = randomVoteOperationsInDescendingTimeOrder.indexOf(vote.permlink);
                                if (indexInSamples !== -1) {
                                    if (indexInSamples !== 0) {
                                        const error = new Error("Votes returned in wrogn order. Received " + vote.permlink + ", sholudReceive: " + randomVoteOperationsInDescendingTimeOrder[0]);
                                        Log.log().exception(error, Log.level.error);
                                        throw error;
                                        continueLoading = false;
                                    }
                                    else {
                                        randomVoteOperationsInDescendingTimeOrder.shift();
                                        if (randomVoteOperationsInDescendingTimeOrder.length == 0) {
                                            continueLoading = false;
                                        }
                                    }
                                }
                            }
                        });
                        return continueLoading;
                    }))
                    .catch((error: Error): boolean => false); // when we abort on error, the promise will be rejected with this error
                })
                .start()
                .then(() => {
                    if (randomVoteOperationsInDescendingTimeOrder.length > 0) {
                        throw new Error("Not all votes were loaded: missing: " + JSON.stringify(randomVoteOperationsInDescendingTimeOrder));
                    }
                });
            });
        });
    });

    describe("OperationNumberFilter", () => {
        it("returns only operations with number < (block=22202938, tx=14)", function() {
            this.timeout(35000);
            return new SteemJsAccountHistorySupplier(steem, "guest123")
            .branch((historySupplier) => {
                historySupplier
                .chain(new OperationNumberFilter("<_solveOpInTrxBug", new SteemOperationNumber(22202938, 14, 1)))
                .chain(new SimpleTaker((rawTrx: SteemTransaction): boolean => {
                    if (rawTrx.block_num > 22202938) {
                        throw new Error("Operation outside of scope was passed: " + SteemOperationNumber.fromTransaction(rawTrx).toString());
                    }
                    else if (rawTrx.block_num == 22202938 && rawTrx.transaction_num > 14) {
                        throw new Error("Operation outside of scope was passed: " +  + SteemOperationNumber.fromTransaction(rawTrx).toString());
                    }

                    return true;
                }))
                .catch((error: Error): boolean => false); // when we abort on error, the promise will be rejected with this error
            })
            .start()
            .then(() => {});
        });
    });
});