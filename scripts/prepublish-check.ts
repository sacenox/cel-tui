#!/usr/bin/env bun
/**
 * Pre-publish verification script.
 *
 * Checks that:
 * 1. All workspace package.json versions match each other
 * 2. bun.lock workspace versions match package.json versions
 * 3. Internal workspace dependencies point at the current workspace packages
 *
 * Run before publishing: bun run scripts/prepublish-check.ts
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PACKAGES = ["types", "core", "clew", "components"] as const;

type PackageDir = (typeof PACKAGES)[number];
type PackageJson = {
  dependencies?: Record<string, string>;
  name: string;
  version: string;
};

let failed = false;

function fail(msg: string) {
  console.error(`❌ ${msg}`);
  failed = true;
}

function pass(msg: string) {
  console.log(`✅ ${msg}`);
}

const packageJsonByDir = {} as Record<PackageDir, PackageJson>;
const packageNames = {} as Record<PackageDir, string>;
const packageVersions = {} as Record<PackageDir, string>;

for (const pkg of PACKAGES) {
  const pkgJson = JSON.parse(
    readFileSync(resolve(ROOT, `packages/${pkg}/package.json`), "utf-8"),
  ) as PackageJson;
  packageJsonByDir[pkg] = pkgJson;
  packageNames[pkg] = pkgJson.name;
  packageVersions[pkg] = pkgJson.version;
}

console.log("\n--- Package versions (package.json) ---");
for (const pkg of PACKAGES) {
  console.log(`  ${packageNames[pkg]}: ${packageVersions[pkg]}`);
}

const versions = new Set(Object.values(packageVersions));
if (versions.size === 1) {
  pass(`All package.json versions match: ${[...versions][0]}`);
} else {
  fail(`Package versions don't match: ${JSON.stringify(packageVersions)}`);
}

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
    `  ${packageNames[pkg]}: ${lockVersion} (lockfile) vs ${packageVersions[pkg]} (package.json)`,
  );
  if (lockVersion === packageVersions[pkg]) {
    pass(`${packageNames[pkg]} lockfile version matches package.json`);
  } else {
    fail(
      `${packageNames[pkg]} lockfile version MISMATCH: bun.lock has ${lockVersion}, package.json has ${packageVersions[pkg]}. Run: rm bun.lock && bun install`,
    );
  }
}

console.log("\n--- Workspace dependency checks ---");
const packageDirByName = new Map<string, PackageDir>();
for (const pkg of PACKAGES) {
  packageDirByName.set(packageNames[pkg], pkg);
}

for (const pkg of PACKAGES) {
  const deps = packageJsonByDir[pkg].dependencies ?? {};

  for (const [dep, value] of Object.entries(deps)) {
    const targetPkg = packageDirByName.get(dep);
    if (!targetPkg) {
      continue;
    }

    if (value === "workspace:*") {
      pass(
        `${packageNames[pkg]} → ${dep} uses workspace:* (will resolve from lockfile)`,
      );
      continue;
    }

    if (value === packageVersions[targetPkg]) {
      pass(
        `${packageNames[pkg]} → ${dep} pinned to ${value} (matches current version)`,
      );
      continue;
    }

    fail(
      `${packageNames[pkg]} → ${dep} is ${value} but current version is ${packageVersions[targetPkg]}`,
    );
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
