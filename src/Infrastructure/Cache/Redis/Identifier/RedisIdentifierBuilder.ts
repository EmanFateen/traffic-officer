import { Identifier } from "../../../../Application/Identities.ts";
import { DimensionsType } from "../../../../Domain/Service/Dimensions.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `state`;

export function RedisIdentifierBuilder(scope: DimensionsType): Identifier {
  return {
    ownedBy(identity: string): string {
      return `${PREFIX}:${scope}:${identity}:${SUFFIX}`;
    },
  };
}
