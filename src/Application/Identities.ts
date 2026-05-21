import { DimensionsType } from "../Domain/Service/Dimensions.ts";

export type Identities = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};

export type Identifier = {
  ownedBy(identity: string): string;
};

export type IdentifierBuilder = (scope: DimensionsType) => Identifier;
