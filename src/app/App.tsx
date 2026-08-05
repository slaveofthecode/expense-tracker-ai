import { useState } from "react";
import type { Database } from "bun:sqlite";
import {
  listItems,
  listExpenses,
  createItem,
  updateItem,
  deleteItem,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../db/repository";
import { Dashboard } from "./components/Dashboard";
import { ItemDetail } from "./components/ItemDetail";
import { ItemDetailCard } from "./components/ItemDetailCard";
import { ExpenseDetail } from "./components/ExpenseDetail";
import { ItemForm } from "./components/ItemForm";
import { ExpenseForm, defaultExpenseFormInitial } from "./components/ExpenseForm";
import { todayISO, formatCurrency } from "../utils/format";
import { getLatestYear } from "../utils/summaries";
import type { NewExpense, NewItem, Screen } from "../types";

interface AppProps {
  db: Database;
}

function getBackScreen(current: Screen): Screen {
  switch (current.name) {
    case "itemDetail":
      return { name: "dashboard" };
    case "expenseDetail":
      return { name: "itemDetail", itemId: current.itemId };
    case "addItem":
    case "editItem":
      return { name: "dashboard" };
    case "addExpense":
      return current.itemId
        ? { name: "itemDetail", itemId: current.itemId }
        : { name: "dashboard" };
    case "editExpense":
      return {
        name: "expenseDetail",
        expenseId: current.expenseId,
        itemId: current.itemId,
      };
    default:
      return current;
  }
}

export function App({ db }: AppProps) {
  const [items, setItems] = useState(() => listItems(db));
  const [expenses, setExpenses] = useState(() => listExpenses(db));
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });
  const [year, setYear] = useState<number>(
    () => getLatestYear(expenses) ?? new Date().getFullYear(),
  );

  const refresh = () => {
    setItems(listItems(db));
    setExpenses(listExpenses(db));
  };

  const handleQuit = () => {
    process.exit(0);
  };

  const handleAddItem = (input: NewItem) => {
    createItem(db, input);
    refresh();
    setScreen({ name: "dashboard" });
  };

  const handleUpdateItem = (itemId: string, input: NewItem) => {
    updateItem(db, itemId, input);
    refresh();
    setScreen({ name: "dashboard" });
  };

  const handleDeleteItem = (itemId: string) => {
    deleteItem(db, itemId);
    refresh();
  };

  const handleAddExpense = (input: NewExpense) => {
    createExpense(db, input);
    refresh();
    setScreen(
      input.itemId
        ? { name: "itemDetail", itemId: input.itemId }
        : { name: "dashboard" },
    );
  };

  const handleUpdateExpense = (expenseId: string, input: NewExpense) => {
    updateExpense(db, expenseId, input);
    refresh();
    setScreen({ name: "expenseDetail", expenseId, itemId: input.itemId });
  };

  const handleDeleteExpense = (expenseId: string, itemId: string) => {
    deleteExpense(db, expenseId);
    refresh();
    setScreen({ name: "itemDetail", itemId });
  };

  const handleBack = () => {
    setScreen((current) => getBackScreen(current));
  };

  switch (screen.name) {
    case "dashboard":
      return (
        <Dashboard
          items={items}
          expenses={expenses}
          year={year}
          onYearChange={setYear}
          onSelectItem={(itemId) => setScreen({ name: "itemDetail", itemId })}
          onAddItem={() => setScreen({ name: "addItem" })}
          onEditItem={(itemId) => setScreen({ name: "editItem", itemId })}
          onDeleteItem={handleDeleteItem}
          onAddExpense={() => setScreen({ name: "addExpense" })}
          onQuit={handleQuit}
        />
      );

    case "itemDetail": {
      const item = items.find((i) => i.id === screen.itemId);
      if (!item) return null;
      const itemExpenses = expenses.filter((e) => e.itemId === screen.itemId);
      
      if (item.type === "recurring" || item.type === "insurance" || item.type === "other") {
        return (
          <ItemDetailCard
            item={item}
            expenses={itemExpenses}
            year={year}
            onYearChange={setYear}
            onSelectExpense={(expenseId) =>
              setScreen({ name: "expenseDetail", expenseId, itemId: item.id })
            }
            onAddExpense={() => setScreen({ name: "addExpense", itemId: item.id })}
            onBack={handleBack}
          />
        );
      }

      return (
        <ItemDetail
          item={item}
          expenses={itemExpenses}
          year={year}
          onYearChange={setYear}
          onSelectExpense={(expenseId) =>
            setScreen({ name: "expenseDetail", expenseId, itemId: item.id })
          }
          onAddExpense={() => setScreen({ name: "addExpense", itemId: item.id })}
          onBack={handleBack}
        />
      );
    }

    case "expenseDetail": {
      const expense = expenses.find((e) => e.id === screen.expenseId);
      if (!expense) return null;
      const item = items.find((i) => i.id === expense.itemId);
      if (!item) return null;
      return (
        <ExpenseDetail
          expense={expense}
          item={item}
          onEdit={() =>
            setScreen({
              name: "editExpense",
              expenseId: expense.id,
              itemId: item.id,
            })
          }
          onDelete={handleDeleteExpense}
          onBack={handleBack}
        />
      );
    }

    case "addItem":
      return (
        <ItemForm
          title="Agregar Ítem"
          initialName=""
          initialType="other"
          onSubmit={handleAddItem}
          onBack={handleBack}
        />
      );

    case "editItem": {
      const item = items.find((i) => i.id === screen.itemId);
      if (!item) return null;
      return (
        <ItemForm
          title={`Editar Ítem — ${item.name}`}
          initialName={item.name}
          initialType={item.type}
          onSubmit={(input) => handleUpdateItem(item.id, input)}
          onBack={handleBack}
        />
      );
    }

    case "addExpense": {
      const preselected = screen.itemId
        ? items.find((i) => i.id === screen.itemId)
        : undefined;
      const initial = defaultExpenseFormInitial(items);
      return (
        <ExpenseForm
          title="Agregar Gasto"
          items={items}
          initial={{
            ...initial,
            itemId: preselected?.id ?? initial.itemId,
          }}
          onSubmit={handleAddExpense}
          onBack={handleBack}
        />
      );
    }

    case "editExpense": {
      const expense = expenses.find((e) => e.id === screen.expenseId);
      if (!expense) return null;
      const item = items.find((i) => i.id === expense.itemId);
      if (!item) return null;
      return (
        <ExpenseForm
          title="Editar Gasto"
          items={items}
          initial={{
            itemId: expense.itemId,
            description: expense.description,
            amount: formatCurrency(expense.amount),
            date: expense.date,
            installmentsTotal: expense.installments
              ? String(expense.installments.total)
              : "",
            installmentsCurrent: expense.installments
              ? String(expense.installments.current)
              : "",
            ownershipPercentage: String(expense.ownership.percentage),
            ownershipPerson: expense.ownership.person ?? "",
          }}
          onSubmit={(input) => handleUpdateExpense(expense.id, input)}
          onBack={handleBack}
        />
      );
    }
  }
}
