#!/usr/bin/env bun
/**
 * Pre-publish verification script.
 *
 * Checks that:
 * 1. All workspace package.json versions match each other
 * 2. bun.lock workspace versions match package.json versions
 * 3. No stale lockfile entries that would cause bun publish to resolve wrong versions
 *
 * Run before publishing: bun run scripts/prepublish-check.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGES = ["types", "core", "components"] as const;

let failed = false;

function fail(msg: string) {
  console.error(`❌ ${msg}`);
  failed = true;
}

function pass(msg: string) {
  console.log(`✅ ${msg}`);
}

// 1. Read all package.json versions
const packageVersions: Record<string, string> = {};
for (const pkg of PACKAGES) {
  const pkgJson = JSON.parse(
    readFileSync(resolve(ROOT, `packages/${pkg}/package.json`), "utf-8"),
  );
  packageVersions[pkg] = pkgJson.version;
}

console.log("\n--- Package versions (package.json) ---");
for (const pkg of PACKAGES) {
  console.log(`  @cel-tui/${pkg}: ${packageVersions[pkg]}`);
}

// 2. Check all versions match
const versions = new Set(Object.values(packageVersions));
if (versions.size === 1) {
  pass(`All package.json versions match: ${[...versions][0]}`);
} else {
  fail(`Package versions don't match: ${JSON.stringify(packageVersions)}`);
}

// 3. Read bun.lock and check workspace versions
const lockContent = readFileSync(resolve(ROOT, "bun.lock"), "utf-8");

console.log("\n--- Lockfile workspace versions ---");
for (const pkg of PACKAGES) {
  const pattern = new RegExp(
    `"packages/${pkg}":\\s*\\{[^}]*"version":\\s*"([^"]+)"`,
    "s",
  );
  const match = lockContent.match(pattern);
  if (!match) {
    fail(`Could not find packages/${pkg} version in bun.lock`);
    continue;
  }
  const lockVersion = match[1];
  console.log(
    `  @cel-tui/${pkg}: ${lockVersion} (lockfile) vs ${packageVersions[pkg]} (package.json)`,
  );
  if (lockVersion === packageVersions[pkg]) {
    pass(`@cel-tui/${pkg} lockfile version matches package.json`);
  } else {
    fail(
      `@cel-tui/${pkg} lockfile version MISMATCH: bun.lock has ${lockVersion}, package.json has ${packageVersions[pkg]}. Run: rm bun.lock && bun install`,
    );
  }
}

// 4. Check workspace dependencies point to workspace packages (not pinned old versions)
console.log("\n--- Workspace dependency checks ---");
const corePkg = JSON.parse(
  readFileSync(resolve(ROOT, "packages/core/package.json"), "utf-8"),
);
const compPkg = JSON.parse(
  readFileSync(resolve(ROOT, "packages/components/package.json"), "utf-8"),
);

const workspaceDeps: [string, string, string][] = [
  ["core", "@cel-tui/types", corePkg.dependencies?.["@cel-tui/types"]],
  ["components", "@cel-tui/types", compPkg.dependencies?.["@cel-tui/types"]],
  ["components", "@cel-tui/core", compPkg.dependencies?.["@cel-tui/core"]],
];

for (const [pkg, dep, value] of workspaceDeps) {
  if (value === "workspace:*") {
    pass(
      `@cel-tui/${pkg} → ${dep} uses workspace:* (will resolve from lockfile)`,
    );
  } else if (value) {
    // If using explicit versions, check they match the target package version
    const targetPkg = dep.replace("@cel-tui/", "") as (typeof PACKAGES)[number];
    if (value === packageVersions[targetPkg]) {
      pass(
        `@cel-tui/${pkg} → ${dep} pinned to ${value} (matches current version)`,
      );
    } else {
      fail(
        `@cel-tui/${pkg} → ${dep} pinned to ${value} but current version is ${packageVersions[targetPkg]}`,
      );
    }
  }
}

console.log("");
if (failed) {
  console.error(
    "🚫 Pre-publish checks FAILED. Fix the issues above before publishing.",
  );
  process.exit(1);
} else {
  console.log("🎉 All pre-publish checks passed. Safe to publish.");
}
