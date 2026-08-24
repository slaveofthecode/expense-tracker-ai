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
import { createAgent } from "../ai/agent";
import { createOllamaProvider } from "../ai/provider";
import { createReadTools } from "../ai/tools";
import { Dashboard } from "./components/Dashboard";
import { Charts } from "./components/Charts";
import { Chat } from "./components/Chat";
import { ItemDetail } from "./components/ItemDetail";
import { ItemDetailCard } from "./components/ItemDetailCard";
import { ExpenseDetail } from "./components/ExpenseDetail";
import { ItemForm } from "./components/ItemForm";
import { ExpenseForm, defaultExpenseFormInitial } from "./components/ExpenseForm";
import { formatCurrency } from "../utils/format";
import { currentMonth, monthOf } from "../utils/summaries";
import type { Item, NewExpense, NewItem, Screen } from "../types";
import type { SearchResult } from "../utils/filters";

interface AppProps {
  db: Database;
}

function getBackScreen(current: Screen): Screen {
  switch (current.name) {
    case "itemDetail":
      return { name: "dashboard" };
    case "charts":
      return { name: "dashboard" };
    case "chat":
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
  const [month, setMonth] = useState<string>(() => currentMonth());
  const year = Number(month.slice(0, 4));

  const handleYearChange = (nextYear: number) => {
    setMonth(`${nextYear}-${month.slice(5, 7)}`);
  };
  const [provider] = useState(() => createOllamaProvider());
  const [agent] = useState(() =>
    createAgent({
      provider,
      tools: createReadTools(db),
    }),
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

  const handleAddExpense = (inputs: NewExpense[]) => {
    for (const input of inputs) {
      createExpense(db, input);
    }
    refresh();
    const first = inputs[0];
    setScreen(
      first?.itemId
        ? { name: "itemDetail", itemId: first.itemId }
        : { name: "dashboard" },
    );
  };

  const handleChatCreateItem = (input: NewItem): Item => {
    const item = createItem(db, input);
    refresh();
    return item;
  };

  const handleChatCreateExpense = (input: NewExpense) => {
    createExpense(db, input);
    refresh();
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

  const handleSearchResult = (result: SearchResult) => {
    const item = items.find((i) => i.id === result.itemId);
    if (!item) return;
    if (result.kind === "expense") {
      setMonth(monthOf(result.date));
      setScreen({
        name: "itemDetail",
        itemId: item.id,
        focusExpenseId: result.expenseId,
      });
    } else {
      setScreen({ name: "itemDetail", itemId: item.id });
    }
  };

  switch (screen.name) {
    case "dashboard":
      return (
        <Dashboard
          items={items}
          expenses={expenses}
          month={month}
          onMonthChange={setMonth}
          onSelectItem={(itemId) => setScreen({ name: "itemDetail", itemId })}
          onSearchResult={handleSearchResult}
          onAddItem={() => setScreen({ name: "addItem" })}
          onEditItem={(itemId) => setScreen({ name: "editItem", itemId })}
          onDeleteItem={handleDeleteItem}
          onAddExpense={() => setScreen({ name: "addExpense" })}
          onOpenCharts={() => setScreen({ name: "charts" })}
          onOpenChat={() => setScreen({ name: "chat" })}
          onQuit={handleQuit}
        />
      );

    case "charts":
      return (
        <Charts
          items={items}
          expenses={expenses}
          year={year}
          onYearChange={handleYearChange}
          onBack={handleBack}
        />
      );

    case "chat":
      return (
        <Chat
          agent={agent}
          provider={provider}
          items={items}
          hasData={items.length > 0}
          onCreateItem={handleChatCreateItem}
          onCreateExpense={handleChatCreateExpense}
          onBack={handleBack}
        />
      );

    case "itemDetail": {
      const item = items.find((i) => i.id === screen.itemId);
      if (!item) return null;
      const itemExpenses = expenses.filter((e) => e.itemId === screen.itemId);
      
      if (item.type === "credit_card") {
        return (
          <ItemDetailCard
            item={item}
            expenses={itemExpenses}
            allItems={items}
            allExpenses={expenses}
            year={year}
            onYearChange={handleYearChange}
            onSelectExpense={(expenseId) =>
              setScreen({ name: "expenseDetail", expenseId, itemId: item.id })
            }
            onSearchResult={handleSearchResult}
            initialExpenseId={screen.focusExpenseId}
            onAddExpense={() => setScreen({ name: "addExpense", itemId: item.id })}
            onBack={handleBack}
          />
        );
      }

      return (
        <ItemDetail
          item={item}
          expenses={itemExpenses}
          allItems={items}
          allExpenses={expenses}
          year={year}
          onYearChange={handleYearChange}
          onSelectExpense={(expenseId) =>
            setScreen({ name: "expenseDetail", expenseId, itemId: item.id })
          }
          onSearchResult={handleSearchResult}
          initialExpenseId={screen.focusExpenseId}
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
          expenses={expenses}
          agent={agent}
          initial={{
            ...initial,
            itemId: preselected?.id ?? initial.itemId,
          }}
          allowFixedMonths
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
          expenses={expenses}
          agent={agent}
          initial={{
            itemId: expense.itemId,
            description: expense.description,
            amount: formatCurrency(expense.amount),
            date: expense.date,
            fixedMonths: "",
            installmentsTotal: expense.installments
              ? String(expense.installments.total)
              : "",
            installmentsCurrent: expense.installments
              ? String(expense.installments.current)
              : "",
            ownershipPercentage: String(expense.ownership.percentage),
            ownershipPerson: expense.ownership.person ?? "",
          }}
          onSubmit={(inputs) => handleUpdateExpense(expense.id, inputs[0])}
          onBack={handleBack}
        />
      );
    }
  }
}
