import {
  Identifier,
  IdentifierScope,
} from "../../../../Application/Identities.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `state`;

export function RedisIdentifierBuilder(scope: IdentifierScope): Identifier {
  return {
    ownedBy(identity: string): string {
      return `${PREFIX}:${scope}:${identity}:${SUFFIX}`;
    },
  };
}
