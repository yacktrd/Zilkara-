// lib/xyvala/access/access-resolver.ts

import type { ApiKeyAuthSuccess } from "@/lib/xyvala/auth";
import { ACCESS_COMPARTMENTS } from "./access-compartments";
import type { AccessScope } from "./access-types";

export function resolveAccessScope(auth: ApiKeyAuthSuccess): AccessScope {
  if (auth.keyType === "public_demo") {
    return ACCESS_COMPARTMENTS.public_10;
  }

  if (auth.plan === "demo") {
    return ACCESS_COMPARTMENTS.demo_30;
  }

  if (auth.plan === "trader") {
    return ACCESS_COMPARTMENTS.trader_60;
  }

  if (
    auth.plan === "pro" ||
    auth.plan === "enterprise" ||
    auth.plan === "internal"
  ) {
    return ACCESS_COMPARTMENTS.full_100;
  }

  return ACCESS_COMPARTMENTS.public_10;
}
