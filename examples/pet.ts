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
import { warningBox } from "./warning-box";

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
let nameInputFocused = true; // only TextInput needs controlled focus (arrow key routing)

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
  petName = petName.trim() || pet.kind;
  health = 100;
  hunger = 0;
  happiness = 100;
  anim = "idle";
  frame = 0;
  log = [];
  showLog = false;
  nameInputFocused = false;
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
  nameInputFocused = true;
  screen = "create";
  log = [];
  logScroll = 0;
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

function artColor(): "color06" | "color03" | "color05" {
  if (anim === "excited") return "color05";
  if (hunger > 60 || happiness < 30) return "color03";
  return "color06";
}

// ─── Reusable Widgets ───────────────────────────────────────────

function StatBar(
  label: string,
  value: number,
  color: "color02" | "color03" | "color01" | "color06",
) {
  const w = 12;
  const filled = Math.round((value / 100) * w);
  return VStack({}, [
    Text(label, { bold: true }),
    HStack({}, [
      Text("█", { repeat: Math.max(filled, 0), fgColor: color }),
      Text("░", { repeat: Math.max(w - filled, 0), fgColor: "color08" }),
      Text(` ${value}`, { fgColor: "color08" }),
    ]),
  ]);
}

function barColor(
  val: number,
  invert = false,
): "color02" | "color03" | "color01" {
  const v = invert ? 100 - val : val;
  if (v > 60) return "color02";
  if (v > 30) return "color03";
  return "color01";
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
          Text("~ New Pet ~", { bold: true, fgColor: "color06" }),
        ]),
        Divider({ fgColor: "color08" }),

        // Name
        Text("Name:", { bold: true }),
        TextInput({
          value: petName,
          onChange: (v) => {
            petName = v;
            cel.render();
          },
          height: 1,
          placeholder: Text("enter a name...", {
            fgColor: "color08",
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
          onKeyPress: (key) => {
            if (key === "enter") {
              startGame();
              return false;
            }
          },
        }),

        // Species picker — wrapping chips
        Text(""),
        Text("Species:", { bold: true }),
        HStack(
          { flexWrap: "wrap", gap: 1 },
          PETS.map((p, i) => {
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
                Text(sel ? ` ● ${p.kind} ` : `   ${p.kind} `, {
                  fgColor: sel ? "color00" : undefined,
                  bgColor: sel ? "color06" : undefined,
                  bold: sel,
                }),
              ],
            );
          }),
        ),
        Text("  ↑/↓ to change", {
          fgColor: "color08",
          italic: true,
        }),

        // Preview (hidden when terminal is short)
        ...(showPreview
          ? [
              Divider({ fgColor: "color08" }),
              VStack(
                { alignItems: "center" },
                previewArt.map((ln) => Text(ln, { fgColor: "color03" })),
              ),
            ]
          : []),

        Divider({ fgColor: "color08" }),

        // Create button — uncontrolled focus + focusStyle
        HStack({ justifyContent: "center" }, [
          Button(" Create Pet! ", {
            onClick: startGame,
            fgColor: "color02",
            bold: true,
            focusStyle: { bgColor: "color02", fgColor: "color00" },
          }),
        ]),

        // Hints — wrapping for narrow terminals
        HStack({ justifyContent: "center", flexWrap: "wrap", gap: 1 }, [
          HStack({}, [
            Text("Enter", { fgColor: "color08", bold: true }),
            Text(" create", { fgColor: "color08" }),
          ]),
          HStack({}, [
            Text("Tab", { fgColor: "color08", bold: true }),
            Text(" navigate", { fgColor: "color08" }),
          ]),
          HStack({}, [
            Text("Ctrl+Q", { fgColor: "color08", bold: true }),
            Text(" quit", { fgColor: "color08" }),
          ]),
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
            Text("  Stats", { bold: true, fgColor: "color08" }),
            Divider({ char: "─", fgColor: "color08" }),
            StatBar("Health", health, barColor(health)),
            StatBar("Food", 100 - hunger, barColor(hunger, true)),
            StatBar("Happy", happiness, barColor(happiness)),
            Spacer(),
            Divider({ char: "─", fgColor: "color08" }),
            Text(" [F] Feed", { fgColor: "color03", bold: true }),
            Text(" [P] Pet", { fgColor: "color05", bold: true }),
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
          fgColor: "color03",
          bold: true,
          focusStyle: { bgColor: "color03", fgColor: "color00" },
        }),
        Button(" Pet ", {
          onClick: petIt,
          fgColor: "color05",
          bold: true,
          focusStyle: { bgColor: "color05", fgColor: "color00" },
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
        Text(` ${petName} `, {
          bold: true,
          fgColor: "color00",
          bgColor: "color06",
        }),
        Text(` the ${pet!.kind} `, { fgColor: "color08" }),
        Spacer(),
        Text("[L]", { fgColor: "color08", bold: true }),
        Text("og ", { fgColor: "color08" }),
        Text("[Q]", { fgColor: "color08", bold: true }),
        Text("uit ", { fgColor: "color08" }),
      ]),
      Divider({ char: "═", fgColor: "color08" }),

      // ── Body ──
      ...(narrow
        ? [
            // Narrow: stats bar on top, pet below
            statsPanel,
            Divider({ char: "─", fgColor: "color08" }),
            petPane,
          ]
        : [
            // Wide: sidebar | pet side-by-side
            HStack({ flex: 1 }, [
              statsPanel,
              VDivider({ fgColor: "color08" }),
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
      HStack({ bgColor: "color08", fgColor: "color07" }, [
        Text("╔"),
        Text("═", { repeat: borderW }),
        Text("╗"),
      ]),

      VStack(
        {
          width: modalW,
          height: modalH,
          padding: { x: 1 },
          bgColor: "color08",
          fgColor: "color07",
        },
        [
          // Header row
          HStack({}, [
            Text(" Activity Log ", { bold: true, fgColor: "color06" }),
            VStack({ flex: 1 }, [Text(" ", { repeat: "fill" })]),
            HStack({ onClick: closeLog, focusable: false }, [
              Text(" [x] ", { fgColor: "color01", bold: true }),
            ]),
          ]),
          Text("─", { repeat: "fill", fgColor: "color00" }),

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
                    fgColor: "color08",
                    italic: true,
                  }),
                ];
              }
              return log.map((entry) => {
                let fg:
                  | "color03"
                  | "color05"
                  | "color01"
                  | "color02"
                  | "color09"
                  | undefined = undefined;
                if (entry.includes("born")) fg = "color02";
                else if (entry.includes("fed") || entry.includes("Feed"))
                  fg = "color03";
                else if (entry.includes("pet ") || entry.includes("Happy"))
                  fg = "color05";
                else if (entry.includes("hungry") || entry.includes("lonely"))
                  fg = "color09";
                else if (entry.includes("passed") || entry.includes("well"))
                  fg = "color01";
                return Text(entry, { fgColor: fg });
              });
            })(),
          ),

          Text("─", { repeat: "fill", fgColor: "color00" }),
          Text(" Scroll: mouse wheel  Close: [L] or Esc", {
            fgColor: "color00",
            italic: true,
          }),
        ],
      ),

      // Bottom border
      HStack({ bgColor: "color08", fgColor: "color07" }, [
        Text("╚"),
        Text("═", { repeat: borderW }),
        Text("╝"),
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
      Text("╔═══════════════════════╗", { fgColor: "color08" }),
      Text("║                       ║", { fgColor: "color08" }),
      Text("║      R . I . P .      ║", { fgColor: "color01", bold: true }),
      Text("║                       ║", { fgColor: "color08" }),
      Text("╚═══════════════════════╝", { fgColor: "color08" }),
      Text(""),
      ...art.map((ln) => Text(ln, { fgColor: "color08" })),
      Text(""),
      Text(`${petName} has crossed the rainbow bridge.`, {
        fgColor: "color08",
        italic: true,
      }),
      Text(""),
      HStack({ gap: 3 }, [
        Button(" New Pet ", {
          onClick: restart,
          fgColor: "color02",
          bold: true,
          focusStyle: { bgColor: "color02", fgColor: "color00" },
        }),
        Button(" View Log ", {
          onClick: () => {
            showLog = !showLog;
            cel.render();
          },
          fgColor: "color06",
          bold: true,
          focusStyle: { bgColor: "color06", fgColor: "color00" },
        }),
      ]),
      HStack({}, [
        Text("Ctrl+Q", { fgColor: "color08", bold: true }),
        Text(" quit", { fgColor: "color08" }),
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
