import { useState } from "react";
import { Box, Text } from "ink";
import { Form, type FormField } from "./Form";
import { todayISO } from "../../utils/format";
import type { Item, NewExpense } from "../../types";

export interface ExpenseFormInitial {
  itemId: string;
  description: string;
  amount: string;
  date: string;
  installmentsTotal: string;
  installmentsCurrent: string;
  ownershipPercentage: string;
  ownershipPerson: string;
}

export function defaultExpenseFormInitial(items: Item[]): ExpenseFormInitial {
  return {
    itemId: items[0]?.id ?? "",
    description: "",
    amount: "",
    date: todayISO(),
    installmentsTotal: "",
    installmentsCurrent: "",
    ownershipPercentage: "100",
    ownershipPerson: "",
  };
}

interface ExpenseFormProps {
  title: string;
  items: Item[];
  initial: ExpenseFormInitial;
  onSubmit: (input: NewExpense) => void;
  onBack: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function ExpenseForm({
  title,
  items,
  initial,
  onSubmit,
  onBack,
}: ExpenseFormProps) {
  const [error, setError] = useState<string | undefined>();

  const fields: FormField[] = [
    {
      label: "Item",
      type: "select",
      options: items.map((i) => ({ value: i.id, label: i.name })),
      initialValue: initial.itemId,
    },
    { label: "Description", type: "text", initialValue: initial.description },
    { label: "Amount", type: "text", initialValue: initial.amount },
    { label: "Date", type: "text", initialValue: initial.date },
    {
      label: "Installments total",
      type: "text",
      initialValue: initial.installmentsTotal,
    },
    {
      label: "Installments current",
      type: "text",
      initialValue: initial.installmentsCurrent,
    },
    {
      label: "Ownership %",
      type: "text",
      initialValue: initial.ownershipPercentage,
    },
    { label: "Owner", type: "text", initialValue: initial.ownershipPerson },
  ];

  const handleSubmit = (values: string[]) => {
    const itemId = values[0];
    const description = values[1].trim();
    const amount = Number(values[2]);
    const date = values[3].trim();
    const installmentsTotalRaw = values[4].trim();
    const installmentsCurrentRaw = values[5].trim();
    const percentage = Number(values[6]);
    const person = values[7].trim();

    if (!itemId) {
      setError("Select an item");
      return;
    }
    if (!description) {
      setError("Description is required");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Amount must be a positive number");
      return;
    }
    if (!DATE_RE.test(date)) {
      setError("Date must be YYYY-MM-DD");
      return;
    }

    let installmentsTotal: number | undefined;
    let installmentsCurrent: number | undefined;
    if (installmentsTotalRaw) {
      installmentsTotal = Number(installmentsTotalRaw);
      if (!Number.isInteger(installmentsTotal) || installmentsTotal <= 0) {
        setError("Installments total must be a positive integer");
        return;
      }
      installmentsCurrent =
        installmentsCurrentRaw === "" ? 1 : Number(installmentsCurrentRaw);
      if (
        !Number.isInteger(installmentsCurrent) ||
        installmentsCurrent < 1 ||
        installmentsCurrent > installmentsTotal
      ) {
        setError(`Installments current must be between 1 and ${installmentsTotal}`);
        return;
      }
    }

    if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
      setError("Ownership % must be between 0 and 100");
      return;
    }

    onSubmit({
      itemId,
      description,
      amount,
      date,
      installments: installmentsTotal
        ? { total: installmentsTotal, current: installmentsCurrent ?? 1 }
        : undefined,
      ownership: {
        percentage,
        person: percentage === 100 ? undefined : person || undefined,
      },
    });
  };

  return (
    <Box flexDirection="column" padding={1}>
      <Form
        title={title}
        fields={fields}
        submitLabel="Save"
        onSubmit={handleSubmit}
        onBack={onBack}
      />
      {error ? <Text color="#ff5555">{"  "}{error}</Text> : null}
    </Box>
  );
}
