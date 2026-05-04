import {IdentifierTypes, StateIdentifiers, UserIdentity} from "../types.ts";

export type IdentifierBuilder =  {
    ownedBy(identity: string): string;
};

export type IdentifierFactory = (key: IdentifierTypes) => IdentifierBuilder;

export function stateIdentifierFactory(identifierBuilder: IdentifierFactory, userIdentity: UserIdentity): StateIdentifiers {
    if (!userIdentity.apiKey) {
        throw new Error("apikey is required to generate the identifiers");
    }

    const keys: StateIdentifiers = {
        apikey: identifierBuilder("user").ownedBy(userIdentity.apiKey),
    };

    if (userIdentity.ip !== undefined) {
        keys.ip = identifierBuilder("ip").ownedBy(userIdentity.ip);
    }

    if (userIdentity.tenant !== undefined) {
        keys.tenant = identifierBuilder("tenant").ownedBy(userIdentity.tenant);
    }

    return keys;
}
