import { Identifier } from "../../../../Application/Identities.ts";
import { DimensionsType } from "../../../../Domain/Dimensions.ts";

const PREFIX = `ratelimit`;
const SUFFIX = `state`;

export function identifierBuilder(scope: DimensionsType): Identifier {
  return {
    ownedBy(identity: string): string {
      return `${PREFIX}:${scope}:${identity}:${SUFFIX}`;
    },
  };
}
