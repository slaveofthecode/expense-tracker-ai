import { useRef, useState } from 'react';
import { Box, Text } from 'ink';
import { Form, type FormField, type FormSetValue } from './Form';
import { todayISO, parseCurrency } from '../../utils/format';
import { suggestItem, type ItemSuggestion } from '../../utils/suggestItem';
import { suggestItemWithAgent } from '../../ai/suggest';
import type { Agent } from '../../ai/agent';
import { ITEM_TYPE_LABELS } from '../../types';
import type { Expense, Item, NewExpense } from '../../types';

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
		itemId: items[0]?.id ?? '',
		description: '',
		amount: '',
		date: todayISO(),
		installmentsTotal: '',
		installmentsCurrent: '',
		ownershipPercentage: '100',
		ownershipPerson: '',
	};
}

interface ExpenseFormProps {
	title: string;
	items: Item[];
	expenses?: Expense[];
	agent?: Agent;
	initial: ExpenseFormInitial;
	onSubmit: (input: NewExpense) => void;
	onBack: () => void;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DESCRIPTION_INDEX = 0;
const ITEM_INDEX = 1;
const SUGGESTION_COLOR = '#88c0d0';
const MUTED_COLOR = '#9e9e9e';
const ERROR_COLOR = '#ff5555';

export function ExpenseForm({
	title,
	items,
	expenses = [],
	agent,
	initial,
	onSubmit,
	onBack,
}: ExpenseFormProps) {
	const [error, setError] = useState<string | undefined>();
	const [suggestion, setSuggestion] = useState<ItemSuggestion | undefined>();
	const [aiSuggestion, setAiSuggestion] = useState<ItemSuggestion | undefined>();
	const [suggesting, setSuggesting] = useState(false);
	const [suggestError, setSuggestError] = useState<string | undefined>();
	const [pushedValue, setPushedValue] = useState<FormSetValue | undefined>();
	const itemTouched = useRef(initial.description !== '');
	const lastDescription = useRef(initial.description);
	const pushedNonce = useRef(0);
	const pushedItemId = useRef<string | undefined>();
	const valuesRef = useRef<string[]>([]);
	const initialItemValue = initial.itemId || items[0]?.id || '';

	const fields: FormField[] = [
		{ label: 'Descripción', type: 'text', initialValue: initial.description },
		{
			label: 'Ítem',
			type: 'select',
			options: items.map((i) => ({ value: i.id, label: i.name })),
			initialValue: initialItemValue,
		},
		{ label: 'Monto', type: 'text', initialValue: initial.amount },
		{ label: 'Fecha', type: 'text', initialValue: initial.date },
		{
			label: 'Cuotas totales',
			type: 'text',
			initialValue: initial.installmentsTotal,
		},
		{
			label: 'Cuota actual',
			type: 'text',
			initialValue: initial.installmentsCurrent,
		},
		{
			label: 'Mi %',
			type: 'text',
			initialValue: initial.ownershipPercentage,
		},
		{ label: 'Titular', type: 'text', initialValue: initial.ownershipPerson },
	];

	const applySuggestion = (s: ItemSuggestion) => {
		if (itemTouched.current) return;
		if (valuesRef.current[ITEM_INDEX] === s.itemId) return;
		pushedNonce.current += 1;
		pushedItemId.current = s.itemId;
		setPushedValue({ fieldIndex: ITEM_INDEX, value: s.itemId, nonce: pushedNonce.current });
	};

	const handleValuesChange = (values: string[]) => {
		valuesRef.current = values;
		const description = values[DESCRIPTION_INDEX];
		const itemId = values[ITEM_INDEX];

		if (lastDescription.current !== description) {
			lastDescription.current = description;
			setAiSuggestion(undefined);
		}

		const deterministic = suggestItem(items, expenses, description);
		const effective = aiSuggestion ?? deterministic;
		setSuggestion(effective);

		if (
			itemId !== effective?.itemId &&
			itemId !== pushedItemId.current &&
			itemId !== initialItemValue
		) {
			itemTouched.current = true;
		}

		if (effective && !itemTouched.current) {
			applySuggestion(effective);
		}
	};

	const handleAsk = async () => {
		const description = valuesRef.current[DESCRIPTION_INDEX] ?? '';
		if (description.trim() === '') return;
		if (!agent) {
			setSuggestError('No hay un proveedor de IA configurado.');
			return;
		}
		setSuggesting(true);
		setSuggestError(undefined);
		try {
			const s = await suggestItemWithAgent(agent, items, description);
			setAiSuggestion(s);
			setSuggestion(s);
			if (s && !itemTouched.current) applySuggestion(s);
			if (!s) {
				setSuggestError(
					'La IA no pudo determinar un ítem para este gasto.',
				);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			setSuggestError(`No se pudo consultar a la IA: ${message}`);
		} finally {
			setSuggesting(false);
		}
	};

	const handleSubmit = (values: string[]) => {
		const description = values[DESCRIPTION_INDEX].trim();
		const itemId = values[ITEM_INDEX];
		const amount = parseCurrency(values[2]);
		const date = values[3].trim();
		const installmentsTotalRaw = values[4].trim();
		const installmentsCurrentRaw = values[5].trim();
		const percentage = Number(values[6]);
		const person = values[7].trim();

		if (!itemId) {
			setError('Selecciona un ítem');
			return;
		}
		if (!description) {
			setError('La descripción es obligatoria');
			return;
		}
		if (!Number.isFinite(amount) || amount <= 0) {
			setError('El monto debe ser un número positivo');
			return;
		}
		if (!DATE_RE.test(date)) {
			setError('La fecha debe ser YYYY-MM-DD');
			return;
		}

		let installmentsTotal: number | undefined;
		let installmentsCurrent: number | undefined;
		if (installmentsTotalRaw) {
			installmentsTotal = Number(installmentsTotalRaw);
			if (!Number.isInteger(installmentsTotal) || installmentsTotal <= 0) {
				setError('Las cuotas totales deben ser un entero positivo');
				return;
			}
			installmentsCurrent =
				installmentsCurrentRaw === '' ? 1 : Number(installmentsCurrentRaw);
			if (
				!Number.isInteger(installmentsCurrent) ||
				installmentsCurrent < 1 ||
				installmentsCurrent > installmentsTotal
			) {
				setError(`La cuota actual debe estar entre 1 y ${installmentsTotal}`);
				return;
			}
		}

		if (!Number.isFinite(percentage) || percentage < 0 || percentage > 100) {
			setError('El % debe estar entre 0 y 100');
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

	const suggestionItem = suggestion
		? items.find((i) => i.id === suggestion.itemId)
		: undefined;
	const suggestionLabel = suggestionItem
		? `${ITEM_TYPE_LABELS[suggestionItem.type]} — ${suggestionItem.name}`
		: '';

	return (
		<Box flexDirection="column" padding={1}>
			{items.length === 0 ? (
				<Box marginBottom={1}>
					<Text color={ERROR_COLOR}>
						{'  '}No hay ítems creados. Creá uno primero con "i" desde el Dashboard.
					</Text>
				</Box>
			) : null}
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Form
					title={title}
					fields={fields}
					submitLabel="Guardar"
					onSubmit={handleSubmit}
					onBack={onBack}
					onValuesChange={handleValuesChange}
					onAsk={handleAsk}
					setValue={pushedValue}
				/>
				<Box flexDirection="column">
					{error ? (
						<Text color={ERROR_COLOR}>
							{'  '}
							{error}
						</Text>
					) : null}
					{suggesting ? (
						<Text color={MUTED_COLOR}>
							{'  '}⏳ La IA está pensando…
						</Text>
					) : suggestion ? (
						<Text color={SUGGESTION_COLOR}>
							{'  '}🤖 AI sugiere: {suggestionLabel}
						</Text>
					) : suggestError ? (
						<Text color={ERROR_COLOR}>
							{'  '}
							{suggestError}
						</Text>
					) : (valuesRef.current[DESCRIPTION_INDEX] ?? '').trim() !== '' ? (
						<Text color={MUTED_COLOR}>
							{'  '}Sin coincidencia: presioná ? para pedirle a la IA
						</Text>
					) : null}
				</Box>
			</Box>
		</Box>
	);
}

