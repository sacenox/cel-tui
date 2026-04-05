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
});

cel.init(new ProcessTerminal());
cel.viewport(() =>
  VStack(
    {
      height: "100%",
      padding: { x: 2, y: 1 },
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
    },
    [
      Text("Select Component Demo", { bold: true, fgColor: "color06" }),
      Text("Tab to focus · type to filter · ↑↓ to navigate · Enter to select", {
        fgColor: "color08",
      }),
      Divider({ fgColor: "color08" }),
      Text(""),
      fruitSelect(),
      Text(""),
      Divider({ fgColor: "color08" }),
      selected
        ? HStack({}, [
            Text("Selected: ", { fgColor: "color08" }),
            Text(selected, { bold: true, fgColor: "color02" }),
          ])
        : Text("No selection yet", { fgColor: "color08" }),
      Spacer(),
      Text("Ctrl+R reset · Ctrl+Q quit", { fgColor: "color08" }),
    ],
  ),
);
