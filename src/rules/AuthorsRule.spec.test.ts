// 3rd party imports
import { expect } from "chai";
import "mocha";
import { Log } from "../log/Log";

// wise imports
import { AuthorsRule, SendVoteorder, Wise, ValidationException, Api } from "../wise";
import { ValidationContext } from "../validation/ValidationContext";
import { FakeWiseFactory } from "../_test/util/FakeWiseFactory";

describe("test/unit/rule-authors.spec.ts", () => {
    const delegator = "noisy";
    const voter = "perduta";
    let fakeApi: Api;
    let wise: Wise;

    before(() => {
        fakeApi = FakeWiseFactory.buildFakeApi();
        wise = new Wise(voter, fakeApi);
    });

    describe("AuthorsRule", function() {
        it("AllowMode: passes allowed author", () => {
            const rule = new AuthorsRule(AuthorsRule.Mode.ALLOW, ["noisy", "perduta"]);
            const voteorder: SendVoteorder = {
                rulesetName: "",
                weight: 1,
                author: "noisy",
                permlink:
                    "dear-whales-please-consider-declining-all-comment-rewards-by-default-in-settings-5-reasons-to-do-that",
            };
            const context = new ValidationContext(fakeApi, delegator, voter, voteorder);
            return rule.validate(voteorder, context);
        });

        it("AllowMode: throws ValidationException on different author", () => {
            const rule = new AuthorsRule(AuthorsRule.Mode.ALLOW, ["noisy", "perduta"]);
            const voteorder: SendVoteorder = {
                rulesetName: "",
                weight: 1,
                author: "pojan",
                permlink: "how-to-install-free-cad-on-windows-mac-os-and-linux-and-what-is-free-cad",
            };
            const context = new ValidationContext(fakeApi, delegator, voter, voteorder);
            return rule.validate(voteorder, context).then(
                () => {
                    throw new Error("Should fail");
                },
                (e: Error) => {
                    expect((e as ValidationException).validationException).to.be.true;
                }
            );
        });

        it("DenyMode: passes on author that is not on the list", () => {
            const rule = new AuthorsRule(AuthorsRule.Mode.DENY, ["noisy", "perduta"]);
            const voteorder: SendVoteorder = {
                rulesetName: "",
                weight: 1,
                author: "pojan",
                permlink: "how-to-install-free-cad-on-windows-mac-os-and-linux-and-what-is-free-cad",
            };
            const context = new ValidationContext(fakeApi, delegator, voter, voteorder);
            return rule.validate(voteorder, context);
        });

        it("DenyMode: throws ValidationException on author from the list", () => {
            const rule = new AuthorsRule(AuthorsRule.Mode.DENY, ["noisy", "perduta"]);
            const voteorder: SendVoteorder = {
                rulesetName: "",
                weight: 1,
                author: "noisy",
                permlink:
                    "dear-whales-please-consider-declining-all-comment-rewards-by-default-in-settings-5-reasons-to-do-that",
            };
            const context = new ValidationContext(fakeApi, delegator, voter, voteorder);
            return rule.validate(voteorder, context).then(
                () => {
                    throw new Error("Should fail");
                },
                (e: Error) => {
                    expect((e as ValidationException).validationException).to.be.true;
                }
            );
        });

        it("throws ValidationException on nonexistent post", () => {
            const rule = new AuthorsRule(AuthorsRule.Mode.DENY, ["noisy", "perduta"]);
            const voteorder: SendVoteorder = {
                rulesetName: "",
                weight: 1,
                author: "noisy",
                permlink: "nonexistent-post-" + Date.now(),
            };
            const context = new ValidationContext(fakeApi, delegator, voter, voteorder);
            return rule.validate(voteorder, context).then(
                () => {
                    throw new Error("Should fail");
                },
                (e: Error) => {
                    expect((e as ValidationException).validationException).to.be.true;
                }
            );
        });
    });
});
