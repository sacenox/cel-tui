/**
 * Run all cel-tui benchmarks sequentially.
 *
 * Usage: bun run benchmarks/run-all.ts
 *
 * Individual benchmarks can be run directly:
 *   bun run benchmarks/width.bench.ts
 *   bun run benchmarks/layout.bench.ts
 *   bun run benchmarks/paint.bench.ts
 *   bun run benchmarks/cell-buffer.bench.ts
 *   bun run benchmarks/hit-test.bench.ts
 *   bun run benchmarks/keys.bench.ts
 *   bun run benchmarks/e2e.bench.ts
 *   bun run benchmarks/real-world.bench.ts
 */

import { $ } from "bun";

const benchmarks = [
  "width",
  "layout",
  "paint",
  "cell-buffer",
  "hit-test",
  "keys",
  "e2e",
  "real-world",
];

console.log("cel-tui benchmark suite");
console.log("=".repeat(60));
console.log();

for (const name of benchmarks) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${"─".repeat(60)}\n`);
  await $`bun run benchmarks/${name}.bench.ts`.quiet().then(
    (result) => process.stdout.write(result.stdout),
    (err) => {
      process.stderr.write(err.stderr);
      process.exit(1);
    },
  );
}

console.log("\nAll benchmark groups completed successfully.");
