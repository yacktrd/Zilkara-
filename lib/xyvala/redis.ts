
import { Redis } from "@upstash/redis";

function safeEnv(value: string | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

const url = safeEnv(
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
);

const token = safeEnv(
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN
);

function canCreateRedisClient(input: {
  url: string;
  token: string;
}): boolean {
  return input.url.length > 0 && input.token.length > 0;
}

export const xyvalaRedis: Redis | null = canCreateRedisClient({ url, token })
  ? new Redis({ url, token })
  : null;

export function hasXyvalaRedis(): boolean {
  return xyvalaRedis !== null;
}

export function getXyvalaRedis(): Redis | null {
  return xyvalaRedis;
}
