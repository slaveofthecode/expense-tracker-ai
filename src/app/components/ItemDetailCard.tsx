import { Box, Text, useInput } from 'ink';
import { useEffect, useState } from 'react';
import type { Item, Expense } from '../../types';
import { formatCurrency, formatYearWide } from '../../utils/format';
import { currentMonth, monthOf } from '../../utils/summaries';
import type { SearchResult } from '../../utils/filters';
import { SearchPalette } from './SearchPalette';

const SHARED_COLOR = '#e0af68';
const YEAR_COLOR = '#ffd700';
const ITEM_HEADER_COLOR = '#c678dd';
const ROW_COLOR = '#c0caf5';
const FIRST_INSTALLMENT_COLOR = '#9ece6a';
const USE_INVERTED_SELECTION = false;

interface ItemDetailCardProps {
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

export function ItemDetailCard({
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
}: ItemDetailCardProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [searchOpen, setSearchOpen] = useState(false);
	const yearExpenses = expenses.filter((e) => {
		const startYear = Number(monthOf(e.date).slice(0, 4));
		const startMonth = Number(monthOf(e.date).slice(5, 7)) - 1;
		const window = e.installments?.total ?? 1;
		const endAbsolute = startMonth + window - 1;
		const endYear = startYear + Math.floor(endAbsolute / 12);
		return year >= startYear && year <= endYear;
	});
	const currentIndex = Math.min(
		selectedIndex,
		Math.max(yearExpenses.length - 1, 0)
	);
	const now = currentMonth();
	const currentYear = Number(now.slice(0, 4));
	const currentMonthIndex = Number(now.slice(5, 7)) - 1;

	useEffect(() => {
		if (!initialExpenseId) {
			setSelectedIndex(0);
			return;
		}
		const idx = yearExpenses.findIndex((e) => e.id === initialExpenseId);
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
		if (yearExpenses.length === 0) return;
		if (key.upArrow) {
			setSelectedIndex((i) => (i > 0 ? i - 1 : yearExpenses.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((i) => (i < yearExpenses.length - 1 ? i + 1 : 0));
		}
		if (key.return) {
			onSelectExpense(yearExpenses[currentIndex].id);
		}
		if (_input.toLowerCase() === 'a') {
			onAddExpense();
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

			{yearExpenses.length === 0 ? (
				<Box marginBottom={1}>
					<Text dimColor>No hay gastos en {year}.</Text>
				</Box>
			) : (
				<Box flexDirection="column" marginBottom={1}>
					{yearExpenses.map((e, i) => {
						const isSelected = i === currentIndex;
						const prefix = isSelected ? '❯ ' : '  ';
						const startYear = Number(monthOf(e.date).slice(0, 4));
						const startMonth = Number(monthOf(e.date).slice(5, 7)) - 1;
						const window = e.installments?.total ?? 1;
						const monthlyAmount =
							window > 1 ? Math.round(e.amount / window) : e.amount;
						const isShared = e.ownership.percentage < 100;
						const isFirstInstallment =
							window > 1 &&
							startYear === Number(currentMonth().slice(0, 4)) &&
							startMonth === Number(currentMonth().slice(5, 7)) - 1;
						const badge = e.installments
							? ` en ${e.installments.total} ctas`
							: '';
						const description = `${e.description}${badge}`;
						const textColor = isFirstInstallment
							? FIRST_INSTALLMENT_COLOR
							: isShared
								? SHARED_COLOR
								: ROW_COLOR;

						return (
							<Box key={e.id} marginBottom={1} flexDirection="column">
								<Box>
									<Text
										color={textColor}
										bold={isSelected}
										inverse={USE_INVERTED_SELECTION && isSelected}
									>
										{prefix}
										{description}
									</Text>
								</Box>
								<Box paddingLeft={2}>
									<Text dimColor>Monto: {formatCurrency(monthlyAmount)}</Text>
									{e.ownership.percentage < 100 && (
										<Text color={SHARED_COLOR}>
											{' '}
											({e.ownership.percentage}%
											{e.ownership.person ? `, ${e.ownership.person}` : ''})
										</Text>
									)}
								</Box>
								{window > 1 && (
									<Box paddingLeft={2}>
										<Text dimColor>
											{window} cuotas (inicio: {monthOf(e.date)})
										</Text>
									</Box>
								)}
							</Box>
						);
					})}
				</Box>
			)}

			<Box marginBottom={1}>
				<Text color="#88c0d0">
					{'  '}↑↓ Navegar · Enter Detalle · ←→ Año ·{' '}
				</Text>
				<Text color="#88c0d0">
					<Text bold>a</Text> Agregar Gasto · <Text bold>Esc</Text> Volver
				</Text>
			</Box>

			<Box>
				<Text color={SHARED_COLOR}>{'  '}■ </Text>
				<Text dimColor>gasto compartido o de otra persona</Text>
			</Box>
		</Box>
	);
}
