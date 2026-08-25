import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { Item, Expense } from '../../types';
import {
	formatCurrency,
	MONTHS_SHORT_ES,
	formatYearWide,
} from '../../utils/format';
import { currentMonth } from '../../utils/summaries';
import { buildDetailRows, findRowContaining, type DetailRow } from '../../utils/detailRows';
import type { SearchResult } from '../../utils/filters';
import { SearchPalette } from './SearchPalette';

const NOT_MINE_COLOR = '#e0af68';
const YEAR_COLOR = '#ffd700';
const MONTH_HEADER_COLOR = '#ffffff';
const ITEM_HEADER_COLOR = '#c678dd';
const ROW_COLOR = '#c0caf5';
const MONTH_CELL_COLOR = '#9e9e9e';
const FIRST_INSTALLMENT_COLOR = '#9ece6a';
const DESC_WIDTH = 28;
const MONTH_WIDTH = 15;
const USE_INVERTED_SELECTION = false;

interface ItemDetailProps {
	item: Item;
	expenses: Expense[];
	allItems: Item[];
	allExpenses: Expense[];
	year: number;
	onYearChange: (year: number) => void;
	onSelectExpense: (expenseId: string) => void;
	onSearchResult: (result: SearchResult) => void;
	initialExpenseId?: string;
	onAddExpense: () => void;
	onBack: () => void;
}

export function ItemDetail({
	item,
	expenses,
	allItems,
	allExpenses,
	year,
	onYearChange,
	onSelectExpense,
	onSearchResult,
	initialExpenseId,
	onAddExpense,
	onBack,
}: ItemDetailProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchOpen, setSearchOpen] = useState(false);
	const rows: DetailRow[] = buildDetailRows(expenses, year);
	const currentIndex = Math.min(
		selectedIndex,
		Math.max(rows.length - 1, 0)
	);
	const now = currentMonth();
	const currentYear = Number(now.slice(0, 4));
	const currentMonthIndex = Number(now.slice(5, 7)) - 1;

	useEffect(() => {
		if (!initialExpenseId) {
			setSelectedIndex(0);
			return;
		}
		const idx = findRowContaining(rows, initialExpenseId);
		setSelectedIndex(idx >= 0 ? idx : 0);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [item.id, initialExpenseId]);

	useInput((_input, key) => {
		if (searchOpen) return;
		if (key.escape) {
			onBack();
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
		if (_input.toLowerCase() === 'a') {
			onAddExpense();
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
			onSelectExpense(rows[currentIndex].expenseIds[0]);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Text bold color="#00d4ff">
					{item.name}
				</Text>
				<Text color={'gray'}>{' [ '}</Text>
				<Text bold color={'#fff1a8'}>
					{String(formatYearWide(year)).split('').join('')}
				</Text>
				<Text color={'gray'}>{' ] '}</Text>
			</Box>

			{searchOpen ? (
				<SearchPalette
					items={allItems}
					expenses={allExpenses}
					onSelect={onSearchResult}
					onClose={() => setSearchOpen(false)}
				/>
			) : null}

			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Text bold color={ITEM_HEADER_COLOR}>
						{'  '}
						{'Descripción'.padEnd(DESC_WIDTH)}
					</Text>
					{MONTHS_SHORT_ES.map((month, mi) => {
						const isCurrent = year === currentYear && mi === currentMonthIndex;
						return (
							<Text
								key={month}
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
					{'─'.repeat(DESC_WIDTH + MONTH_WIDTH * 12)}
				</Text>
				{rows.map((row, i) => {
					const isSelected = i === currentIndex;
					const prefix = isSelected ? '❯ ' : '  ';
					const covered = row.coveredMonths;
					const isShared = row.isShared;
					const firstCuotaMonth =
						row.firstInstallmentMonth ?? -1;
					const description = `${row.description}${row.badge}`
						.padEnd(DESC_WIDTH)
						.slice(0, DESC_WIDTH);
					return (
						<Box key={row.key}>
							<Text
								color={ROW_COLOR}
								bold={isSelected}
								inverse={USE_INVERTED_SELECTION && isSelected}
							>
								{prefix}
								{description}
							</Text>
							{MONTHS_SHORT_ES.map((_, mi) => {
								const showAmount = covered.has(mi);
								const monthIsFirst = firstCuotaMonth === mi;
								const monthColor =
									showAmount && monthIsFirst
										? FIRST_INSTALLMENT_COLOR
										: showAmount && isShared
											? NOT_MINE_COLOR
											: MONTH_CELL_COLOR;
								return (
									<Text
										key={mi}
										color={monthColor}
										bold={isSelected}
										inverse={USE_INVERTED_SELECTION && isSelected}
										dimColor={false}
									>
										{showAmount && row.monthlyAmount > 0
											? formatCurrency(row.monthlyAmount).padStart(MONTH_WIDTH)
											: ' '.repeat(MONTH_WIDTH)}
									</Text>
								);
							})}
						</Box>
					);
				})}
				{rows.length === 0 ? (
					<Text dimColor>No hay gastos en {year}.</Text>
				) : null}
			</Box>

			<Box marginBottom={1}>
				<Text color="#88c0d0">
					{'  '}↑↓ Navegar · Enter Detalle · ←→ Año ·{' '}
				</Text>
				<Text color="#88c0d0">
					<Text bold>/</Text> Buscar · <Text bold>a</Text> Agregar Gasto ·{' '}
					<Text bold>Esc</Text> Volver
				</Text>
			</Box>

			<Box>
				<Text color={NOT_MINE_COLOR}>{'  '}■ </Text>
				<Text dimColor>gasto compartido o de otra persona</Text>
			</Box>
			<Box>
				<Text color={FIRST_INSTALLMENT_COLOR}>{'  '}■ </Text>
				<Text dimColor>primera cuota</Text>
			</Box>
		</Box>
	);
}
