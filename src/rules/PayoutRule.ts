import * as _ from "lodash";

import { Rule } from "./Rule";
import { ValidationException } from "../validation/ValidationException";
import { ValidationContext } from "../validation/ValidationContext";
import { SendVoteorder } from "../protocol/SendVoteorder";
import { NotFoundException } from "../util/NotFoundException";

export class PayoutRule extends Rule {
    public rule: string = Rule.Type.Payout;
    public value: number;
    public mode: PayoutRule.Mode;

    public constructor(mode: PayoutRule.Mode, value: number) {
        super();

        this.mode = mode;
        this.value = value;
    }

    public type(): Rule.Type {
        return Rule.Type.Payout;
    }

    public async validate (voteorder: SendVoteorder, context: ValidationContext): Promise<void> {
        this.validateRuleObject(this);
        let post;
        try {
            post = await context.getPost();
        }
        catch (e) {
            if ((e as NotFoundException).notFoundException) throw new ValidationException(e.message);
            else throw e;
        }
        const payout = PayoutRule._parsePayout(post.total_payout_value);

        if (this.mode == PayoutRule.Mode.EQUAL) {
            if (payout !== this.value)
                throw new ValidationException("Payout rule: payout (" + payout + ") does not equal " + this.value);
        }
        else if (this.mode == PayoutRule.Mode.MORE_THAN) {
            if (payout <= this.value)
            throw new ValidationException("Payout rule: payout (" + payout + ") is not more than " + this.value);
        }
        else if (this.mode == PayoutRule.Mode.LESS_THAN) {
            if (payout >= this.value)
            throw new ValidationException("Payout rule: payout (" + payout + ") is not less than " + this.value);
        }
        else {
            throw new Error("Unknown mode of payout rule: " + this.mode);
        }
    }

    public validateRuleObject(unprototypedObj: any) {
        ["value", "mode"].forEach(prop => {
            if (!_.has(unprototypedObj, prop)) throw new ValidationException("PayoutRule: property " + prop + " is missing");
        });
        if (!_.includes([PayoutRule.Mode.MORE_THAN, PayoutRule.Mode.LESS_THAN, PayoutRule.Mode.EQUAL], unprototypedObj.mode))
            throw new ValidationException("PayoutRule: unknown mode " + unprototypedObj.mode);
    }

    public static _parsePayout(payoutStr: string): number {
        const regex = /^([0-9]+\.?[0-9]*) SBD$/gm;
        const matches = regex.exec(payoutStr);
        if (matches && matches.length > 1) {
            return parseFloat(matches[1]);
        }
        else throw new Error("PayoutRule: cannot parse payout (" + payoutStr + ")");
    }

    public getDescription(): string {
        let out = "Payout of the post ";

        switch (this.mode) {
            case PayoutRule.Mode.MORE_THAN: out += "is more than"; break;
            case PayoutRule.Mode.LESS_THAN: out += "is less than"; break;
            case PayoutRule.Mode.EQUAL: out += "equals"; break;
            default: out += this.mode;
        }
        out += " " + this.value + " SBD";

        return out;
    }
}

export namespace PayoutRule {
    export enum Mode {
        MORE_THAN = "more_than",
        LESS_THAN = "less_than",
        EQUAL = "equal"
    }
}