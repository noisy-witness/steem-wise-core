// 3rd party imports
import { expect } from "chai";
import "mocha";
import { Log } from "../log/Log";

// wise imports
import { PayoutRule, SendVoteorder, ValidationException, Wise } from "../wise";
import { ValidationContext } from "../validation/ValidationContext";
import { FakeWiseFactory } from "../_test/util/FakeWiseFactory";
import {
    wise_rule_payout_encode,
    wise_rule_payout,
    wise_rule_payout_decode,
} from "../protocol/versions/v2/rules/rule-payout-schema";

/* CONFIG */
const delegator = "noisy";
const voter = "perduta";
const fakeDataset = FakeWiseFactory.loadDataset();
const fakeApi = FakeWiseFactory.buildFakeApiWithDataset(fakeDataset);
const wise = new Wise(voter, fakeApi);

describe("test/unit/rule-payout.spec.ts", () => {
    describe("PayoutRule.validate", function() {
        const tests: { mode: PayoutRule.Mode; value: number; author: string; permlink: string; pass: boolean }[] = [
            {
                mode: PayoutRule.Mode.EQUAL,
                author: "steemprojects2",
                permlink: "sttnc-test",
                value: 0,
                pass: true,
            },
            {
                mode: PayoutRule.Mode.EQUAL,
                author: "noisy",
                permlink:
                    "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                value: 0,
                pass: false,
            },
            {
                mode: PayoutRule.Mode.MORE_THAN,
                author: "noisy",
                permlink:
                    "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                value: 73,
                pass: true,
            },
            {
                mode: PayoutRule.Mode.MORE_THAN,
                author: "noisy",
                permlink:
                    "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                value: 75,
                pass: false,
            },
            {
                mode: PayoutRule.Mode.LESS_THAN,
                author: "noisy",
                permlink:
                    "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                value: 73,
                pass: false,
            },
            {
                mode: PayoutRule.Mode.LESS_THAN,
                author: "noisy",
                permlink:
                    "what-we-can-say-about-steem-users-based-on-traffic-generated-to-steemprojects-com-after-being-3-days-on-top-of-trending-page",
                value: 75,
                pass: true,
            },
        ];

        tests.forEach((test, i: number) =>
            it(
                "PayoutRule " +
                    (test.pass ? "should pass" : "should fail") +
                    ": " +
                    "[" +
                    test.author +
                    ", " +
                    test.permlink +
                    "] " +
                    test.mode +
                    " " +
                    test.value,
                () => {
                    const rule = new PayoutRule(test.mode, test.value);
                    const voteorder: SendVoteorder = {
                        rulesetName: "",
                        weight: 1,
                        author: test.author,
                        permlink: test.permlink,
                    };
                    const context = new ValidationContext(fakeApi, delegator, voter, voteorder);

                    return rule.validate(voteorder, context).then(
                        () => {
                            // passed
                            if (!test.pass) throw new Error("Should fail");
                        },
                        error => {
                            // failed
                            if (test.pass) throw error;
                            else {
                                if (!(error as ValidationException).validationException)
                                    throw new Error("Should fail with ValidationException");
                            }
                        }
                    );
                }
            )
        );

        tests.forEach((test, i: number) =>
            it("is correctly serialized and deserialized by v2", () => {
                const rule = new PayoutRule(test.mode, test.value);
                const encoded: wise_rule_payout = wise_rule_payout_encode(rule);

                const decoded: PayoutRule = wise_rule_payout_decode(encoded);
                expect(decoded).to.deep.equal(rule);

                const encoded2: wise_rule_payout = wise_rule_payout_encode(decoded);
                expect(encoded2).to.deep.equal(encoded);
            })
        );
    });

    describe("PayoutRule._parsePayout", function() {
        it("Returns correct floats", () => {
            expect(PayoutRule._parsePayout("0 SBD")).to.be.closeTo(0, 0.0001);
            expect(PayoutRule._parsePayout("0.001 SBD")).to.be.closeTo(0.001, 0.0001);
            expect(PayoutRule._parsePayout("73.054 SBD")).to.be.closeTo(73.054, 0.0001);
            expect(PayoutRule._parsePayout("73.0 SBD")).to.be.closeTo(73, 0.0001);
            expect(PayoutRule._parsePayout("73 SBD")).to.be.closeTo(73, 0.0001);
        });
    });
});
