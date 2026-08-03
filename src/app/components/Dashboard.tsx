import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item, Expense } from "../../types";
import { formatCurrency, formatMonth } from "../../utils/format";
import { calcMonthlySummaries } from "../../utils/summaries";
import { Confirm } from "./Confirm";

interface DashboardProps {
  items: Item[];
  expenses: Expense[];
  month: string;
  onSelectItem: (itemId: string) => void;
  onAddItem: () => void;
  onEditItem: (itemId: string) => void;
  onDeleteItem: (itemId: string) => void;
  onAddExpense: () => void;
  onQuit: () => void;
}

export function Dashboard({
  items,
  expenses,
  month,
  onSelectItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddExpense,
  onQuit,
}: DashboardProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summaries = calcMonthlySummaries(items, expenses, month);

  useInput((_input, key) => {
    if (confirmingDelete) return;
    if (key.escape || (key.ctrl && _input.toLowerCase() === "c")) {
      onQuit();
      return;
    }
    if (items.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0));
    }
    if (key.return) {
      onSelectItem(items[selectedIndex].id);
    }
    if (_input.toLowerCase() === "a") {
      onAddExpense();
    }
    if (_input.toLowerCase() === "i") {
      onAddItem();
    }
    if (_input.toLowerCase() === "e") {
      onEditItem(items[selectedIndex].id);
    }
    if (_input.toLowerCase() === "d") {
      setConfirmingDelete(true);
    }
  });

  if (confirmingDelete) {
    const item = items[selectedIndex];
    return (
      <Confirm
        message={`Delete "${item.name}"? Its expenses will also be deleted.`}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDeleteItem(item.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          Expense Tracker AI
        </Text>
        <Text> — {formatMonth(month)}</Text>
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
        {items.length === 0 ? (
          <Text dimColor>No items yet. Press i to add one.</Text>
        ) : null}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navigate · Enter Select · a Add Expense · i Add Item · e
          Edit · d Delete · Esc Quit
        </Text>
      </Box>
    </Box>
  );
}
