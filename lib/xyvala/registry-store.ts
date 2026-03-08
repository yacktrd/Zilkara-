// lib/xyvala/registry-store.ts
import fs from "fs";
import path from "path";
import type { RegistryKeyConfig } from "@/lib/xyvala/registry";

type RegistryFileShape = {
  keys: Record<string, RegistryKeyConfig>;
};

const REGISTRY_FILE = path.join(process.cwd(), "data", "xyvala-registry.json");

function ensureDataDir() {
  const dir = path.dirname(REGISTRY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function ensureRegistryFile() {
  ensureDataDir();

  if (!fs.existsSync(REGISTRY_FILE)) {
    const initial: RegistryFileShape = { keys: {} };
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(initial, null, 2), "utf8");
  }
}

export function readRegistryFile(): RegistryFileShape {
  ensureRegistryFile();

  try {
    const raw = fs.readFileSync(REGISTRY_FILE, "utf8");
    const parsed = JSON.parse(raw);

    if (!parsed || typeof parsed !== "object" || typeof parsed.keys !== "object") {
      return { keys: {} };
    }

    return {
      keys: parsed.keys ?? {},
    };
  } catch {
    return { keys: {} };
  }
}

export function writeRegistryFile(data: RegistryFileShape) {
  ensureRegistryFile();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function upsertRegistryFileKey(key: string, config: RegistryKeyConfig) {
  const current = readRegistryFile();
  current.keys[key] = config;
  writeRegistryFile(current);
}

export function removeRegistryFileKey(key: string) {
  const current = readRegistryFile();
  delete current.keys[key];
  writeRegistryFile(current);
}
