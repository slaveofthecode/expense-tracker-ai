import { Box, Text, useInput } from "ink";
import { useState } from "react";
import type { Expense, Item } from "../../types";
import { formatCurrency, myShare, ownershipLabel } from "../../utils/format";
import { Confirm } from "./Confirm";

interface ExpenseDetailProps {
  expense: Expense;
  item: Item;
  onEdit: () => void;
  onDelete: (expenseId: string, itemId: string) => void;
  onBack: () => void;
}

export function ExpenseDetail({
  expense,
  item,
  onEdit,
  onDelete,
  onBack,
}: ExpenseDetailProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useInput((_input, key) => {
    if (confirmingDelete) return;
    if (key.escape) {
      onBack();
      return;
    }
    if (_input.toLowerCase() === "e") {
      onEdit();
    }
    if (_input.toLowerCase() === "d") {
      setConfirmingDelete(true);
    }
  });

  if (confirmingDelete) {
    return (
      <Confirm
        message={`Delete "${expense.description}"?`}
        onConfirm={() => {
          setConfirmingDelete(false);
          onDelete(expense.id, item.id);
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    );
  }

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
          e Edit · d Delete · Esc Back
        </Text>
      </Box>
    </Box>
  );
}
