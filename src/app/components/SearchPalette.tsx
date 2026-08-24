import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Expense, Item, ItemType } from '../../types';
import { searchResults, type SearchResult } from '../../utils/filters';
import { formatCurrency, formatDate } from '../../utils/format';

const ITEM_NAME_COLOR = '#c0caf5';
const TYPE_COLOR = '#c678dd';
const MUTED_COLOR = '#9e9e9e';
const SHARED_COLOR = '#e0af68';
const HINT_COLOR = '#88c0d0';
const MAX_RESULTS = 12;

const TYPE_SHORT: Record<ItemType, string> = {
	credit_card: 'TC',
	kids: 'Nenas',
	car: 'Auto',
	home: 'Depto-Casa',
	other: 'Otros',
};

interface SearchPaletteProps {
	items: Item[];
	expenses: Expense[];
	onSelect: (result: SearchResult) => void;
	onClose: () => void;
}

export function SearchPalette({
	items,
	expenses,
	onSelect,
	onClose,
}: SearchPaletteProps) {
	const [query, setQuery] = useState('');
	const [selectedIndex, setSelectedIndex] = useState(0);
	const results = searchResults(items, expenses, query);
	const currentIndex = Math.min(
		selectedIndex,
		Math.max(results.length - 1, 0)
	);
	const visible = results.slice(0, MAX_RESULTS);

	useInput((_input, key) => {
		if (key.escape) {
			onClose();
			return;
		}
		if (key.return) {
			const result = results[currentIndex];
			if (result) onSelect(result);
			return;
		}
		if (key.upArrow) {
			if (results.length > 0) {
				setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1));
			}
			return;
		}
		if (key.downArrow) {
			if (results.length > 0) {
				setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0));
			}
			return;
		}
		if (key.backspace || key.delete) {
			setQuery((q) => q.slice(0, -1));
			setSelectedIndex(0);
			return;
		}
		if (key.tab || key.pageUp || key.pageDown) {
			return;
		}
		if (_input) {
			setQuery((q) => q + _input);
			setSelectedIndex(0);
		}
	});

	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="#00d4ff"
			padding={1}
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text bold color="#00d4ff">
					{'/ '}
				</Text>
				<Text color="#c0caf5">{query}</Text>
				<Text color="#00d4ff">▌</Text>
			</Box>
			{query.trim() === '' ? (
				<Box>
					<Text color={HINT_COLOR}>
						{'  '}Escribí para buscar en conceptos, ítems y personas
					</Text>
				</Box>
			) : results.length === 0 ? (
				<Box>
					<Text color={MUTED_COLOR}>{`  Sin resultados para "${query}"`}</Text>
				</Box>
			) : (
				<>
					{visible.map((result, i) => (
						<ResultRow
							key={result.kind === 'expense' ? result.expenseId : `item-${result.itemId}`}
							result={result}
							selected={i === currentIndex}
						/>
					))}
					{results.length > MAX_RESULTS ? (
						<Box>
							<Text color={MUTED_COLOR}>
								{'  '}… y {results.length - MAX_RESULTS} más
							</Text>
						</Box>
					) : null}
				</>
			)}
			<Box marginTop={1}>
				<Text color={HINT_COLOR}>
					{'  '}↑↓ Navegar · Enter Ir al ítem · Esc Cerrar
				</Text>
			</Box>
		</Box>
	);
}

function ResultRow({
	result,
	selected,
}: {
	result: SearchResult;
	selected: boolean;
}) {
	const prefix = selected ? '❯ ' : '  ';
	if (result.kind === 'item') {
		return (
			<Box>
				<Text color={ITEM_NAME_COLOR} bold={selected}>
					{prefix}
					{result.itemName}
				</Text>
				<Text color={TYPE_COLOR} bold={selected}>
					{` [${TYPE_SHORT[result.itemType]}]`}
				</Text>
				<Text color={MUTED_COLOR} bold={selected}>
					{'  sin gastos'}
				</Text>
			</Box>
		);
	}
	const shared = result.percentage < 100;
	return (
		<Box>
			<Text color={ITEM_NAME_COLOR} bold={selected}>
				{prefix}
				{result.itemName}
			</Text>
			<Text color={TYPE_COLOR} bold={selected}>
				{` [${TYPE_SHORT[result.itemType]}]`}
			</Text>
			<Text color={MUTED_COLOR} bold={selected}>
				{` · ${result.description}`}
			</Text>
			{result.person ? (
				<Text color={SHARED_COLOR} bold={selected}>
					{` · ${result.person}`}
				</Text>
			) : null}
			<Text color={shared ? SHARED_COLOR : MUTED_COLOR} bold={selected}>
				{` · ${formatCurrency(result.amount)}`}
			</Text>
			<Text color={MUTED_COLOR} bold={selected}>
				{` · ${formatDate(result.date)}`}
			</Text>
		</Box>
	);
}
