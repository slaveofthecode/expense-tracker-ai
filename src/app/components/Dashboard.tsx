import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item, Expense } from "../../types";
import { formatCurrency } from "../../utils/format";
import { calcMonthlySummaries } from "../../utils/summaries";

interface DashboardProps {
  items: Item[];
  expenses: Expense[];
  onSelectItem: (itemId: string) => void;
  onQuit: () => void;
}

export function Dashboard({
  items,
  expenses,
  onSelectItem,
  onQuit,
}: DashboardProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const summaries = calcMonthlySummaries(items, expenses);

  useInput((_input, key) => {
    if (key.escape || (key.ctrl && _input === "c")) {
      onQuit();
      return;
    }
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0));
    }
    if (key.return) {
      onSelectItem(items[selectedIndex].id);
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          Expense Tracker AI
        </Text>
        <Text> — July 2026</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold>
            {"  ".padEnd(2)} Item{" ".padEnd(22)} Total{" ".padEnd(11)} My
            Share
          </Text>
        </Box>
        <Text color="#333" dimColor>
          {"  "}
          {"─".repeat(56)}
        </Text>
        {summaries.map((s, i) => {
          const item = items.find((it) => it.id === s.itemId);
          if (!item) return null;
          const isSelected = i === selectedIndex;
          const prefix = isSelected ? "❯ " : "  ";
          const name = item.name.padEnd(24);
          const total = formatCurrency(s.totalAmount).padStart(10);
          const share = formatCurrency(s.myShare).padStart(10);

          return (
            <Box key={item.id}>
              <Text color={isSelected ? "#00d4ff" : undefined}>
                {prefix}
                {name}
                {total}
                {"  "}
                {share}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navigate · Enter Select · Esc Quit
        </Text>
      </Box>
    </Box>
  );
}
