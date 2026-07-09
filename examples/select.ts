import { Divider, Select, Spacer, VDivider } from "@cel-tui/components";
import { cel, HStack, ProcessTerminal, Text, VStack } from "@cel-tui/core";

interface ThemePreset {
  id: string;
  name: string;
  vibe: string;
  summary: string;
  accent: AccentColor;
  keywords: string[];
  palette: readonly string[];
}

type AccentColor =
  "color06" | "color05" | "color03" | "color02" | "color04" | "color01";

const THEMES: ThemePreset[] = [
  {
    id: "catppuccin/mocha",
    name: "Catppuccin Mocha",
    vibe: "cozy purple dusk",
    summary:
      "A warm, low-contrast palette for long terminal sessions, writing, and dashboards that should feel calm instead of clinical.",
    accent: "color05",
    keywords: ["cozy", "purple", "soft", "night", "editorial"],
    palette: ["mauve", "rosewater", "teal"],
  },
  {
    id: "nord/frost",
    name: "Nord Frost",
    vibe: "icy blue minimalism",
    summary:
      "Cool blues, crisp contrast, and a restrained look that works well for logs, monitoring, and data-heavy layouts.",
    accent: "color06",
    keywords: ["cool", "blue", "minimal", "ops", "monitoring"],
    palette: ["frost", "snow", "storm"],
  },
  {
    id: "tokyo-night/storm",
    name: "Tokyo Night Storm",
    vibe: "electric city glow",
    summary:
      "A sharper dark theme with vibrant accents that helps demos feel energetic without getting noisy.",
    accent: "color04",
    keywords: ["neon", "city", "energetic", "sharp", "modern"],
    palette: ["indigo", "cyan", "amber"],
  },
  {
    id: "gruvbox/material",
    name: "Gruvbox Material",
    vibe: "earthy amber studio",
    summary:
      "Muted warmth and clear hierarchy. Great when you want a dense interface to stay readable and grounded.",
    accent: "color03",
    keywords: ["warm", "amber", "retro", "earthy", "dense"],
    palette: ["sand", "olive", "rust"],
  },
  {
    id: "forest/mint",
    name: "Forest Mint",
    vibe: "fresh green utility",
    summary:
      "High-signal greens for positive actions, health checks, and clean success-heavy dashboards.",
    accent: "color02",
    keywords: ["green", "fresh", "success", "health", "utility"],
    palette: ["mint", "sage", "pine"],
  },
  {
    id: "ember/redline",
    name: "Ember Redline",
    vibe: "alert-focused crimson",
    summary:
      "Built for warnings, incident tooling, and views where urgency should be visible immediately.",
    accent: "color01",
    keywords: ["red", "alert", "incident", "urgent", "ops"],
    palette: ["ember", "flame", "ash"],
  },
];

const themeById = new Map(THEMES.map((theme) => [theme.id, theme]));
let selectedThemeId = THEMES[0]!.id;
let selectQuery = "";
let selectCursor = 0;
let selectHighlightIndex = 0;

const themeItems = THEMES.map((theme) => ({
  label: theme.name,
  value: theme.id,
  filterText: `${theme.name} ${theme.vibe} ${theme.keywords.join(" ")}`,
}));

const themeSelect = Select({
  items: themeItems,
  maxVisible: 7,
  placeholder: "search themes or keywords...",
  highlightColor: "color06",
  onQueryChange: (query) => {
    selectQuery = query;
  },
  onCursorChange: (cursor) => {
    selectCursor = cursor;
  },
  onHighlightChange: (highlightIndex) => {
    selectHighlightIndex = highlightIndex;
  },
  onCancel: () => themeSelect.reset(),
  filter: (items, query) => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    return items.filter((item) => {
      const searchable = item.filterText.toLowerCase();
      return terms.every((term) => searchable.includes(term));
    });
  },
  renderRow: (item, { highlighted, indicator }) => {
    const theme = themeById.get(item.value);
    return HStack({ gap: 1 }, [
      Text(highlighted ? indicator : " "),
      Text(item.label, { bold: highlighted }),
      Text(theme?.vibe ?? "", { fgColor: "color08", italic: true }),
    ]);
  },
  onSelect: (value) => {
    selectedThemeId = value;
    cel.render();
  },
});

function activeTheme(): ThemePreset {
  return themeById.get(selectedThemeId) ?? THEMES[0]!;
}

function resetDemo() {
  selectedThemeId = THEMES[0]!.id;
  selectQuery = "";
  selectCursor = 0;
  selectHighlightIndex = 0;
  themeSelect.reset();
  cel.render();
}

function quit() {
  cel.stop();
  process.exit(0);
}

function sampleFilters() {
  return HStack(
    { flexWrap: "wrap", gap: 1 },
    ["cozy", "blue", "alert", "modern", "success"].map((sample) =>
      Text(` ${sample} `, {
        fgColor: "color15",
        bgColor: "color08",
      }),
    ),
  );
}

function paletteRow(theme: ThemePreset) {
  return HStack(
    { flexWrap: "wrap", gap: 1 },
    theme.palette.map((label) =>
      Text(` ${label} `, {
        fgColor: "color00",
        bgColor: theme.accent,
        bold: true,
      }),
    ),
  );
}

function previewPane(theme: ThemePreset) {
  return VStack({ flex: 1, gap: 1 }, [
    HStack({ gap: 1 }, [
      Text(" Theme Preview ", {
        fgColor: "color00",
        bgColor: theme.accent,
        bold: true,
      }),
      Text(theme.id, { fgColor: "color08" }),
    ]),
    Text(theme.name, { bold: true, fgColor: theme.accent }),
    Text(theme.vibe, { fgColor: theme.accent, italic: true }),
    Text(theme.summary, { wrap: "word" }),
    Divider({ fgColor: "color08" }),
    Text("Palette vibe", { bold: true, fgColor: "color08" }),
    paletteRow(theme),
    Text("Keywords", { bold: true, fgColor: "color08" }),
    HStack(
      { flexWrap: "wrap", gap: 1 },
      theme.keywords.map((keyword) =>
        Text(` ${keyword} `, {
          fgColor: theme.accent,
          bgColor: "color08",
          bold: true,
        }),
      ),
    ),
    Divider({ fgColor: "color08" }),
    Text("Why this is a good Select demo", { bold: true, fgColor: "color08" }),
    Text(
      "• Uses rich items with display text separate from the selected value.",
    ),
    Text("• Filter text includes mood words, so prefix search feels useful."),
    Text(
      "• Uses a controlled query/cursor/highlight model suitable for async overlays.",
    ),
    Spacer(),
    Text("Try typing one of the sample filters above, then press Enter.", {
      fgColor: "color08",
      italic: true,
      wrap: "word",
    }),
  ]);
}

function pickerPane(theme: ThemePreset) {
  return VStack({ gap: 1 }, [
    Text("Select component demo", { bold: true, fgColor: theme.accent }),
    Text("A palette picker for theme presets.", {
      fgColor: "color08",
      italic: true,
    }),
    Divider({ fgColor: "color08" }),
    Text("Sample filters", { bold: true, fgColor: "color08" }),
    sampleFilters(),
    Text("Picker", { bold: true, fgColor: "color08" }),
    themeSelect({
      items: themeItems,
      query: selectQuery,
      cursor: selectCursor,
      highlightIndex: selectHighlightIndex,
    }),
  ]);
}

cel.init(new ProcessTerminal());
cel.viewport(() => {
  const cols = process.stdout.columns || 80;
  const theme = activeTheme();
  const wide = cols >= 80;
  const paneWidth = cols >= 100 ? 42 : 36;

  return VStack(
    {
      height: "100%",
      padding: { x: 2, y: 1 },
      onKeyPress: (key) => {
        if (key === "ctrl+q" || key === "ctrl+c") {
          quit();
        }
        if (key === "ctrl+r") {
          resetDemo();
        }
      },
    },
    [
      HStack({ gap: 1 }, [
        Text("◈", { fgColor: theme.accent, bold: true }),
        Text("Theme Preset Picker", { bold: true }),
        Spacer(),
        Text(theme.vibe, { fgColor: "color08", italic: true }),
      ]),
      Text("Search by vibe, inspect the value, and compare the preview pane.", {
        fgColor: "color08",
      }),
      Divider({ fgColor: "color08" }),
      ...(wide
        ? [
            HStack({ flex: 1 }, [
              VStack({ width: paneWidth, padding: { x: 1 } }, [
                pickerPane(theme),
              ]),
              VDivider({ fgColor: "color08" }),
              VStack({ flex: 1, padding: { x: 1 } }, [previewPane(theme)]),
            ]),
          ]
        : [
            pickerPane(theme),
            Divider({ fgColor: "color08" }),
            previewPane(theme),
          ]),
      Divider({ fgColor: "color08" }),
      Text("Tab/filter/enter · Ctrl+R reset · Ctrl+Q quit", {
        fgColor: "color08",
      }),
    ],
  );
});
