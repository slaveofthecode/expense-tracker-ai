import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Item, Expense } from "../../types";
import { formatCurrency, MONTHS_SHORT_ES } from "../../utils/format";
import { currentMonth, monthOf } from "../../utils/summaries";

const NOT_MINE_COLOR = "#e0af68";
const YEAR_COLOR = "#ffd700";
const MONTH_HEADER_COLOR = "#7aa2f7";
const ITEM_HEADER_COLOR = "#c678dd";
const ROW_COLOR = "#c0caf5";
const FIRST_INSTALLMENT_COLOR = "#9ece6a";
const DESC_WIDTH = 28;
const MONTH_WIDTH = 15;

interface ItemDetailProps {
  item: Item;
  expenses: Expense[];
  year: number;
  onYearChange: (year: number) => void;
  onSelectExpense: (expenseId: string) => void;
  onAddExpense: () => void;
  onBack: () => void;
}

export function ItemDetail({
  item,
  expenses,
  year,
  onYearChange,
  onSelectExpense,
  onAddExpense,
  onBack,
}: ItemDetailProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const yearExpenses = expenses.filter((e) => {
    const startYear = Number(monthOf(e.date).slice(0, 4));
    const startMonth = Number(monthOf(e.date).slice(5, 7)) - 1;
    const window = e.installments?.total ?? 1;
    const endAbsolute = startMonth + window - 1;
    const endYear = startYear + Math.floor(endAbsolute / 12);
    return year >= startYear && year <= endYear;
  });
  const currentIndex = Math.min(
    selectedIndex,
    Math.max(yearExpenses.length - 1, 0),
  );
  const now = currentMonth();
  const currentYear = Number(now.slice(0, 4));
  const currentMonthIndex = Number(now.slice(5, 7)) - 1;

  useInput((_input, key) => {
    if (key.escape) {
      onBack();
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
    if (yearExpenses.length === 0) return;
    if (key.upArrow) {
      setSelectedIndex((i) => (i > 0 ? i - 1 : yearExpenses.length - 1));
    }
    if (key.downArrow) {
      setSelectedIndex((i) => (i < yearExpenses.length - 1 ? i + 1 : 0));
    }
    if (key.return) {
      onSelectExpense(yearExpenses[currentIndex].id);
    }
    if (_input.toLowerCase() === "a") {
      onAddExpense();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          {item.name}
        </Text>
        <Text> — </Text>
        <Text bold color={YEAR_COLOR}>
          ◀ {year} ▶
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Box>
          <Text bold color={ITEM_HEADER_COLOR}>
            {"  "}
            {"Descripción".padEnd(DESC_WIDTH)}
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
          {"─".repeat(DESC_WIDTH + MONTH_WIDTH * 12)}
        </Text>
        {yearExpenses.map((e, i) => {
          const isSelected = i === currentIndex;
          const prefix = isSelected ? "❯ " : "  ";
          const startYear = Number(monthOf(e.date).slice(0, 4));
          const startMonth = Number(monthOf(e.date).slice(5, 7)) - 1;
          const window = e.installments?.total ?? 1;
          const monthlyAmount =
            window > 1 ? Math.round(e.amount / window) : e.amount;
          const covered = new Set<number>();
          for (let k = 0; k < window; k++) {
            const absolute = startMonth + k;
            if (startYear + Math.floor(absolute / 12) !== year) continue;
            covered.add(absolute % 12);
          }
          const notMine = e.ownership.percentage === 0;
          const firstCuotaMonth = window > 1 && startYear === year ? startMonth : -1;
          const badge = e.installments ? ` en ${e.installments.total} ctas` : "";
          const description = `${e.description}${badge}`
            .padEnd(DESC_WIDTH)
            .slice(0, DESC_WIDTH);
          return (
            <Box key={e.id}>
              <Text color={isSelected ? "#00d4ff" : ROW_COLOR}>
                {prefix}
                {description}
              </Text>
              {MONTHS_SHORT_ES.map((_, mi) => {
                const isCurrentMonth =
                  year === currentYear && mi === currentMonthIndex;
                const showAmount = covered.has(mi);
                const textColor = notMine && showAmount
                  ? NOT_MINE_COLOR
                  : firstCuotaMonth === mi
                    ? FIRST_INSTALLMENT_COLOR
                    : undefined;
                return (
                  <Text
                    key={mi}
                    color={textColor}
                    dimColor={!isCurrentMonth}
                  >
                    {showAmount && monthlyAmount > 0
                      ? formatCurrency(monthlyAmount).padStart(MONTH_WIDTH)
                      : " ".repeat(MONTH_WIDTH)}
                  </Text>
                );
              })}
            </Box>
          );
        })}
        {yearExpenses.length === 0 ? (
          <Text dimColor>No hay gastos en {year}.</Text>
        ) : null}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navegar · Enter Detalle · ←→ Año · a Agregar Gasto · Esc
          Volver
        </Text>
      </Box>

      <Box>
        <Text color={NOT_MINE_COLOR}>
          {"  "}■{" "}
        </Text>
        <Text dimColor>no es mi gasto (0% de mi parte)</Text>
      </Box>
      <Box>
        <Text color={FIRST_INSTALLMENT_COLOR}>
          {"  "}■{" "}
        </Text>
        <Text dimColor>primera cuota</Text>
      </Box>
    </Box>
  );
}
