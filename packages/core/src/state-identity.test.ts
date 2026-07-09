import { describe, expect, test } from "bun:test";
import { layout } from "./layout.js";
import { HStack, VStack } from "./primitives/stacks.js";
import { Text } from "./primitives/text.js";
import { inspectMountedStateKeys } from "./state-identity.js";

describe("state identity", () => {
  test("rejects the same keyed node object mounted twice", () => {
    const repeated = HStack({ stateKey: "duplicate", onClick: () => {} }, [
      Text("button"),
    ]);
    const root = layout(VStack({}, [repeated, repeated]), 20, 4);

    expect(() => inspectMountedStateKeys([root])).toThrow(
      'Duplicate stateKey "duplicate" in viewport',
    );
  });

  test("rejects duplicate keys across layers", () => {
    const first = layout(
      VStack({ stateKey: "shared", height: "100%" }, []),
      20,
      4,
    );
    const second = layout(
      VStack({ stateKey: "shared", height: "100%" }, []),
      20,
      4,
    );

    expect(() => inspectMountedStateKeys([first, second])).toThrow(
      'Duplicate stateKey "shared" in viewport',
    );
  });

  test("keeps numeric and string keys distinct", () => {
    const root = layout(
      VStack({}, [
        HStack({ stateKey: 1, onClick: () => {} }, [Text("number")]),
        HStack({ stateKey: "1", onClick: () => {} }, [Text("string")]),
      ]),
      20,
      4,
    );

    const snapshot = inspectMountedStateKeys([root]);
    expect(snapshot.byKey.size).toBe(2);
    expect(snapshot.byKey.get(1)?.kind).toBe("hstack");
    expect(snapshot.byKey.get("1")?.kind).toBe("hstack");
  });
});
