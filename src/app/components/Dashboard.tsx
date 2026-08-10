import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Item, Expense, ItemType } from '../../types';
import { ITEM_TYPES } from '../../types';
import {
	formatCurrency,
	formatYearWide,
	MONTHS_SHORT_ES,
} from '../../utils/format';
import { calcYearlySummaries, currentMonth } from '../../utils/summaries';
import type { SearchResult } from '../../utils/filters';
import { Confirm } from './Confirm';
import { SearchPalette } from './SearchPalette';

const NOT_MINE_COLOR = '#e0af68';
const YEAR_COLOR = '#ffd700';
const MONTH_HEADER_COLOR = '#ffffff';
const ITEM_HEADER_COLOR = '#c678dd';
const ITEM_NAME_COLOR = '#c0caf5';
const MONTH_CELL_COLOR = '#9e9e9e';
const ITEM_WIDTH = 24;
const MONTH_WIDTH = 15;
// toggle inverted background selection preview (true = inverted background, false = colored text)
const USE_INVERTED_SELECTION = false;
const TYPE_FILTERS: (ItemType | 'all')[] = ['all', ...ITEM_TYPES];

interface DashboardProps {
	items: Item[];
	expenses: Expense[];
	year: number;
	onYearChange: (year: number) => void;
	onSelectItem: (itemId: string) => void;
	onSearchResult: (result: SearchResult) => void;
	onAddItem: () => void;
	onEditItem: (itemId: string) => void;
	onDeleteItem: (itemId: string) => void;
	onAddExpense: () => void;
	onOpenCharts: () => void;
	onQuit: () => void;
}

export function Dashboard({
	items,
	expenses,
	year,
	onYearChange,
	onSelectItem,
	onSearchResult,
	onAddItem,
	onEditItem,
	onDeleteItem,
	onAddExpense,
	onOpenCharts,
	onQuit,
}: DashboardProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [typeFilter, setTypeFilter] = useState<ItemType | 'all'>('all');
	const visibleItems =
		typeFilter === 'all'
			? items
			: items.filter((item) => item.type === typeFilter);
	const currentIndex = Math.min(
		selectedIndex,
		Math.max(visibleItems.length - 1, 0)
	);
	const summaries = calcYearlySummaries(visibleItems, expenses, year);
	const now = currentMonth();
	const currentYear = Number(now.slice(0, 4));
	const currentMonthIndex = Number(now.slice(5, 7)) - 1;

	useInput((_input, key) => {
		if (searchOpen || confirmingDelete) return;
		if (key.escape || (key.ctrl && _input.toLowerCase() === 'c')) {
			onQuit();
			return;
		}
		if (key.leftArrow) {
			onYearChange(year - 1);
			return;
		}
		if (key.rightArrow) {
			onYearChange(year + 1);
			return;
		}
		if (_input.toLowerCase() === '/') {
			setSearchOpen(true);
			return;
		}
		if (_input.toLowerCase() === 't') {
			setTypeFilter((prev) => {
				const idx = TYPE_FILTERS.indexOf(prev);
				return TYPE_FILTERS[(idx + 1) % TYPE_FILTERS.length];
			});
			return;
		}
		if (_input.toLowerCase() === 'a') {
			onAddExpense();
			return;
		}
		if (_input.toLowerCase() === 'i') {
			onAddItem();
			return;
		}
		if (_input.toLowerCase() === 'g') {
			onOpenCharts();
			return;
		}
		if (visibleItems.length === 0) return;
		if (key.upArrow) {
			setSelectedIndex((i) => (i > 0 ? i - 1 : visibleItems.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((i) => (i < visibleItems.length - 1 ? i + 1 : 0));
		}
		if (key.return) {
			onSelectItem(visibleItems[currentIndex].id);
		}
		if (_input.toLowerCase() === 'e') {
			onEditItem(visibleItems[currentIndex].id);
		}
		if (_input.toLowerCase() === 'd') {
			setConfirmingDelete(true);
		}
	});

	if (confirmingDelete) {
		const item = visibleItems[currentIndex];
		return (
			<Confirm
				message={`¿Eliminar "${item.name}"? Sus gastos también se eliminarán.`}
				onConfirm={() => {
					setConfirmingDelete(false);
					onDeleteItem(item.id);
				}}
				onCancel={() => setConfirmingDelete(false)}
			/>
		);
	}

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Text bold color="#00d4ff">
					{'EXPENSE TRACKER AI'}
				</Text>
				<Text color={'gray'}>{' [ '}</Text>
				<Text bold color={'#fff1a8'}>
					{String(formatYearWide(year)).split('').join('')}
				</Text>
				<Text color={'gray'}>{' ] '}</Text>
			</Box>

			{searchOpen ? (
				<SearchPalette
					items={items}
					expenses={expenses}
					onSelect={onSearchResult}
					onClose={() => setSearchOpen(false)}
				/>
			) : null}

			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Text bold color={ITEM_HEADER_COLOR}>
						{'  '}
						{'Concepto'.padEnd(ITEM_WIDTH)}
					</Text>
					{MONTHS_SHORT_ES.map((month, mi) => {
						const isCurrent = year === currentYear && mi === currentMonthIndex;
						return (
							<Text
								key={`header-${mi}`}
								bold={isCurrent}
								color={MONTH_HEADER_COLOR}
								dimColor={false}
							>
								{month.padStart(MONTH_WIDTH)}
							</Text>
						);
					})}
				</Box>
				<Text color="#333" dimColor>
					{'  '}
					{'─'.repeat(ITEM_WIDTH + MONTH_WIDTH * 12)}
				</Text>
				{summaries.map((s, i) => {
					const item = visibleItems.find((it) => it.id === s.itemId);
					if (!item) return null;
					const isSelected = i === currentIndex;
					const prefix = isSelected ? '❯ ' : '  ';

					// Determine whether this item should be treated as an aggregator
					const itemExpenses = expenses.filter((e) => e.itemId === item.id);
					const isAggregator = item.type === 'credit_card' || item.type === 'loan';

					return (
						<Box key={item.id}>
							<Text
								color={ITEM_NAME_COLOR}
								bold={isSelected}
								inverse={USE_INVERTED_SELECTION && isSelected}
							>
								{prefix}
								{item.name.slice(0, ITEM_WIDTH - 2).padEnd(ITEM_WIDTH)}
							</Text>
							{s.months.map((m, mi) => {
								const isShared = m.total > 0 && m.myShare < m.total;
								const monthColor =
									!isAggregator && isShared
										? NOT_MINE_COLOR
										: MONTH_CELL_COLOR;
								return (
									<Text
										key={`month-${item.id}-${mi}`}
										color={monthColor}
										bold={isSelected}
										inverse={USE_INVERTED_SELECTION && isSelected}
										dimColor={false}
									>
										{m.total > 0
											? formatCurrency(m.total).padStart(MONTH_WIDTH)
											: ' '.repeat(MONTH_WIDTH)}
									</Text>
								);
							})}
						</Box>
					);
				})}
				{items.length === 0 ? (
					<Text dimColor>
						No hay ítems todavía. Presiona "i" para agregar uno.
					</Text>
				) : visibleItems.length === 0 ? (
					<Text dimColor>No hay ítems que coincidan con la búsqueda.</Text>
				) : null}
			</Box>

			<Box marginBottom={1}>
				<Text color="#88c0d0">
					{'  '}↑↓ Navegar · Enter Seleccionar · ←→ Año ·{' '}
				</Text>
				<Text color="#88c0d0">
					<Text bold>/</Text> Buscar · <Text bold>a</Text> Agregar Gasto ·{' '}
					<Text bold>i</Text> Agregar Ítem · <Text bold>e</Text> Editar ·{' '}
					<Text bold>d</Text> Eliminar · <Text bold>g</Text> Gráficos ·{' '}
					<Text bold>Esc</Text> Salir
				</Text>
			</Box>

			<Box>
				<Text color={NOT_MINE_COLOR}>{'  '}■ </Text>
				<Text dimColor>gasto compartido o de otra persona</Text>
			</Box>
		</Box>
	);
}
