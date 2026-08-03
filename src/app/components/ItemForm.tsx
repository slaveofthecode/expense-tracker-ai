import { useState } from "react";
import { Box, Text } from "ink";
import { Form, type FormField } from "./Form";
import { ITEM_TYPES } from "../../types";
import type { ItemType, NewItem } from "../../types";

interface ItemFormProps {
  title: string;
  initialName: string;
  initialType: ItemType;
  onSubmit: (input: NewItem) => void;
  onBack: () => void;
}

export function ItemForm({
  title,
  initialName,
  initialType,
  onSubmit,
  onBack,
}: ItemFormProps) {
  const [error, setError] = useState<string | undefined>();

  const fields: FormField[] = [
    { label: "Name", type: "text", initialValue: initialName },
    {
      label: "Type",
      type: "select",
      options: ITEM_TYPES.map((t) => ({ value: t, label: t })),
      initialValue: initialType,
    },
  ];

  const handleSubmit = (values: string[]) => {
    const name = values[0].trim();
    if (!name) {
      setError("Name is required");
      return;
    }
    onSubmit({ name, type: values[1] as ItemType });
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
