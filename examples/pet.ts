/**
 * cel-tui: Virtual Pet (Tamagotchi)
 *
 * A feature-rich example exercising the full API surface:
 * - Layers (creation modal, log modal, death screen overlay)
 * - TextInput (pet name)
 * - Focus traversal (Tab/Shift+Tab/Enter/Escape)
 * - Controlled scroll (activity log)
 * - Timers & animation frames
 * - Buttons, key bindings, click handlers
 * - External state management
 *
 * Run: bun run examples/pet.ts
 */

import {
  cel,
  VStack,
  HStack,
  Text,
  TextInput,
  ProcessTerminal,
} from "@cel-tui/core";
import { Button, Divider, Spacer, VDivider } from "@cel-tui/components";

// ─── Pet Definitions ────────────────────────────────────────────

interface PetDef {
  kind: string;
  idle: { happy: string[][]; hungry: string[][] };
  excited: string[][];
  dead: string[];
}

const PETS: PetDef[] = [
  {
    kind: "Cat",
    idle: {
      happy: [
        [
          "    /\\_/\\    ",
          "   ( ^.^ )   ",
          "    > ^ <    ",
          "   /|   |\\   ",
          "  (_|   |_)  ",
        ],
        [
          "    /\\_/\\    ",
          "   ( ^.^ )   ",
          "    > ^ <    ",
          "   /|   |\\   ",
          "  (_|   |_)  ",
          "     ~ ~     ",
        ],
      ],
      hungry: [
        [
          "    /\\_/\\    ",
          "   ( T.T )   ",
          "    > o <    ",
          "   /|   |\\   ",
          "  (_|   |_)  ",
        ],
        [
          "    /\\_/\\    ",
          "   ( T.T )   ",
          "    > o <    ",
          "    |   |    ",
          "   _|   |_   ",
        ],
      ],
    },
    excited: [
      [
        "    /\\_/\\    ",
        "   ( >.< )   ",
        "    >\\^/<    ",
        "   \\|   |/   ",
        "   (_\\_/_)   ",
        "    \\   /    ",
      ],
      [
        "    /\\_/\\    ",
        "  \\( ^o^ )/  ",
        "    > ^ <    ",
        "    |   |    ",
        "   (_\\_/_)   ",
        "    /   \\    ",
      ],
    ],
    dead: [
      "    /\\_/\\    ",
      "   ( x.x )   ",
      "    > - <    ",
      "    |   |    ",
      "    |___|    ",
    ],
  },
  {
    kind: "Dog",
    idle: {
      happy: [
        [
          "  |\\_/|      ",
          "  | @ @      ",
          "  |  <>  _   ",
          "  |_/| |//   ",
          "    |/   /   ",
          "   /    /    ",
        ],
        [
          "  |\\_/|      ",
          "  | @ @      ",
          "  |  <>  _   ",
          "  |_/| |//   ",
          "    |/   /   ",
          "   /  |_/    ",
        ],
      ],
      hungry: [
        [
          "  |\\_/|      ",
          "  | ; ;      ",
          "  |  ..  _   ",
          "  |_/| |//   ",
          "    |/   /   ",
          "   /    /    ",
        ],
        [
          "  |\\_/|      ",
          "  | ; ;      ",
          "  |  ..      ",
          "  |_/| |     ",
          "    |/  |    ",
          "   /    /    ",
        ],
      ],
    },
    excited: [
      [
        "  |\\_/|      ",
        "  | O O      ",
        "  |  D>  _   ",
        "  |_/| |//   ",
        "   /|/  _/   ",
        "  / |__/     ",
      ],
      [
        "   |\\_/|     ",
        "   | O O     ",
        "   |  D>     ",
        " __|_/|\\__   ",
        "  / |/ \\     ",
        " /  |  /     ",
      ],
    ],
    dead: [
      "  |\\_/|      ",
      "  | x x      ",
      "  |  --  _   ",
      "  |_/| |//   ",
      "    |/   /   ",
      "   /____/    ",
    ],
  },
  {
    kind: "Bunny",
    idle: {
      happy: [
        ["   (\\(\\      ", "   ( -.-)    ", '  o_(")(")   '],
        ["   (\\(\\      ", "   ( -.-)    ", '  o_(")(")   ', "      *      "],
      ],
      hungry: [
        ["   (\\(\\      ", "   ( ;.;)    ", '  c_(")(")   '],
        ["   (\\(\\      ", "   ( ;.;)    ", '  c_(")(")   ', "     ...     "],
      ],
    },
    excited: [
      ["    (\\(\\     ", "    ( ^.^)   ", '  (")(")_o   ', "     \\|/     "],
      ["   (\\(\\      ", "  \\( ^o^)/   ", '   (")(")    ', "    /|\\      "],
    ],
    dead: [
      "   (\\(\\      ",
      "   ( x.x)    ",
      '  c_(")(")   ',
      "    R.I.P    ",
    ],
  },
];

// ─── App State ──────────────────────────────────────────────────

type Screen = "create" | "main" | "dead";
let screen: Screen = "create";

// -- Creation state --
let petName = "";
let selectedKind = 0;
let nameInputFocused = false; // only TextInput needs controlled focus (arrow key routing)

// -- Pet state --
let pet: PetDef | null = null;
let health = 100;
let hunger = 0; // 0 = full, 100 = starving
let happiness = 100;

// -- Animation --
let frame = 0;
let anim: "idle" | "excited" = "idle";
let excitedTimer: ReturnType<typeof setTimeout> | null = null;

// -- Timers --
let tickTimer: ReturnType<typeof setInterval> | null = null;
let decayTimer: ReturnType<typeof setInterval> | null = null;

// -- Activity log --
let log: string[] = [];
let showLog = false;
let logScroll = 0;

// ─── Helpers ────────────────────────────────────────────────────

function ts(): string {
  return new Date().toLocaleTimeString("en-US", { hour12: false });
}

function addLog(msg: string) {
  log.push(`[${ts()}] ${msg}`);
  logScroll = Math.max(0, log.length - 12);
}

function startGame() {
  pet = PETS[selectedKind]!;
  if (!petName.trim()) petName = pet.kind;
  health = 100;
  hunger = 0;
  happiness = 100;
  anim = "idle";
  frame = 0;
  log = [];
  screen = "main";

  addLog(`${petName} the ${pet.kind} was born!`);
  addLog("Press [F] feed · [P] pet · [L] log");
  startTimers();
  cel.render();
}

function startTimers() {
  stopTimers();
  tickTimer = setInterval(() => {
    frame++;
    cel.render();
  }, 600);

  decayTimer = setInterval(() => {
    if (screen !== "main") return;
    hunger = Math.min(100, hunger + 3);
    happiness = Math.max(0, happiness - 2);
    if (hunger >= 80) happiness = Math.max(0, happiness - 2);
    if (hunger >= 90 && happiness <= 20) health = Math.max(0, health - 5);
    if (health <= 0) return die();
    if (hunger >= 70) addLog(`${petName} is hungry...`);
    if (happiness <= 25) addLog(`${petName} feels lonely...`);
    if (health <= 30) addLog(`${petName} doesn't look well!`);
    cel.render();
  }, 3000);
}

function stopTimers() {
  if (tickTimer) clearInterval(tickTimer);
  if (decayTimer) clearInterval(decayTimer);
  if (excitedTimer) clearTimeout(excitedTimer);
  tickTimer = decayTimer = excitedTimer = null;
}

function feed() {
  if (screen !== "main") return;
  hunger = Math.max(0, hunger - 30);
  health = Math.min(100, health + 5);
  addLog(`You fed ${petName}! Hunger -30`);
  playExcited();
}

function petIt() {
  if (screen !== "main") return;
  happiness = Math.min(100, happiness + 25);
  addLog(`You pet ${petName}! Happy +25`);
  playExcited();
}

function playExcited() {
  anim = "excited";
  frame = 0;
  if (excitedTimer) clearTimeout(excitedTimer);
  excitedTimer = setTimeout(() => {
    anim = "idle";
    cel.render();
  }, 2400);
  cel.render();
}

function die() {
  addLog(`${petName} has passed away...`);
  screen = "dead";
  stopTimers();
  cel.render();
}

function restart() {
  stopTimers();
  pet = null;
  petName = "";
  selectedKind = 0;
  screen = "create";
  log = [];
  showLog = false;
  cel.render();
}

function quit() {
  stopTimers();
  cel.stop();
  process.exit(0);
}

// ─── Terminal Size ──────────────────────────────────────────────

const MIN_COLS = 40;
const MIN_ROWS = 15;

function termSize(): { cols: number; rows: number } {
  return {
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 24,
  };
}

function tooSmallView() {
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
      Text("┌─────────────────────────┐", { fgColor: "yellow" }),
      Text("│  Terminal too small :(  │", { fgColor: "yellow" }),
      Text("│                         │", { fgColor: "yellow" }),
      Text("│  Please resize to at    │", { fgColor: "yellow" }),
      Text(
        `│  least ${String(MIN_COLS).padStart(3)}×${String(MIN_ROWS).padStart(2)} chars.   │`,
        { fgColor: "yellow" },
      ),
      Text("│                         │", { fgColor: "yellow" }),
      Text("│  Ctrl+Q to quit         │", { fgColor: "yellow" }),
      Text("└─────────────────────────┘", { fgColor: "yellow" }),
    ],
  );
}

// ─── Art Helpers ────────────────────────────────────────────────

function maxArtHeight(def: PetDef): number {
  const frames = [
    ...def.idle.happy,
    ...def.idle.hungry,
    ...def.excited,
    def.dead,
  ];
  return Math.max(...frames.map((f) => f.length));
}

function currentArt(): string[] {
  if (!pet) return [];
  let lines: string[];
  if (anim === "excited") {
    lines = pet.excited[frame % pet.excited.length]!;
  } else {
    const mood = hunger > 60 || happiness < 30 ? "hungry" : "happy";
    const frames = pet.idle[mood];
    lines = frames[frame % frames.length]!;
  }
  // Pad to consistent height so buttons don't bounce
  const target = maxArtHeight(pet);
  while (lines.length < target) lines = [...lines, ""];
  return lines;
}

function artColor(): "cyan" | "yellow" | "magenta" {
  if (anim === "excited") return "magenta";
  if (hunger > 60 || happiness < 30) return "yellow";
  return "cyan";
}

// ─── Reusable Widgets ───────────────────────────────────────────

function StatBar(
  label: string,
  value: number,
  color: "green" | "yellow" | "red" | "cyan",
) {
  const w = 12;
  const filled = Math.round((value / 100) * w);
  return VStack({}, [
    Text(label, { bold: true, fgColor: "white" }),
    HStack({}, [
      Text("█", { repeat: Math.max(filled, 0), fgColor: color }),
      Text("░", { repeat: Math.max(w - filled, 0), fgColor: "brightBlack" }),
      Text(` ${value}`, { fgColor: "brightBlack" }),
    ]),
  ]);
}

function barColor(val: number, invert = false): "green" | "yellow" | "red" {
  const v = invert ? 100 - val : val;
  if (v > 60) return "green";
  if (v > 30) return "yellow";
  return "red";
}

// ─── Create Screen ──────────────────────────────────────────────

function createView() {
  const { rows } = termSize();
  const preview = PETS[selectedKind]!;
  const previewArt = preview.idle.happy[frame % preview.idle.happy.length]!;
  // Compact mode: drop art preview when height is tight
  const showPreview = rows >= 22;

  return VStack(
    {
      height: "100%",
      alignItems: "center",
      overflow: "scroll",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        // Arrow keys to pick species (only when name input is NOT focused)
        if (!nameInputFocused) {
          if (key === "up") {
            selectedKind = (selectedKind - 1 + PETS.length) % PETS.length;
            cel.render();
          } else if (key === "down") {
            selectedKind = (selectedKind + 1) % PETS.length;
            cel.render();
          }
        }
      },
    },
    [
      Spacer(),
      VStack({ width: 40, padding: { x: 2 }, gap: 0 }, [
        // Title
        HStack({ justifyContent: "center" }, [
          Text("~ New Pet ~", { bold: true, fgColor: "cyan" }),
        ]),
        Divider({ fgColor: "brightBlack" }),

        // Name
        Text("Name:", { bold: true, fgColor: "white" }),
        TextInput({
          value: petName,
          onChange: (v) => {
            petName = v;
            cel.render();
          },
          height: 1,
          fgColor: "brightWhite",
          bgColor: "black",
          placeholder: Text("enter a name...", {
            fgColor: "brightBlack",
            bgColor: "black",
          }),
          // Controlled focus: needed to gate arrow key routing above
          focused: nameInputFocused,
          onFocus: () => {
            nameInputFocused = true;
            cel.render();
          },
          onBlur: () => {
            nameInputFocused = false;
            cel.render();
          },
          submitKey: "enter",
          onSubmit: () => {
            nameInputFocused = false;
            cel.render();
          },
        }),

        // Species picker
        Text(""),
        Text("Species:", { bold: true, fgColor: "white" }),
        ...PETS.map((p, i) => {
          const sel = i === selectedKind;
          return HStack(
            {
              onClick: () => {
                selectedKind = i;
                cel.render();
              },
              focusable: false,
            },
            [
              Text(sel ? "  > " : "    ", {
                fgColor: sel ? "cyan" : "brightBlack",
                bold: sel,
              }),
              Text(p.kind, {
                fgColor: sel ? "cyan" : "white",
                bold: sel,
              }),
            ],
          );
        }),
        Text("    ↑/↓ to change", {
          fgColor: "brightBlack",
          italic: true,
        }),

        // Preview (hidden when terminal is short)
        ...(showPreview
          ? [
              Divider({ fgColor: "brightBlack" }),
              VStack(
                { alignItems: "center" },
                previewArt.map((ln) => Text(ln, { fgColor: "yellow" })),
              ),
            ]
          : []),

        Divider({ fgColor: "brightBlack" }),

        // Create button — uncontrolled focus + focusStyle
        HStack({ justifyContent: "center" }, [
          Button(" Create Pet! ", {
            onClick: startGame,
            fgColor: "green",
            bold: true,
            focusStyle: { bgColor: "green", fgColor: "black" },
          }),
        ]),

        // Hints
        HStack({ justifyContent: "center" }, [
          Text("Tab", { fgColor: "brightBlack", bold: true }),
          Text(" navigate  ", { fgColor: "brightBlack" }),
          Text("Ctrl+Q", { fgColor: "brightBlack", bold: true }),
          Text(" quit", { fgColor: "brightBlack" }),
        ]),
      ]),
      Spacer(),
    ],
  );
}

// ─── Main Screen ────────────────────────────────────────────────

function mainView() {
  const { cols } = termSize();
  const art = currentArt();
  const color = artColor();
  // Narrow mode: stack sidebar above pet pane instead of side-by-side
  const narrow = cols < 50;

  const statsPanel = VStack(
    { ...(narrow ? {} : { width: 20 }), padding: { x: 1 }, gap: 0 },
    [
      ...(narrow
        ? [
            HStack({ gap: 2 }, [
              StatBar("Health", health, barColor(health)),
              StatBar("Food", 100 - hunger, barColor(hunger, true)),
              StatBar("Happy", happiness, barColor(happiness)),
            ]),
          ]
        : [
            Text("  Stats", { bold: true, fgColor: "brightBlack" }),
            Divider({ char: "─", fgColor: "brightBlack" }),
            StatBar("Health", health, barColor(health)),
            StatBar("Food", 100 - hunger, barColor(hunger, true)),
            StatBar("Happy", happiness, barColor(happiness)),
            Spacer(),
            Divider({ char: "─", fgColor: "brightBlack" }),
            Text(" [F] Feed", { fgColor: "yellow", bold: true }),
            Text(" [P] Pet", { fgColor: "magenta", bold: true }),
          ]),
    ],
  );

  const petPane = VStack(
    { flex: 1, justifyContent: "center", alignItems: "center", gap: 1 },
    [
      VStack(
        { alignItems: "center" },
        art.map((ln) => Text(ln, { fgColor: color, bold: anim === "excited" })),
      ),
      Text(""),
      HStack({ gap: 3 }, [
        Button(" Feed ", {
          onClick: feed,
          fgColor: "yellow",
          bold: true,
          focusStyle: { bgColor: "yellow", fgColor: "black" },
        }),
        Button(" Pet ", {
          onClick: petIt,
          fgColor: "magenta",
          bold: true,
          focusStyle: { bgColor: "magenta", fgColor: "black" },
        }),
      ]),
    ],
  );

  return VStack(
    {
      height: "100%",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "f") feed();
        if (key === "p") petIt();
        if (key === "l") {
          showLog = !showLog;
          if (showLog) {
            logScroll = Math.max(0, log.length - 12);
          }
          cel.render();
        }
      },
    },
    [
      // ── Header ──
      HStack({ padding: { x: 1 } }, [
        Text(` ${petName} `, { bold: true, fgColor: "black", bgColor: "cyan" }),
        Text(` the ${pet!.kind} `, { fgColor: "brightBlack" }),
        Spacer(),
        Text("[L]", { fgColor: "brightBlack", bold: true }),
        Text("og ", { fgColor: "brightBlack" }),
        Text("[Q]", { fgColor: "brightBlack", bold: true }),
        Text("uit ", { fgColor: "brightBlack" }),
      ]),
      Divider({ char: "═", fgColor: "brightBlack" }),

      // ── Body ──
      ...(narrow
        ? [
            // Narrow: stats bar on top, pet below
            statsPanel,
            Divider({ char: "─", fgColor: "brightBlack" }),
            petPane,
          ]
        : [
            // Wide: sidebar | pet side-by-side
            HStack({ flex: 1 }, [
              statsPanel,
              VDivider({ fgColor: "brightBlack" }),
              petPane,
            ]),
          ]),
    ],
  );
}

// ─── Log Modal (Layer) ──────────────────────────────────────────

function logView() {
  const { cols, rows } = termSize();
  const closeLog = () => {
    showLog = false;
    cel.render();
  };

  // Adapt modal size to terminal
  const modalW = Math.min(60, cols - 4);
  const modalH = Math.min(14, rows - 4);
  const borderW = modalW - 2;

  return VStack(
    {
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      onKeyPress: (key) => {
        if (key === "l" || key === "escape") closeLog();
      },
    },
    [
      // Top border
      HStack({ bgColor: "black" }, [
        Text("╔", { fgColor: "brightBlack" }),
        Text("═", { repeat: borderW, fgColor: "brightBlack" }),
        Text("╗", { fgColor: "brightBlack" }),
      ]),

      VStack(
        { width: modalW, height: modalH, padding: { x: 1 }, bgColor: "black" },
        [
          // Header row
          HStack({}, [
            Text(" Activity Log ", { bold: true, fgColor: "cyan" }),
            VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })]),
            HStack({ onClick: closeLog, focusable: false }, [
              Text(" [x] ", { fgColor: "red", bold: true }),
            ]),
          ]),
          Text("─", { repeat: "fill", fgColor: "brightBlack" }),

          // Scrollable entries
          VStack(
            {
              flex: 1,
              overflow: "scroll",
              scrollbar: true,
              scrollOffset: logScroll,
              onScroll: (off) => {
                logScroll = off;
                cel.render();
              },
            },
            (() => {
              if (log.length === 0) {
                return [
                  Text(" No activity yet.", {
                    fgColor: "brightBlack",
                    italic: true,
                  }),
                ];
              }
              return log.map((entry) => {
                let fg:
                  | "yellow"
                  | "magenta"
                  | "red"
                  | "green"
                  | "white"
                  | "brightRed" = "white";
                if (entry.includes("born")) fg = "green";
                else if (entry.includes("fed") || entry.includes("Feed"))
                  fg = "yellow";
                else if (entry.includes("pet ") || entry.includes("Happy"))
                  fg = "magenta";
                else if (entry.includes("hungry") || entry.includes("lonely"))
                  fg = "brightRed";
                else if (entry.includes("passed") || entry.includes("well"))
                  fg = "red";
                return Text(entry, { fgColor: fg });
              });
            })(),
          ),

          Text("─", { repeat: "fill", fgColor: "brightBlack" }),
          Text(" Scroll: mouse wheel  Close: [L] or Esc", {
            fgColor: "brightBlack",
            italic: true,
          }),
        ],
      ),

      // Bottom border
      HStack({ bgColor: "black" }, [
        Text("╚", { fgColor: "brightBlack" }),
        Text("═", { repeat: borderW, fgColor: "brightBlack" }),
        Text("╝", { fgColor: "brightBlack" }),
      ]),
    ],
  );
}

// ─── Dead Screen ────────────────────────────────────────────────

function deadView() {
  const art = pet?.dead ?? [];
  return VStack(
    {
      height: "100%",
      alignItems: "center",
      overflow: "scroll",
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") quit();
        if (key === "l") {
          showLog = !showLog;
          cel.render();
        }
      },
    },
    [
      Spacer(),
      Text("╔═══════════════════════╗", { fgColor: "brightBlack" }),
      Text("║                       ║", { fgColor: "brightBlack" }),
      Text("║      R . I . P .      ║", { fgColor: "red", bold: true }),
      Text("║                       ║", { fgColor: "brightBlack" }),
      Text("╚═══════════════════════╝", { fgColor: "brightBlack" }),
      Text(""),
      ...art.map((ln) => Text(ln, { fgColor: "brightBlack" })),
      Text(""),
      Text(`${petName} has crossed the rainbow bridge.`, {
        fgColor: "brightBlack",
        italic: true,
      }),
      Text(""),
      HStack({ gap: 3 }, [
        Button(" New Pet ", {
          onClick: restart,
          fgColor: "green",
          bold: true,
          focusStyle: { bgColor: "green", fgColor: "black" },
        }),
        Button(" View Log ", {
          onClick: () => {
            showLog = !showLog;
            cel.render();
          },
          fgColor: "cyan",
          bold: true,
          focusStyle: { bgColor: "cyan", fgColor: "black" },
        }),
      ]),
      HStack({}, [
        Text("Ctrl+Q", { fgColor: "brightBlack", bold: true }),
        Text(" quit", { fgColor: "brightBlack" }),
      ]),
      Spacer(),
    ],
  );
}

// ─── Viewport ───────────────────────────────────────────────────

cel.init(new ProcessTerminal());

cel.viewport(() => {
  const { cols, rows } = termSize();
  if (cols < MIN_COLS || rows < MIN_ROWS) return tooSmallView();

  let base;
  if (screen === "create") base = createView();
  else if (screen === "main") base = mainView();
  else base = deadView();

  if (showLog) return [base, logView()];
  return base;
});
