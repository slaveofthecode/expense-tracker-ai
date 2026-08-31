import { Box, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Item, Expense, ItemType } from '../../types';
import { ITEM_TYPES } from '../../types';
import {
	formatCurrency,
	formatMonth,
} from '../../utils/format';
import {
	calcMonthlySummaries,
	currentMonth,
	shiftMonth,
} from '../../utils/summaries';
import type { SearchResult } from '../../utils/filters';
import { Confirm } from './Confirm';
import { SearchPalette } from './SearchPalette';

const NOT_MINE_COLOR = '#e0af68';
const TITLE_COLOR = '#00d4ff';
const PERIOD_COLOR = '#fff1a8';
const ITEM_HEADER_COLOR = '#c678dd';
const ITEM_NAME_COLOR = '#c0caf5';
const AMOUNT_COLOR = '#9e9e9e';
const USE_INVERTED_SELECTION = false;
const ITEM_WIDTH = 24;
const AMOUNT_WIDTH = 15;
const TYPE_FILTERS: (ItemType | 'all')[] = ['all', ...ITEM_TYPES];

interface DashboardProps {
	items: Item[];
	expenses: Expense[];
	month: string;
	onMonthChange: (month: string) => void;
	onSelectItem: (itemId: string) => void;
	onSearchResult: (result: SearchResult) => void;
	onEditItem: (itemId: string) => void;
	onDeleteItem: (itemId: string) => void;
	onAddExpense: () => void;
	onOpenCharts: () => void;
	onOpenChat: () => void;
	onQuit: () => void;
}

interface MonthRow {
	itemId: string;
	name: string;
	total: number;
	myShare: number;
}

export function Dashboard({
	items,
	expenses,
	month,
	onMonthChange,
	onSelectItem,
	onSearchResult,
	onEditItem,
	onDeleteItem,
	onAddExpense,
	onOpenCharts,
	onOpenChat,
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
	const summaries = calcMonthlySummaries(visibleItems, expenses, month);
	const itemById = new Map(items.map((item) => [item.id, item]));
	const rows: MonthRow[] = summaries
		.filter((s) => s.totalAmount > 0)
		.map((s) => ({
			itemId: s.itemId,
			name: itemById.get(s.itemId)?.name ?? '?',
			total: s.totalAmount,
			myShare: s.myShare,
		}))
		.sort((a, b) => a.name.localeCompare(b.name));
	const currentIndex = Math.min(
		selectedIndex,
		Math.max(rows.length - 1, 0)
	);
	const periodLabel = formatMonth(month).replace(/^./, (c) =>
		c.toUpperCase()
	);
	const isCurrentPeriod = month === currentMonth();

	useInput((_input, key) => {
		if (searchOpen || confirmingDelete) return;
		if (key.escape || (key.ctrl && _input.toLowerCase() === 'c')) {
			onQuit();
			return;
		}
		if (key.leftArrow) {
			onMonthChange(shiftMonth(month, -1));
			return;
		}
		if (key.rightArrow) {
			onMonthChange(shiftMonth(month, 1));
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
		// Charts disabled temporarily — to be revisited with future improvements.
		// if (_input.toLowerCase() === 'g') {
		// 	onOpenCharts();
		// 	return;
		// }
		if (_input.toLowerCase() === 'c') {
			onOpenChat();
			return;
		}
		if (rows.length === 0) return;
		if (key.upArrow) {
			setSelectedIndex((i) => (i > 0 ? i - 1 : rows.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((i) => (i < rows.length - 1 ? i + 1 : 0));
		}
		if (key.return) {
			onSelectItem(rows[currentIndex].itemId);
		}
		if (_input.toLowerCase() === 'e') {
			onEditItem(rows[currentIndex].itemId);
		}
		if (_input.toLowerCase() === 'd') {
			setConfirmingDelete(true);
		}
	});

	if (confirmingDelete) {
		const row = rows[currentIndex];
		const item = itemById.get(row.itemId);
		if (!item) return null;
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

	const monthTotal = rows.reduce((acc, r) => acc + r.total, 0);
	const monthMyShare = rows.reduce((acc, r) => acc + r.myShare, 0);

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Text bold color={TITLE_COLOR}>
					{'EXPENSE TRACKER AI'}
				</Text>
				<Text color={'gray'}>{' [ ' }</Text>
				<Text bold color={isCurrentPeriod ? '#9ece6a' : PERIOD_COLOR}>
					{periodLabel}
					{isCurrentPeriod ? ' ●' : ''}
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

			{rows.length > 0 ? (
				<Box flexDirection="column">
					<Box>
						<Text bold color={ITEM_HEADER_COLOR}>
							{'  '}
							{'Concepto'.padEnd(ITEM_WIDTH)}
						</Text>
						<Text bold color={ITEM_HEADER_COLOR}>
							{'Total'.padStart(AMOUNT_WIDTH)}
						</Text>
						<Text bold color={ITEM_HEADER_COLOR}>
							{'Mi parte'.padStart(AMOUNT_WIDTH)}
						</Text>
					</Box>
					<Text color="#333" dimColor>
						{'  '}
						{'─'.repeat(ITEM_WIDTH + AMOUNT_WIDTH * 2)}
					</Text>
					{rows.map((row, i) => {
						const isSelected = i === currentIndex;
						const prefix = isSelected ? '❯ ' : '  ';
						const isShared = row.myShare < row.total;
						return (
							<Box key={row.itemId}>
								<Text
									color={ITEM_NAME_COLOR}
									bold={isSelected}
									inverse={USE_INVERTED_SELECTION && isSelected}
								>
									{prefix}
									{row.name.slice(0, ITEM_WIDTH - 2).padEnd(ITEM_WIDTH)}
								</Text>
								<Text
									color={isShared ? NOT_MINE_COLOR : AMOUNT_COLOR}
									bold={isSelected}
									inverse={USE_INVERTED_SELECTION && isSelected}
									dimColor={false}
								>
									{formatCurrency(row.total).padStart(AMOUNT_WIDTH)}
								</Text>
								<Text
									color={AMOUNT_COLOR}
									bold={isSelected}
									inverse={USE_INVERTED_SELECTION && isSelected}
									dimColor={false}
								>
									{formatCurrency(row.myShare).padStart(AMOUNT_WIDTH)}
								</Text>
							</Box>
						);
					})}
					<Text color="#333" dimColor>
						{'  '}
						{'─'.repeat(ITEM_WIDTH + AMOUNT_WIDTH * 2)}
					</Text>
					<Box>
						<Text color={AMOUNT_COLOR}>
							{'  '}
							{'Total del mes'.padEnd(ITEM_WIDTH)}
						</Text>
						<Text
							color={monthMyShare < monthTotal ? NOT_MINE_COLOR : AMOUNT_COLOR}
						>
							{formatCurrency(monthTotal).padStart(AMOUNT_WIDTH)}
						</Text>
						<Text color={AMOUNT_COLOR}>
							{formatCurrency(monthMyShare).padStart(AMOUNT_WIDTH)}
						</Text>
					</Box>
				</Box>
			) : items.length === 0 ? (
				<Text dimColor>
					{'  '}No hay gastos todavía. Presiona "a" para cargar el primero: el grupo se crea solo.
				</Text>
			) : visibleItems.length === 0 ? (
				<Text dimColor>
					{'  '}No hay grupos que coincidan con el filtro de tipo.
				</Text>
			) : (
				<Box flexDirection="column" gap={1}>
					<Text dimColor>
						{'  '}{`No hay registros en ${periodLabel.toLowerCase()}.`}
					</Text>
					<Text dimColor>
						{'  '}Usá ← → para cambiar de mes o presioná "a" para agregar un gasto.
					</Text>
				</Box>
			)}

		<Box marginTop={1} marginBottom={1}>
			<Text color="#88c0d0">
				{'  '}↑↓ Navegar · Enter Seleccionar · ←→ Mes ·{' '}
			</Text>
			<Text color="#88c0d0">
				<Text bold>/</Text> Buscar · <Text bold>a</Text> Agregar Gasto
				{rows.length > 0 ? (
					<>
						{' · '}<Text bold>e</Text> Editar · <Text bold>d</Text> Eliminar
					</>
				) : null}
				{' · '}<Text bold dimColor>g</Text>{' '}
				<Text dimColor>Gráficos</Text> ·{' '}
				<Text bold>c</Text> Chat · <Text bold>Esc</Text> Salir
			</Text>
		</Box>

			<Box flexDirection="column">
				<Box>
					<Text color={NOT_MINE_COLOR}>{'  '}■ </Text>
					<Text dimColor>gasto compartido o de otra persona</Text>
				</Box>
				<Box>
					<Text color="#9ece6a">{'  '}● </Text>
					<Text dimColor>mes actual</Text>
				</Box>
			</Box>
		</Box>
	);
}
