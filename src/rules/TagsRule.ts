import * as _ from "lodash";
import * as steem from "steem";

import { Rule } from "./Rule";
import { ValidationException } from "../validation/ValidationException";
import { ValidationContext } from "../validation/ValidationContext";
import { SendVoteorder } from "../protocol/SendVoteorder";
import { NotFoundException } from "../util/NotFoundException";

export class TagsRule extends Rule {
    public rule: string = Rule.Type.Tags;
    public tags: string [];
    public mode: TagsRule.Mode;

    public constructor(mode: TagsRule.Mode, tags: string []) {
        super();

        this.mode = mode;
        this.tags = tags;
    }

    public type(): Rule.Type {
        return Rule.Type.Tags;
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

        const postMetadata: steem.SteemPost.JSONMetadata = JSON.parse(post.json_metadata) as steem.SteemPost.JSONMetadata;

        if (this.mode === TagsRule.Mode.ALLOW) { // allow mode (every post tag must be within this list)
            for (let i = 0; i < postMetadata.tags.length; i++) {
                const tag = postMetadata.tags[i];
                if (this.tags.indexOf(tag) === -1)
                    throw new ValidationException("Tag " + tag + " is not on the allowed tags list [" + this.tags.join() + "].");
            }
        }
        else if (this.mode === TagsRule.Mode.DENY) { // deny mode (none of post tags can be on this list)
            for (let i = 0; i < postMetadata.tags.length; i++) {
                const tag = postMetadata.tags[i];
                if (this.tags.indexOf(tag) !== -1)
                    throw new ValidationException("Tag " + tag + " is on the denied tags list [" + this.tags.join() + "].");
            }
        }
        else if (this.mode === TagsRule.Mode.REQUIRE) { // the post should have all of the specified tags
            for (let i = 0; i < this.tags.length; i++) {
                const tag = this.tags[i];
                if (postMetadata.tags.indexOf(tag) === -1)
                    throw new ValidationException("The post tags [" + postMetadata.tags.join() + "] does not include " + tag + ".");
            }
        }
        else if (this.mode === TagsRule.Mode.ANY) { // the post should have at least one of the specified tags
            for (let i = 0; i < this.tags.length; i++) {
                const tag = this.tags[i];
                if (postMetadata.tags.indexOf(tag) !== -1) {
                    return;
                }
            }
            throw new ValidationException("None of the tags [" + postMetadata.tags.join() + "] is on the \"any\" tags list [" + this.tags.join() + "].");
        }
        else throw new ValidationException("Unknown mode in tags.");
    }

    public validateRuleObject(unprototypedObj: any) {
        ["tags", "mode"].forEach(prop => {
            if (!_.has(unprototypedObj, prop)) throw new ValidationException("TagsRule: property " + prop + " is missing");
        });
        if (!_.includes([TagsRule.Mode.ALLOW, TagsRule.Mode.DENY, TagsRule.Mode.ANY, TagsRule.Mode.REQUIRE], unprototypedObj.mode))
            throw new ValidationException("TagsRule: unknown mode " + unprototypedObj.mode);
    }

    public getDescription(): string {
        if (this.mode === TagsRule.Mode.ALLOW) {
            return "Allow only tags: " + this.tags.join(", ");
        } else if (this.mode === TagsRule.Mode.DENY) {
            return "Deny tags: " + this.tags.join(", ");
        } else if (this.mode === TagsRule.Mode.REQUIRE) {
            return "Require all of tags: " + this.tags.join(", ");
        } else if (this.mode === TagsRule.Mode.ANY) {
            return "Require at least one of tags: " + this.tags.join(", ");
        } else {
            return "[Unknown mode " + this.mode + "] tags: " + this.tags.join(", ");
        }
    }
}

export namespace TagsRule {
    export enum Mode {
        ALLOW = "allow",
        DENY = "deny",
        ANY = "any",
        REQUIRE = "require"
    }
}