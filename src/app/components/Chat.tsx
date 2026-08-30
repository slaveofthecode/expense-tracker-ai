import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Agent } from '../../ai/agent';
import type { LLMProvider } from '../../ai/provider';
import {
	applyGuidedAnswer,
	extractExpenseIntent,
	findItemForConcept,
	toTitleCaseEs,
	type ExpenseDraft,
	type IncompleteExpenseDraft,
	type MissingField,
} from '../../ai/expenseIntent';
import { ITEM_TYPE_LABELS } from '../../types';
import type { Item, NewExpense, NewItem } from '../../types';
import { answerDateQuestion } from '../../utils/dateIntent';
import { formatCurrency, todayISO } from '../../utils/format';

const ACCENT_COLOR = '#00d4ff';
const TEXT_COLOR = '#c0caf5';
const MUTED_COLOR = '#9e9e9e';
const HINT_COLOR = '#88c0d0';
const USER_COLOR = '#fff1a8';
const ASSISTANT_COLOR = '#9ece6a';
const ERROR_COLOR = '#ff5555';
const SUCCESS_COLOR = '#a6e3a1';
const MAX_VISIBLE_MESSAGES = 20;

interface ChatMessage {
	role: 'user' | 'assistant' | 'error';
	content: string;
	toolCallCount?: number;
}

interface PendingCreation {
	draft: ExpenseDraft;
	matchedItem?: Item;
}

interface GuidedCollection {
	draft: IncompleteExpenseDraft;
	missingFields: MissingField[];
}

const FIELD_PROMPTS: Record<MissingField, string> = {
	itemName: 'En qué grupo lo cargás? Escribí el nombre de uno existente o uno nuevo.',
	description: 'Qué compraste o pagaste?',
	amount: 'Cuánto fue? (monto en pesos)',
};

const FIELD_LABELS: Record<MissingField, string> = {
	itemName: 'Grupo',
	description: 'Descripción',
	amount: 'Monto',
};

function completeDraft(draft: IncompleteExpenseDraft): ExpenseDraft {
	return {
		itemName: draft.itemName!,
		itemType: draft.itemType,
		description: draft.description!,
		amount: draft.amount!,
		installmentsTotal: draft.installmentsTotal,
		ownershipPercentage: draft.ownershipPercentage,
		ownershipPerson: draft.ownershipPerson,
	};
}

function fieldPrompt(field: MissingField): string {
	return `   · ${FIELD_LABELS[field]}: ${FIELD_PROMPTS[field]}`;
}

interface ChatProps {
	agent: Agent;
	provider: LLMProvider;
	items: Item[];
	hasData: boolean;
	onBack: () => void;
	onCreateItem: (input: NewItem) => Item;
	onCreateExpense: (input: NewExpense) => void;
}

export function Chat({
	agent,
	provider,
	items,
	hasData,
	onBack,
	onCreateItem,
	onCreateExpense,
}: ChatProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [thinking, setThinking] = useState(false);
	const [streamingText, setStreamingText] = useState<string | null>(null);
	const [pending, setPending] = useState<PendingCreation | null>(null);
	const [collecting, setCollecting] = useState<GuidedCollection | null>(null);

	const appendAssistant = (content: string) => {
		setMessages((prev) => [...prev, { role: 'assistant', content }]);
	};

	const presentDraft = (draft: ExpenseDraft) => {
		const matchedItem = findItemForConcept(items, draft.itemName);
		setPending({ draft, matchedItem });
		const perInstallment =
			draft.installmentsTotal > 1
				? draft.amount / draft.installmentsTotal
				: undefined;
		const itemLine = matchedItem
			? `Grupo existente: ${matchedItem.name}`
			: `Grupo nuevo: "${toTitleCaseEs(draft.itemName)}" (${
					ITEM_TYPE_LABELS[draft.itemType ?? 'other']
				})`;
		const ownershipLine =
			draft.ownershipPercentage !== undefined &&
			draft.ownershipPercentage < 100
				? `   Compartido: ${draft.ownershipPercentage}%${
						draft.ownershipPerson ? ` con ${draft.ownershipPerson}` : ''
					}`
				: '';
		appendAssistant(
			[
				'🤖 Detecté un gasto para crear:',
				`   ${itemLine}`,
				`   Descripción: ${draft.description}`,
				`   Monto total: ${formatCurrency(draft.amount)}${
					perInstallment !== undefined && Number.isFinite(perInstallment)
						? ` · ${draft.installmentsTotal} cuotas de ${formatCurrency(perInstallment)}`
						: ''
				}`,
				ownershipLine,
				'¿Confirmás la creación? (s/n)',
			]
				.filter((line) => line !== '')
				.join('\n'),
		);
	};

	const confirmPending = () => {
		const current = pending;
		if (!current) return;
		const { draft, matchedItem } = current;
		const item =
			matchedItem ??
			onCreateItem({
				name: toTitleCaseEs(draft.itemName),
				type: draft.itemType ?? 'other',
			});
		onCreateExpense({
			itemId: item.id,
			description: draft.description,
			amount: draft.amount,
			date: todayISO(),
			installments:
				draft.installmentsTotal > 1
					? { total: draft.installmentsTotal, current: 1 }
					: undefined,
			ownership: {
				percentage: draft.ownershipPercentage ?? 100,
				person: draft.ownershipPerson,
			},
		});
		setPending(null);
		appendAssistant(`✅ Gasto creado en "${item.name}".`);
	};

	const cancelPending = () => {
		setPending(null);
		appendAssistant('Cancelado. No se creó nada.');
	};

	const startGuided = (
		draft: IncompleteExpenseDraft,
		missingFields: MissingField[],
	) => {
		setCollecting({ draft, missingFields });
		const list = missingFields.map((field) => `   · ${FIELD_LABELS[field]}`).join('\n');
		appendAssistant(
			[
				'🤖 Querés cargar un gasto, pero me faltan datos:',
				list,
				'Respondé el primero y seguimos:',
				fieldPrompt(missingFields[0]),
			].join('\n'),
		);
	};

	const cancelGuided = () => {
		setCollecting(null);
		appendAssistant('Cancelado. No se cargó ningún gasto.');
	};

	const continueGuided = (answer: string) => {
		const current = collecting;
		if (!current) return;
		const field = current.missingFields[0];
		const result = applyGuidedAnswer(current.draft, field, answer);
		if (!result.ok) {
			appendAssistant(`No entendí eso. ${FIELD_PROMPTS[field]}`);
			return;
		}
		if (result.missingFields.length > 0) {
			setCollecting({ draft: result.draft, missingFields: result.missingFields });
			appendAssistant(
				[
					`Perfecto. Queda pendiente:`,
					result.missingFields.map((f) => `   · ${FIELD_LABELS[f]}`).join('\n'),
					fieldPrompt(result.missingFields[0]),
				].join('\n'),
			);
			return;
		}
		setCollecting(null);
		presentDraft(completeDraft(result.draft));
	};

	const send = (question: string) => {
		setMessages((prev) => [...prev, { role: 'user', content: question }]);
		const direct = answerDateQuestion(question);
		if (direct !== null) {
			appendAssistant(direct);
			return;
		}
		setThinking(true);
		setStreamingText(null);
		extractExpenseIntent(provider, question, items)
			.then((intent) => {
				if (intent?.intent === 'create_expense_incomplete') {
					startGuided(intent.draft, intent.missingFields);
					return undefined;
				}
				if (intent?.intent === 'create_expense') {
					presentDraft(intent.draft);
					return undefined;
				}
				if (!hasData) {
					appendAssistant(
						'No hay datos cargados. Creá grupos y gastos desde el Dashboard para que pueda ayudarte.',
					);
					return undefined;
				}
				return agent
					.ask(question, {
						onToken: (token) =>
							setStreamingText((prev) => (prev ?? '') + token),
					})
					.then((result) => {
						setMessages((prev) => [
							...prev,
							{
								role: 'assistant',
								content: result.answer,
								toolCallCount: result.toolCallCount,
							},
						]);
					});
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				setMessages((prev) => [...prev, { role: 'error', content: message }]);
				setPending(null);
			})
			.finally(() => {
				setThinking(false);
				setStreamingText(null);
			});
	};

	useInput((value, key) => {
		if (key.escape || (key.ctrl && value.toLowerCase() === 'c')) {
			if (pending) {
				cancelPending();
				return;
			}
			if (collecting) {
				cancelGuided();
				return;
			}
			onBack();
			return;
		}
		if (pending) {
			const answer = value.toLowerCase();
			if (answer === 's' || answer === 'y') confirmPending();
			else if (answer === 'n') cancelPending();
			return;
		}
		if (collecting && key.return) {
			const answer = input.trim();
			if (answer !== '' && !thinking) {
				setInput('');
				continueGuided(answer);
			}
			return;
		}
		if (key.return) {
			const question = input.trim();
			if (question !== '' && !thinking) {
				setInput('');
				send(question);
			}
			return;
		}
		if (key.backspace || key.delete) {
			setInput((s) => s.slice(0, -1));
			return;
		}
		if (key.tab || key.pageUp || key.pageDown) {
			return;
		}
		if (value) {
			setInput((s) => s + value);
		}
	});

	const hiddenCount = messages.length - MAX_VISIBLE_MESSAGES;
	const visible = hiddenCount > 0 ? messages.slice(hiddenCount) : messages;

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Text bold color={ACCENT_COLOR}>
					{'EXPENSE TRACKER AI · CHAT'}
				</Text>
			</Box>

			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={ACCENT_COLOR}
				padding={1}
				marginBottom={1}
			>
				{messages.length === 0 ? (
					<Box flexDirection="column">
						<Text color={HINT_COLOR}>
							{'  '}Preguntá sobre tus gastos en lenguaje natural. Ej: "¿cuánto
							gasté en marzo?"
						</Text>
						<Text color={HINT_COLOR}>
							{'  '}También podés crear gastos. Ej: "añadir gasto para la tarjeta
							de credito de la naranja, zapatillas 1.200.000 en 6 cuotas"
						</Text>
					</Box>
				) : (
					<>
						{hiddenCount > 0 ? (
							<Box>
								<Text color={MUTED_COLOR}>{`  … ${hiddenCount} mensajes anteriores`}</Text>
							</Box>
						) : null}
						{visible.map((message, i) => (
							<MessageRow key={`${message.role}-${i}`} message={message} />
						))}
						{thinking ? (
							<Box>
								<Text color={ASSISTANT_COLOR}>
									{'  🤖 '}
									{streamingText ? (
										<>
											{streamingText}
											<Text color={ACCENT_COLOR}>{'▌'}</Text>
										</>
									) : (
										<Text color={MUTED_COLOR}>{'⏳ pensando…'}</Text>
									)}
								</Text>
							</Box>
						) : null}
					</>
				)}
			</Box>

			<Box marginBottom={1}>
				<Text bold color={USER_COLOR}>
					{'❯ '}
				</Text>
				<Text color={TEXT_COLOR}>{input}</Text>
				<Text color={ACCENT_COLOR}>{'▌'}</Text>
			</Box>

			<Box>
				<Text color={HINT_COLOR}>
					{pending
						? '  s Confirmar · n Cancelar'
						: collecting
							? '  Enter Enviar · Esc Cancelar'
							: '  Enter Enviar · Esc Volver'}
				</Text>
			</Box>
		</Box>
	);
}

function MessageRow({ message }: { message: ChatMessage }) {
	if (message.role === 'user') {
		return (
			<Box>
				<Text bold color={USER_COLOR}>
					{'❯ '}
				</Text>
				<Text color={TEXT_COLOR}>{message.content}</Text>
			</Box>
		);
	}
	if (message.role === 'error') {
		return (
			<Box>
				<Text color={ERROR_COLOR}>{message.content}</Text>
			</Box>
		);
	}
	return (
		<Box flexDirection="column">
			<Text color={ASSISTANT_COLOR}>{message.content}</Text>
			{message.toolCallCount && message.toolCallCount > 0 ? (
				<Text color={MUTED_COLOR}>{`  (consultó ${message.toolCallCount} tools)`}</Text>
			) : null}
		</Box>
	);
}
