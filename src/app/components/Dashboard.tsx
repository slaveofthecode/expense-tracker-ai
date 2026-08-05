import { Box, Newline, Text, useInput } from 'ink';
import { useState } from 'react';
import type { Item, Expense } from '../../types';
import {
	formatCurrency,
	formatYearWide,
	MONTHS_SHORT_ES,
} from '../../utils/format';
import { calcYearlySummaries, currentMonth } from '../../utils/summaries';
import { Confirm } from './Confirm';

const NOT_MINE_COLOR = '#e0af68';
const YEAR_COLOR = '#ffd700';
const MONTH_HEADER_COLOR = '#7aa2f7';
const ITEM_HEADER_COLOR = '#c678dd';
const ITEM_NAME_COLOR = '#c0caf5';
// color for selected row (similar family to ITEM_NAME_COLOR but distinct)
const SELECT_ROW_COLOR = '#89b4fa';
const SELECT_ITEM_COLOR = '#7fb9ff'; // item slightly brighter than row
const ITEM_WIDTH = 24;
const MONTH_WIDTH = 15;
// toggle inverted background selection preview (true = inverted background, false = colored text)
const USE_INVERTED_SELECTION = false;
// Make current month white; other months white@75% approximated as #bfbfbf
const MONTH_CURRENT_HIGHLIGHT = '#ffffff';
const MONTH_DEFAULT_FAINT = '#bfbfbf';

interface DashboardProps {
	items: Item[];
	expenses: Expense[];
	year: number;
	onYearChange: (year: number) => void;
	onSelectItem: (itemId: string) => void;
	onAddItem: () => void;
	onEditItem: (itemId: string) => void;
	onDeleteItem: (itemId: string) => void;
	onAddExpense: () => void;
	onQuit: () => void;
}

export function Dashboard({
	items,
	expenses,
	year,
	onYearChange,
	onSelectItem,
	onAddItem,
	onEditItem,
	onDeleteItem,
	onAddExpense,
	onQuit,
}: DashboardProps) {
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [confirmingDelete, setConfirmingDelete] = useState(false);
	const summaries = calcYearlySummaries(items, expenses, year);
	const now = currentMonth();
	const currentYear = Number(now.slice(0, 4));
	const currentMonthIndex = Number(now.slice(5, 7)) - 1;

	useInput((_input, key) => {
		if (confirmingDelete) return;
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
		if (items.length === 0) return;
		if (key.upArrow) {
			setSelectedIndex((i) => (i > 0 ? i - 1 : items.length - 1));
		}
		if (key.downArrow) {
			setSelectedIndex((i) => (i < items.length - 1 ? i + 1 : 0));
		}
		if (key.return) {
			onSelectItem(items[selectedIndex].id);
		}
		if (_input.toLowerCase() === 'a') {
			onAddExpense();
		}
		if (_input.toLowerCase() === 'i') {
			onAddItem();
		}
		if (_input.toLowerCase() === 'e') {
			onEditItem(items[selectedIndex].id);
		}
		if (_input.toLowerCase() === 'd') {
			setConfirmingDelete(true);
		}
	});

	if (confirmingDelete) {
		const item = items[selectedIndex];
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

			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Text bold color={ITEM_HEADER_COLOR}>
						{'  '}
						{'Concepto'.padEnd(ITEM_WIDTH)}
					</Text>
					{MONTHS_SHORT_ES.map((month, mi) => {
						const isCurrent = year === currentYear && mi === currentMonthIndex;
						const headerColor = isCurrent ? MONTH_CURRENT_HIGHLIGHT : MONTH_DEFAULT_FAINT;
						return (
							<Text
								key={`header-${mi}`}
								bold
								color={headerColor}
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
					const item = items.find((it) => it.id === s.itemId);
					if (!item) return null;
					const isSelected = i === selectedIndex;
					const prefix = isSelected ? '❯ ' : '  ';

					// Determine whether this item should be treated as an aggregator
					const itemExpenses = expenses.filter((e) => e.itemId === item.id);
					const isAggregator = item.type === 'credit_card' || item.type === 'loan';

					return (
						<Box key={item.id}>
							<Text
								color={isSelected ? SELECT_ITEM_COLOR : ITEM_NAME_COLOR}
								bold={isSelected}
								inverse={USE_INVERTED_SELECTION && isSelected}
							>
								{prefix}
								{item.name.slice(0, ITEM_WIDTH - 2).padEnd(ITEM_WIDTH)}
							</Text>
							{s.months.map((m, mi) => {
								const isShared = m.total > 0 && m.myShare < m.total;
								const isCurrentMonth =
									year === currentYear && mi === currentMonthIndex;
								// month cell color priority: NOT_MINE_COLOR only for non-aggregators (unique items) > current month highlight > selection color
								let monthColor: string | undefined = undefined;
								if (!isAggregator && isShared) {
									// only show shared indicator for items that don't act as aggregators
									monthColor = NOT_MINE_COLOR;
								} else if (isCurrentMonth) {
									monthColor = MONTH_CURRENT_HIGHLIGHT;
								} else if (isSelected) {
									monthColor = SELECT_ROW_COLOR;
								} else {
									monthColor = MONTH_DEFAULT_FAINT;
								}
								// do not dim month cells to keep them visible; special colors take precedence
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
				) : null}
			</Box>

			<Box marginBottom={1}>
				<Text color="#88c0d0">
					{'  '}↑↓ Navegar · Enter Seleccionar · ←→ Año ·{' '}
				</Text>
				<Text color="#88c0d0">
					<Text bold>a</Text> Agregar Gasto · <Text bold>i</Text> Agregar Ítem ·{' '}
					<Text bold>e</Text> Editar · <Text bold>d</Text> Eliminar ·{' '}
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
