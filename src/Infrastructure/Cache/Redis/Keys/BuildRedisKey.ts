const PREFIX = `ratelimit`;
const SUFFIX = `tokens`;

type KeyBuilder = {
    ownedBy(identity: string): string;
};

type KeyType = "user" | "ip" | "tenant";

export function buildRedisKey(key: KeyType): KeyBuilder{
    return {
        ownedBy(identity: string): string{
            return `${PREFIX}:${key}:${identity}:${SUFFIX}`;
        }
    }
}