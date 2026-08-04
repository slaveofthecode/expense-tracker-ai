import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item, Expense } from "../../types";
import {
  formatCurrency,
  formatYearWide,
  MONTHS_SHORT_ES,
} from "../../utils/format";
import { calcYearlySummaries, currentMonth } from "../../utils/summaries";
import { Confirm } from "./Confirm";

const NOT_MINE_COLOR = "#e0af68";
const YEAR_COLOR = "#ffd700";
const MONTH_HEADER_COLOR = "#7aa2f7";
const ITEM_HEADER_COLOR = "#c678dd";
const ITEM_NAME_COLOR = "#c0caf5";
const ITEM_WIDTH = 24;
const MONTH_WIDTH = 15;

interface DashboardProps {
  items: Item[];
  expenses: Expense[];
  year: number;
  onYearChange: (year: number) => void;
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
  year,
  onYearChange,
  onSelectItem,
  onAddItem,
  onEditItem,
  onDeleteItem,
  onAddExpense,
  onQuit,
}: DashboardProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const summaries = calcYearlySummaries(items, expenses, year);
  const now = currentMonth();
  const currentYear = Number(now.slice(0, 4));
  const currentMonthIndex = Number(now.slice(5, 7)) - 1;

  useInput((_input, key) => {
    if (confirmingDelete) return;
    if (key.escape || (key.ctrl && _input.toLowerCase() === "c")) {
      onQuit();
      return;
    }
    if (key.leftArrow) {
      onYearChange(year - 1);
      return;
    }
    if (key.rightArrow) {
      onYearChange(year + 1);
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
        message={`¿Eliminar "${item.name}"? Sus gastos también se eliminarán.`}
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
      <Box marginBottom={1} flexDirection="column">
        <Text bold color="#00d4ff">
          Expense Tracker AI
        </Text>
        <Text bold color={YEAR_COLOR}>
          ── ◀ {formatYearWide(year)} ▶ ──
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={ITEM_HEADER_COLOR}>
            {"  "}
            {"Concepto".padEnd(ITEM_WIDTH)}
          </Text>
          {MONTHS_SHORT_ES.map((month, mi) => (
            <Text
              key={month}
              bold
              color={MONTH_HEADER_COLOR}
              dimColor={year !== currentYear || mi !== currentMonthIndex}
            >
              {month.padStart(MONTH_WIDTH)}
            </Text>
          ))}
        </Box>
        <Text color="#333" dimColor>
          {"  "}
          {"─".repeat(ITEM_WIDTH + MONTH_WIDTH * 12)}
        </Text>
        {summaries.map((s, i) => {
          const item = items.find((it) => it.id === s.itemId);
          if (!item) return null;
          const isSelected = i === selectedIndex;
          const prefix = isSelected ? "❯ " : "  ";
          return (
            <Box key={item.id}>
              <Text color={isSelected ? "#00d4ff" : ITEM_NAME_COLOR}>
                {prefix}
                {item.name.padEnd(ITEM_WIDTH)}
              </Text>
              {s.months.map((m, mi) => {
                const notMine = m.total > 0 && m.myShare === 0;
                const isCurrentMonth =
                  year === currentYear && mi === currentMonthIndex;
                return (
                  <Text
                    key={mi}
                    color={notMine ? NOT_MINE_COLOR : undefined}
                    dimColor={!isCurrentMonth}
                  >
                    {m.total > 0
                      ? formatCurrency(m.total).padStart(MONTH_WIDTH)
                      : " ".repeat(MONTH_WIDTH)}
                  </Text>
                );
              })}
            </Box>
          );
        })}
        {items.length === 0 ? (
          <Text dimColor>No hay ítems todavía. Presiona "i" para agregar uno.</Text>
        ) : null}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navegar · Enter Seleccionar · ←→ Año · a Agregar Gasto · i
          Agregar Ítem · e Editar · d Eliminar · Esc Salir
        </Text>
      </Box>

      <Box>
        <Text color={NOT_MINE_COLOR}>
          {"  "}■{" "}
        </Text>
        <Text dimColor>no es mi gasto (0% de mi parte)</Text>
      </Box>
    </Box>
  );
}
