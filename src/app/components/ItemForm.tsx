import { useState } from 'react';
import { Box, Text } from 'ink';
import { Form, type FormField } from './Form';
import { ITEM_TYPES, ITEM_TYPE_LABELS } from '../../types';
import type { ItemType, NewItem } from '../../types';

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
		{ label: 'Nombre', type: 'text', initialValue: initialName },
		{
			label: 'Tipo',
			type: 'select',
			options: ITEM_TYPES.map((t) => ({
				value: t,
				label: ITEM_TYPE_LABELS[t],
			})),
			initialValue: initialType,
		},
	];

	const handleSubmit = (values: string[]) => {
		const name = values[0].trim();
		if (!name) {
			setError('El nombre es obligatorio');
			return;
		}
		onSubmit({ name, type: values[1] as ItemType });
	};

	return (
		<Box marginBottom={1} flexDirection="column" gap={2} marginLeft={2}>
			<Form
				title={title}
				fields={fields}
				submitLabel="Guardar"
				onSubmit={handleSubmit}
				onBack={onBack}
			/>
			{error ? (
				<Text color="#ff5555">
					{'  '}
					{error}
				</Text>
			) : null}
		</Box>
	);
}
