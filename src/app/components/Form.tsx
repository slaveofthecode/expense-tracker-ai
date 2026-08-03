import { Box, Text, useInput } from "ink";
import { useState } from "react";

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
      if (isSelect) {
        cycleOption(-1);
      } else {
        setActiveIndex((i) => (i > 0 ? i - 1 : fields.length - 1));
      }
      return;
    }
    if (key.downArrow) {
      if (isSelect) {
        cycleOption(1);
      } else {
        setActiveIndex((i) => (i < fields.length - 1 ? i + 1 : 0));
      }
      return;
    }
    if (key.backspace) {
      setValues((prev) =>
        prev.map((v, i) => (i === activeIndex ? v.slice(0, -1) : v)),
      );
      return;
    }
    if (
      key.leftArrow ||
      key.rightArrow ||
      key.tab ||
      key.delete ||
      key.pageUp ||
      key.pageDown
    ) {
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
          const display =
            field.options?.find((o) => o.value === values[i])?.label ?? values[i];
          const cursor = isActive && !isSelect ? "▌" : "";
          return (
            <Box key={field.label}>
              <Text color={isActive ? "#00d4ff" : undefined}>
                {isActive ? "❯ " : "  "}
                {field.label}: {display}
                {cursor}
              </Text>
            </Box>
          );
        })}
      </Box>

      <Box>
        <Text dimColor color="#555">
          {"  "}↑↓ Navigate · Enter Next/{submitLabel} · Esc Back
        </Text>
      </Box>
    </Box>
  );
}
