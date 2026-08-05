import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Expense, Item } from '../../types';
import { formatCurrency, myShare, ownershipLabel } from '../../utils/format';
import { Confirm } from './Confirm';

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
		if (_input.toLowerCase() === 'e') {
			onEdit();
		}
		if (_input.toLowerCase() === 'd') {
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

	const LABEL_COLOR = '#c678dd'; // label color
	const DATA_COLOR = '#c0caf5'; // data color
	const SHORTCUT_COLOR = '#88c0d0';

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1}>
				<Text bold color="#00d4ff">
					Detalle del Gasto
				</Text>
			</Box>

			<Box flexDirection="column">
				<Box>
					<Text bold color={LABEL_COLOR}>
						Ítem:{' '}
					</Text>
					<Text color={DATA_COLOR}>{item.name}</Text>
				</Box>
				<Box>
					<Text bold color={LABEL_COLOR}>
						Descripción:{' '}
					</Text>
					<Text color={DATA_COLOR}>{expense.description}</Text>
				</Box>
				<Box>
					<Text bold color={LABEL_COLOR}>
						Fecha:{' '}
					</Text>
					<Text color={DATA_COLOR}>{expense.date}</Text>
				</Box>
				<Box>
					<Text bold color={LABEL_COLOR}>
						Monto total:{' '}
					</Text>
					<Text color={DATA_COLOR}>{formatCurrency(expense.amount)}</Text>
				</Box>
				<Box>
					<Text bold color={LABEL_COLOR}>
						Mi parte:{' '}
					</Text>
					<Text color={DATA_COLOR}>
						{formatCurrency(myAmount)} (
						{ownershipLabel(
							expense.ownership.percentage,
							expense.ownership.person
						)}
						)
					</Text>
				</Box>
				{expense.installments && (
					<Box>
						<Text bold color={LABEL_COLOR}>
							Cuotas:{' '}
						</Text>
						<Text color={DATA_COLOR}>
							{expense.installments.current} de {expense.installments.total}
						</Text>
					</Box>
				)}
			</Box>

			<Box marginTop={1}>
				<Text color={SHORTCUT_COLOR}>e Editar · d Eliminar · Esc Volver</Text>
			</Box>
		</Box>
	);
}
