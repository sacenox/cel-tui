import { cel, VStack, HStack, Text, ProcessTerminal } from "@cel-tui/core";
import { Select, Divider, Spacer } from "@cel-tui/components";

let selected = "";

const fruits = [
  "apple",
  "apricot",
  "avocado",
  "banana",
  "blackberry",
  "blueberry",
  "cherry",
  "coconut",
  "cranberry",
  "date",
  "dragonfruit",
  "elderberry",
  "fig",
  "grape",
  "guava",
  "kiwi",
  "lemon",
  "lime",
  "lychee",
  "mango",
  "nectarine",
  "orange",
  "papaya",
  "peach",
  "pear",
  "pineapple",
  "plum",
  "pomegranate",
  "raspberry",
  "strawberry",
  "watermelon",
];

const fruitSelect = Select({
  items: fruits,
  maxVisible: 8,
  placeholder: "search fruits...",
  onSelect: (value) => {
    selected = value;
    cel.render();
  },
  onKeyPress: (key) => {
    if (key === "ctrl+q") {
      cel.stop();
      process.exit();
    }
    if (key === "ctrl+r") {
      selected = "";
      fruitSelect.reset();
      cel.render();
    }
  },
  focusStyle: { fgColor: "white" },
});

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      padding: { x: 2, y: 1 },
      fgColor: "white",
    },
    [
      Text("Select Component Demo", { bold: true, fgColor: "cyan" }),
      Text("Tab to focus · type to filter · ↑↓ to navigate · Enter to select", {
        fgColor: "brightBlack",
      }),
      Divider({ fgColor: "brightBlack" }),
      Text(""),
      fruitSelect(),
      Text(""),
      Divider({ fgColor: "brightBlack" }),
      selected
        ? HStack({}, [
            Text("Selected: ", { fgColor: "brightBlack" }),
            Text(selected, { bold: true, fgColor: "green" }),
          ])
        : Text("No selection yet", { fgColor: "brightBlack" }),
      Spacer(),
      Text("Ctrl+R reset · Ctrl+Q quit", { fgColor: "brightBlack" }),
    ],
  ),
);
