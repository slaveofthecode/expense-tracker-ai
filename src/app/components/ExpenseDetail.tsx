import { Box, Text, useInput } from "ink";
import type { Expense, Item } from "../../types";
import { formatCurrency, myShare, ownershipLabel } from "../../utils/format";

interface ExpenseDetailProps {
  expense: Expense;
  item: Item;
  onBack: () => void;
}

export function ExpenseDetail({ expense, item, onBack }: ExpenseDetailProps) {
  useInput((_input, key) => {
    if (key.escape) {
      onBack();
    }
  });

  const myAmount = myShare(expense.amount, expense.ownership.percentage);

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          Expense Detail
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text bold>Item: </Text>
          <Text>{item.name}</Text>
        </Box>
        <Box>
          <Text bold>Description: </Text>
          <Text>{expense.description}</Text>
        </Box>
        <Box>
          <Text bold>Date: </Text>
          <Text>{expense.date}</Text>
        </Box>
        <Box>
          <Text bold>Total amount: </Text>
          <Text>{formatCurrency(expense.amount)}</Text>
        </Box>
        <Box>
          <Text bold>My share: </Text>
          <Text>
            {formatCurrency(myAmount)} ({ownershipLabel(expense.ownership.percentage, expense.ownership.person)})
          </Text>
        </Box>
        {expense.installments && (
          <Box>
            <Text bold>Installments: </Text>
            <Text>
              {expense.installments.current} of {expense.installments.total}
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor color="#555">
          Esc Back
        </Text>
      </Box>
    </Box>
  );
}
