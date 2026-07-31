import { useState } from "react";
import { Text } from "ink";
import { items } from "../data/items";
import { expenses } from "../data/expenses";
import { Dashboard } from "./components/Dashboard";
import { ItemDetail } from "./components/ItemDetail";
import { ExpenseDetail } from "./components/ExpenseDetail";
import type { Screen } from "../types";

function getBackScreen(current: Screen): Screen {
  switch (current.name) {
    case "itemDetail":
      return { name: "dashboard" };
    case "expenseDetail":
      return { name: "itemDetail", itemId: current.itemId };
    default:
      return current;
  }
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ name: "dashboard" });

  const handleQuit = () => {
    process.exit(0);
  };

  const handleSelectItem = (itemId: string) => {
    setScreen({ name: "itemDetail", itemId });
  };

  const handleSelectExpense = (expenseId: string) => {
    const expense = expenses.find((e) => e.id === expenseId);
    if (expense) {
      setScreen({ name: "expenseDetail", expenseId, itemId: expense.itemId });
    }
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
          onSelectItem={handleSelectItem}
          onQuit={handleQuit}
        />
      );

    case "itemDetail": {
      const item = items.find((i) => i.id === screen.itemId);
      if (!item) return null;
      const itemExpenses = expenses.filter(
        (e) => e.itemId === screen.itemId,
      );
      return (
        <ItemDetail
          item={item}
          expenses={itemExpenses}
          onSelectExpense={handleSelectExpense}
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
        <ExpenseDetail expense={expense} item={item} onBack={handleBack} />
      );
    }
  }
}
