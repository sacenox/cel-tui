import type { Node, StateKey } from "@cel-tui/types";
import type { LayoutNode } from "./layout.js";

export type StatefulNodeKind = "vstack" | "hstack" | "textinput";

export interface MountedStateNode {
  key: StateKey;
  kind: StatefulNodeKind;
  identity: string;
  layerIndex: number;
  layoutNode: LayoutNode;
}

export interface MountedStateSnapshot {
  byKey: Map<StateKey, MountedStateNode>;
  textInputKeys: Set<StateKey>;
  stateIdentities: Set<string>;
  containerIdentities: Set<string>;
  layerIdentities: Set<string>;
}

function encodeStateKey(key: StateKey): string {
  if (typeof key === "string") return `s:${JSON.stringify(key)}`;
  return `n:${String(Object.is(key, -0) ? 0 : key)}`;
}

export function explicitStateIdentity(node: Node): string | null {
  if (node.type === "text" || node.props.stateKey === undefined) return null;
  return `K:${node.type}:${encodeStateKey(node.props.stateKey)}`;
}

export function layerIdentity(root: LayoutNode, index: number): string {
  const explicit = explicitStateIdentity(root.node);
  return explicit === null ? `L:${index}` : `L:${explicit}`;
}

function keyDescription(key: StateKey): string {
  if (typeof key === "string") return JSON.stringify(key);
  return String(key);
}

/** Inspect and validate every explicit state identity in laid-out layers. */
export function inspectMountedStateKeys(
  layouts: readonly LayoutNode[],
): MountedStateSnapshot {
  const byKey = new Map<StateKey, MountedStateNode>();
  const textInputKeys = new Set<StateKey>();
  const stateIdentities = new Set<string>();
  const containerIdentities = new Set<string>();
  const layerIdentities = new Set<string>();

  const visit = (layoutNode: LayoutNode, layerIndex: number): void => {
    const { node } = layoutNode;
    const identity = explicitStateIdentity(node);
    if (identity !== null && node.type !== "text") {
      const key = node.props.stateKey as StateKey;
      if (byKey.has(key)) {
        throw new Error(
          `Duplicate stateKey ${keyDescription(key)} in viewport`,
        );
      }

      const mounted: MountedStateNode = {
        key,
        kind: node.type,
        identity,
        layerIndex,
        layoutNode,
      };
      byKey.set(key, mounted);
      stateIdentities.add(identity);
      if (node.type === "textinput") {
        textInputKeys.add(key);
      } else {
        containerIdentities.add(identity);
      }
    }

    for (const child of layoutNode.children) visit(child, layerIndex);
  };

  for (let i = 0; i < layouts.length; i++) {
    const root = layouts[i];
    if (!root) throw new Error(`Missing layout root at index ${i}`);
    layerIdentities.add(layerIdentity(root, i));
    visit(root, i);
  }

  return {
    byKey,
    textInputKeys,
    stateIdentities,
    containerIdentities,
    layerIdentities,
  };
}
