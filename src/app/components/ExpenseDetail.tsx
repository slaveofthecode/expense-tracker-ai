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
        message={`¿Eliminar "${expense.description}"?`}
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
          Detalle del Gasto
        </Text>
      </Box>

      <Box flexDirection="column">
        <Box>
          <Text bold>Ítem: </Text>
          <Text>{item.name}</Text>
        </Box>
        <Box>
          <Text bold>Descripción: </Text>
          <Text>{expense.description}</Text>
        </Box>
        <Box>
          <Text bold>Fecha: </Text>
          <Text>{expense.date}</Text>
        </Box>
        <Box>
          <Text bold>Monto total: </Text>
          <Text>{formatCurrency(expense.amount)}</Text>
        </Box>
        <Box>
          <Text bold>Mi parte: </Text>
          <Text>
            {formatCurrency(myAmount)} ({ownershipLabel(expense.ownership.percentage, expense.ownership.person)})
          </Text>
        </Box>
        {expense.installments && (
          <Box>
            <Text bold>Cuotas: </Text>
            <Text>
              {expense.installments.current} de {expense.installments.total}
            </Text>
          </Box>
        )}
      </Box>

      <Box marginTop={1}>
        <Text dimColor color="#555">
          e Editar · d Eliminar · Esc Volver
        </Text>
      </Box>
    </Box>
  );
}
