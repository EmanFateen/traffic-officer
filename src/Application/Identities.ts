import { DimensionsType } from "../Domain/Dimensions.ts";

export type Identities = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};

export type Identifier = {
  ownedBy(identity: string): string;
};

export type IdentifierBuilder = (scope: DimensionsType) => Identifier;
