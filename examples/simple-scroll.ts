/**
 * cel-tui: Activity Feed
 *
 * A polished uncontrolled-scroll example: a live-looking feed of
 * deploys, alerts, and background jobs. The framework owns scroll
 * position; the app just renders a long list.
 *
 * Run: bun run examples/simple-scroll.ts
 */

import { Divider, Spacer } from "@cel-tui/components";
import { cel, HStack, ProcessTerminal, Text, VStack } from "@cel-tui/core";
import { warningBox } from "./warning-box";

const MIN_COLS = 46;
const MIN_ROWS = 12;

type FeedLevel = "deploy" | "healthy" | "warning" | "incident";

interface FeedItem {
  time: string;
  level: FeedLevel;
  service: string;
  title: string;
  detail: string;
}

const SERVICES = [
  "edge-api",
  "billing-worker",
  "search-indexer",
  "session-cache",
  "upload-proxy",
  "docs-site",
  "queue-router",
  "release-bot",
];

const ACTIONS: Record<FeedLevel, string[]> = {
  deploy: [
    "rolled out build",
    "promoted canary",
    "published preview",
    "finished migration",
  ],
  healthy: [
    "latency back in budget",
    "queue depth normalized",
    "cache warmed successfully",
    "all health checks green",
  ],
  warning: [
    "retry rate climbing",
    "disk usage trending up",
    "fallback path engaged",
    "background job running slow",
  ],
  incident: [
    "error burst detected",
    "deploy automatically paused",
    "worker restarted after crash",
    "replica marked unhealthy",
  ],
};

const DETAILS = [
  "Observed in the last 5 minutes across the primary region.",
  "A follow-up run is already queued for verification.",
  "Operators left it visible here so the scroll demo has texture.",
  "The next render should diff cleanly without repainting the whole screen.",
  "This is intentionally long enough to exercise wrapping in the feed pane.",
  "Nothing is interactive here besides scroll and refresh — the example stays focused.",
];

let items = buildFeed();

function randomFrom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)]!;
}

function levelStyle(level: FeedLevel) {
  switch (level) {
    case "deploy":
      return { label: "DEPLOY", color: "color04" as const };
    case "healthy":
      return { label: "OK", color: "color02" as const };
    case "warning":
      return { label: "WARN", color: "color03" as const };
    case "incident":
      return { label: "ALERT", color: "color01" as const };
  }
}

function formatTime(minutesAgo: number): string {
  const date = new Date(Date.now() - minutesAgo * 60_000);
  return date.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFeed(count = 64): FeedItem[] {
  return Array.from({ length: count }, (_, index) => {
    const level = randomFrom([
      "deploy",
      "healthy",
      "healthy",
      "warning",
      "incident",
    ] as const);
    const service = randomFrom(SERVICES);
    const action = randomFrom(ACTIONS[level]);
    const detail = randomFrom(DETAILS);
    const minutesAgo = index * 3 + Math.floor(Math.random() * 3);

    return {
      time: formatTime(minutesAgo),
      level,
      service,
      title: `${service} ${action}`,
      detail,
    };
  });
}

function count(level: FeedLevel): number {
  return items.filter((item) => item.level === level).length;
}

function regenerateFeed() {
  items = buildFeed();
  cel.render();
}

function quit() {
  cel.stop();
  process.exit(0);
}

function renderSummaryChip(level: FeedLevel) {
  const style = levelStyle(level);
  return HStack({ gap: 1 }, [
    Text(` ${style.label} `, {
      fgColor: "color00",
      bgColor: style.color,
      bold: true,
    }),
    Text(String(count(level)), { fgColor: "color08" }),
  ]);
}

function renderFeedItem(item: FeedItem, index: number) {
  const style = levelStyle(item.level);

  return VStack({ gap: 0 }, [
    HStack({ gap: 1 }, [
      Text(item.time, { fgColor: "color08" }),
      Text(` ${style.label} `, {
        fgColor: "color00",
        bgColor: style.color,
        bold: true,
      }),
      Text(item.title, { bold: true }),
      Spacer(),
      Text(`#${String(items.length - index).padStart(2, "0")}`, {
        fgColor: "color08",
      }),
    ]),
    Text(`  ${item.detail}`, {
      fgColor: "color08",
      wrap: "word",
    }),
  ]);
}

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const rows = process.stdout.rows || 24;

  if (cols < MIN_COLS || rows < MIN_ROWS) {
    return VStack(
      {
        height: "100%",
        justifyContent: "center",
        alignItems: "center",
        onKeyPress: (key) => {
          if (key === "ctrl+q" || key === "ctrl+c") quit();
        },
      },
      [
        ...warningBox([
          "  Terminal too small :(",
          "",
          "  Please resize to at",
          `  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.`,
          "",
          "  Ctrl+Q to quit",
        ]),
      ],
    );
  }

  const compactHeader = cols < 72;

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "ctrl+r") regenerateFeed();
      },
    },
    [
      compactHeader
        ? HStack({ padding: { x: 1 }, gap: 1, flexWrap: "wrap" }, [
            Text("Live Activity Feed", { bold: true, fgColor: "color06" }),
            Text("uncontrolled scroll", {
              fgColor: "color08",
              italic: true,
            }),
            Text(`${items.length} events`, { fgColor: "color08" }),
          ])
        : HStack({ padding: { x: 1 }, gap: 2 }, [
            Text("Live Activity Feed", { bold: true, fgColor: "color06" }),
            Text("uncontrolled scroll", {
              fgColor: "color08",
              italic: true,
            }),
            Spacer(),
            Text(`${items.length} events`, { fgColor: "color08" }),
          ]),
      HStack({ padding: { x: 1 }, gap: 2, flexWrap: "wrap" }, [
        renderSummaryChip("deploy"),
        renderSummaryChip("healthy"),
        renderSummaryChip("warning"),
        renderSummaryChip("incident"),
      ]),
      Divider({ fgColor: "color08" }),
      VStack(
        {
          flex: 1,
          overflow: "scroll",
          scrollbar: true,
          padding: { x: 1, y: 1 },
          gap: 1,
        },
        items.map(renderFeedItem),
      ),
      Divider({ fgColor: "color08" }),
      HStack({ padding: { x: 1 }, flexWrap: "wrap", gap: 1 }, [
        Text("Mouse wheel", { fgColor: "color08", bold: true }),
        Text("scroll", { fgColor: "color08" }),
        Text("·", { fgColor: "color08" }),
        Text("Ctrl+R", { fgColor: "color08", bold: true }),
        Text("refresh feed", { fgColor: "color08" }),
        Text("·", { fgColor: "color08" }),
        Text("Ctrl+Q", { fgColor: "color08", bold: true }),
        Text("quit", { fgColor: "color08" }),
      ]),
    ],
  );
});
