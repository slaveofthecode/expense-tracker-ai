import { Box, Text, useInput } from "ink";

interface ConfirmProps {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function Confirm({ message, onConfirm, onCancel }: ConfirmProps) {
  useInput((_input, key) => {
    if (key.escape || _input.toLowerCase() === "n") {
      onCancel();
      return;
    }
    if (key.return || _input.toLowerCase() === "y") {
      onConfirm();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="#ffcc00">
        ¿Estás seguro?
      </Text>
      <Text>{message}</Text>
      <Box marginTop={1}>
        <Text dimColor color="#555">
          {"  "}y Confirmar · n Cancelar · Esc Cancelar
        </Text>
      </Box>
    </Box>
  );
}
