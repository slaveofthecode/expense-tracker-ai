import { Box, Text, useInput } from "ink";
import { useState } from "react";
import { formatCurrency, parseCurrency } from "../../utils/format";

export interface FormOption {
  value: string;
  label: string;
}

export interface FormField {
  label: string;
  type?: "text" | "select";
  options?: FormOption[];
  initialValue: string;
}

interface FormProps {
  title: string;
  fields: FormField[];
  submitLabel: string;
  onSubmit: (values: string[]) => void;
  onBack: () => void;
}

export function Form({ title, fields, submitLabel, onSubmit, onBack }: FormProps) {
  const [values, setValues] = useState(() => fields.map((f) => f.initialValue));
  const [activeIndex, setActiveIndex] = useState(0);

  const activeField = fields[activeIndex];
  const isSelect = activeField.type === "select";

  const LABEL_COLOR = "#c678dd";
  const DATA_COLOR = "#c0caf5";
  const ACTIVE_COLOR = "#00d4ff";

  const cycleOption = (direction: 1 | -1) => {
    setValues((prev) => {
      const options = fields[activeIndex].options ?? [];
      if (options.length === 0) return prev;
      const currentIndex = options.findIndex((o) => o.value === prev[activeIndex]);
      const base = currentIndex === -1 ? 0 : currentIndex;
      const next = (base + direction + options.length) % options.length;
      return prev.map((v, i) => (i === activeIndex ? options[next].value : v));
    });
  };

  useInput((_input, key) => {
    if (key.ctrl && _input.toLowerCase() === "c") {
      process.exit(0);
      return;
    }
    if (key.escape) {
      onBack();
      return;
    }
    if (key.return) {
      if (activeIndex === fields.length - 1) {
        onSubmit(values);
      } else {
        setActiveIndex((i) => i + 1);
      }
      return;
    }
    if (key.upArrow) {
      setActiveIndex((i) => (i > 0 ? i - 1 : fields.length - 1));
      return;
    }
    if (key.downArrow) {
      setActiveIndex((i) => (i < fields.length - 1 ? i + 1 : 0));
      return;
    }
    if (key.leftArrow) {
      if (isSelect) cycleOption(-1);
      return;
    }
    if (key.rightArrow) {
      if (isSelect) cycleOption(1);
      return;
    }
    if ((key.backspace || key.delete) && !isSelect) {
      setValues((prev) =>
        prev.map((v, i) => (i === activeIndex ? v.slice(0, -1) : v)),
      );
      return;
    }
    if (key.tab || key.pageUp || key.pageDown) {
      return;
    }
    if (_input && !isSelect) {
      setValues((prev) =>
        prev.map((v, i) => (i === activeIndex ? v + _input : v)),
      );
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="#00d4ff">
          {title}
        </Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        {fields.map((field, i) => {
          const isActive = i === activeIndex;
          let display =
            field.options?.find((o) => o.value === values[i])?.label ?? values[i];
          // Auto-format amount field with currency while typing
          if (field.label === "Monto") {
            const raw = values[i] ?? "";
            const parsed = parseCurrency(raw);
            if (raw.trim() === "") {
              display = "$";
            } else if (Number.isFinite(parsed)) {
              display = formatCurrency(parsed);
            } else {
              // show raw input prefixed with $ if not already
              display = raw.startsWith("$") ? raw : `$${raw}`;
            }
          }

          const cursor = isActive && !isSelect ? "▌" : "";
          return (
            <Box key={field.label}>
              <Text color={isActive ? ACTIVE_COLOR : undefined}>
                {isActive ? "❯ " : "  "}
              </Text>
              <Text color={LABEL_COLOR} bold={isActive}>
                {field.label}: 
              </Text>
              <Text color={isActive ? ACTIVE_COLOR : DATA_COLOR}>
                {display}
                {cursor}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Text color="#88c0d0">{"  "}↑↓ Navegar · ←→ Opción · Enter Siguiente/{submitLabel} · Esc Volver</Text>
      </Box>
    </Box>
  );
}
