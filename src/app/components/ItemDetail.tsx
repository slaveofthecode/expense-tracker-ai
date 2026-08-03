import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item, Expense } from "../../types";
import { formatCurrency, formatDate, ownershipLabel } from "../../utils/format";

interface ItemDetailProps {
  item: Item;
  expenses: Expense[];
  onSelectExpense: (expenseId: string) => void;
  onAddExpense: () => void;
  onBack: () => void;
}

export function ItemDetail({
  item,
  expenses,
  onSelectExpense,
  onAddExpense,
  onBack,
}: ItemDetailProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
      return;
    }
    if (expenses.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : expenses.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < expenses.length - 1 ? i + 1 : 0));
    }
    if (key.return && expenses.length > 0) {
      onSelectExpense(expenses[selectedIndex].id);
    }
    if (_input.toLowerCase() === "a") {
      onAddExpense();
    }
  });

  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const myShare = expenses.reduce(
    (s, e) => s + (e.amount * e.ownership.percentage) / 100,
    0,
  );

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          {item.name}
        </Text>
        <Text>
          {" — "}
          {formatCurrency(total)} total · {formatCurrency(myShare)} my share
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold>
            {"  "}Date{" ".padEnd(8)} Description{" ".padEnd(20)} Amount{" ".padEnd(9)} My
            Share{" ".padEnd(5)} Ownership
          </Text>
        </Box>
        <Text color="#333" dimColor>
          {"  "}
          {"─".repeat(66)}
        </Text>
        {expenses.map((e, i) => {
          const isSelected = i === selectedIndex;
          const prefix = isSelected ? "❯ " : "  ";
          const date = formatDate(e.date).padEnd(10);
          const desc = e.description.padEnd(22);
          const amt = formatCurrency(e.amount).padStart(8);
          const share = formatCurrency(
            (e.amount * e.ownership.percentage) / 100,
          ).padStart(8);
          const own = ownershipLabel(e.ownership.percentage, e.ownership.person);

          const inst = e.installments
            ? ` (${e.installments.current}/${e.installments.total})`
            : "";

          return (
            <Box key={e.id}>
              <Text color={isSelected ? "#00d4ff" : undefined}>
                {prefix}
                {date}
                {" "}
                {desc}
                {" "}
                {amt}
                {"  "}
                {share}
                {"  "}
                {own}
                {inst}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navigate · Enter Detail · a Add Expense · Esc Back
        </Text>
      </Box>
    </Box>
  );
}
