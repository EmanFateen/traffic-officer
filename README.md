# Traffic Officer service

It's an external rate limiter package built to practice and explore scalable system design techniques.

## Overview

This package exposes a public factory, `createTrafficOfficer`, that builds a Redis-backed rate limiter.

The current implementation uses the `TokenBucket` algorithm and evaluates limits across up to three dimensions:

- `apiKey`
- `ip`
- `tenant`

## Requirements

- A running Redis server
- A Redis connection string passed as `dbUrl`

## Public API

### `createTrafficOfficer(config)`

Creates a traffic officer instance.

```ts
import { createTrafficOfficer } from "rate-limiter";

const trafficOfficer = createTrafficOfficer({
  dbUrl: "redis://127.0.0.1:6379",
});
```

### `TrafficOfficerConfig`

```ts
type TrafficOfficerConfig = {
  dbUrl: string;
  algorithm?: "TokenBucket";
};
```

### `trafficOfficer.enforce(identities, policies, requestedAt) : EnforcementDecision`

```ts
type Identities = {
  apiKey: string;
  ip?: string;
  tenant?: string;
};

type TokenBucketPolicy = {
  bucketCapacityLimit: number;
  refillRate: {
    amount: number;
    perMs: number;
  };
};

type Policies<Policy> = {
  apiKey: Policy;
  ip?: Policy;
  tenant?: Policy;
};

type EnforcementDecision = {
  allowed: boolean;
  retryAfter: number;
};
```

Arguments:

- `identities`: the caller identity set. `apiKey` is required.
- `policies`: the configured policies for each dimension. `apiKey` policy is required.
- `requestedAt`: request timestamp in milliseconds.

Return value:

- `allowed`: `true` when the request passes all configured dimensions.
- `retryAfter`: the wait time in milliseconds before retrying. If more than one configured dimension is exceeded, this is the longest retry delay.

## Runtime behavior

- `apiKey` identity is required.
- `apiKey` policy is required.
- `ip` and `tenant` are optional dimensions.
- A dimension participates only when both the identity and the policy are present.
- If any configured dimension is exceeded, the request is rejected.
- Optional dimensions are ignored when their policy is missing.
- Optional policies are ignored when their identity is missing.
- Rate-limit state is persisted in Redis, so decisions survive across traffic officer instances.
- If `algorithm` is omitted, the package uses `TokenBucket`.

## Examples

### Minimal example

```ts
import { createTrafficOfficer } from "rate-limiter";

const trafficOfficer = createTrafficOfficer({
  dbUrl: "redis://127.0.0.1:6379",
});

const decision = await trafficOfficer.enforce(
  {
    apiKey: "client-api-key",
  },
  {
    apiKey: {
      bucketCapacityLimit: 5,
      refillRate: {
        amount: 5,
        perMs: 60_000,
      },
    },
  },
  Date.now(),
);

if (!decision.allowed) {
  throw new Error(`Retry after ${decision.retryAfter} ms`);
}
```

### API key, IP, and tenant

```ts
import { createTrafficOfficer } from "rate-limiter";

const trafficOfficer = createTrafficOfficer({
  dbUrl: "redis://127.0.0.1:6379",
});

const decision = await trafficOfficer.enforce(
  {
    apiKey: "client-api-key",
    ip: "203.0.113.10",
    tenant: "tenant-a",
  },
  {
    apiKey: {
      bucketCapacityLimit: 100,
      refillRate: {
        amount: 100,
        perMs: 60_000,
      },
    },
    ip: {
      bucketCapacityLimit: 20,
      refillRate: {
        amount: 20,
        perMs: 60_000,
      },
    },
    tenant: {
      bucketCapacityLimit: 500,
      refillRate: {
        amount: 500,
        perMs: 60_000,
      },
    },
  },
  Date.now(),
);

if (!decision.allowed) {
  console.log(`Rate limit exceeded. Retry after ${decision.retryAfter} ms`);
}
```

### Optional dimensions omitted

```ts
import { createTrafficOfficer } from "rate-limiter";

const trafficOfficer = createTrafficOfficer({
  dbUrl: "redis://127.0.0.1:6379",
});

const decision = await trafficOfficer.enforce(
  {
    apiKey: "client-api-key",
    ip: "203.0.113.10",
  },
  {
    apiKey: {
      bucketCapacityLimit: 10,
      refillRate: {
        amount: 10,
        perMs: 60_000,
      },
    },
  },
  Date.now(),
);

console.log(decision);
```

In this example, the `ip` identity is present, but no `ip` policy is configured, so only the `apiKey` limit is evaluated.

## Local development

This project requires a running Redis server.

Start Redis with Docker:

```bash
docker run --name traffic-officer-redis -p 6379:6379 -d redis:latest
docker ps
docker exec -it traffic-officer-redis redis-cli
```
