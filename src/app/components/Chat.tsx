import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Agent } from '../../ai/agent';
import { answerDateQuestion } from '../../utils/dateIntent';

const ACCENT_COLOR = '#00d4ff';
const TEXT_COLOR = '#c0caf5';
const MUTED_COLOR = '#9e9e9e';
const HINT_COLOR = '#88c0d0';
const USER_COLOR = '#fff1a8';
const ASSISTANT_COLOR = '#9ece6a';
const ERROR_COLOR = '#ff5555';
const MAX_VISIBLE_MESSAGES = 20;

interface ChatMessage {
	role: 'user' | 'assistant' | 'error';
	content: string;
	toolCallCount?: number;
}

interface ChatProps {
	agent: Agent;
	onBack: () => void;
}

export function Chat({ agent, onBack }: ChatProps) {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState('');
	const [thinking, setThinking] = useState(false);

	const send = (question: string) => {
		setMessages((prev) => [...prev, { role: 'user', content: question }]);
		const direct = answerDateQuestion(question);
		if (direct !== null) {
			setMessages((prev) => [...prev, { role: 'assistant', content: direct }]);
			return;
		}
		setThinking(true);
		agent
			.ask(question)
			.then((result) => {
				setMessages((prev) => [
					...prev,
					{
						role: 'assistant',
						content: result.answer,
						toolCallCount: result.toolCallCount,
					},
				]);
			})
			.catch((err: unknown) => {
				const message = err instanceof Error ? err.message : String(err);
				setMessages((prev) => [...prev, { role: 'error', content: message }]);
			})
			.finally(() => {
				setThinking(false);
			});
	};

	useInput((_input, key) => {
		if (key.escape || (key.ctrl && _input.toLowerCase() === 'c')) {
			onBack();
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
		if (_input) {
			setInput((s) => s + _input);
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
					<Box>
						<Text color={HINT_COLOR}>
							{'  '}Preguntá sobre tus gastos en lenguaje natural. Ej: "¿cuánto
							gasté en marzo?"
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
								<Text color={MUTED_COLOR}>{'  ⏳ pensando…'}</Text>
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
					{'  '}Enter Enviar · Esc Volver
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
