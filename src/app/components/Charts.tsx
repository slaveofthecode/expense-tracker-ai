import { Box, Text, useInput } from 'ink';
import { useMemo, useState, type ReactNode } from 'react';
import type { Expense, Item, ItemType } from '../../types';
import {
	formatCurrency,
	formatYearWide,
	MONTHS_SHORT_ES,
} from '../../utils/format';
import {
	computeCharts,
	scaleBlocksMin,
	distributeSegments,
	type ChartsData,
} from '../../utils/charts';
import { currentMonth } from '../../utils/summaries';

const ACCENT_COLOR = '#00d4ff';
const TEXT_COLOR = '#c0caf5';
const MUTED_COLOR = '#9e9e9e';
const SHARED_COLOR = '#e0af68';
const BAR_COLOR = '#c0caf5';
const BAR_EMPTY_COLOR = '#4b5263';
const HINT_COLOR = '#88c0d0';
const CURRENT_MONTH_COLOR = '#ffffff';
const YEAR_COLOR = '#fff1a8';

const TYPE_COLORS: Record<ItemType, string> = {
	credit_card: '#ff5555',
	loan: '#ffd700',
	recurring: '#00d4ff',
	insurance: '#9ece6a',
	other: '#c678dd',
};

const CHART_TITLES = [
	'Gasto mensual',
	'Por tipo de ítem',
	'Top ítems del año',
	'Distribución por tipo',
];

interface ChartsProps {
	items: Item[];
	expenses: Expense[];
	year: number;
	onYearChange: (year: number) => void;
	onBack: () => void;
}

export function Charts({
	items,
	expenses,
	year,
	onYearChange,
	onBack,
}: ChartsProps) {
	const [chartIndex, setChartIndex] = useState(0);
	const data = useMemo(
		() => computeCharts(items, expenses, year),
		[items, expenses, year],
	);
	const now = currentMonth();
	const currentYear = Number(now.slice(0, 4));
	const currentMonthIndex = Number(now.slice(5, 7)) - 1;
	const width = Math.max(60, (process.stdout.columns ?? 100) - 6);

	useInput((_input, key) => {
		if (key.escape || (key.ctrl && _input.toLowerCase() === 'c')) {
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
		const n = Number(_input);
		if (Number.isInteger(n) && n >= 1 && n <= CHART_TITLES.length) {
			setChartIndex(n - 1);
		}
	});

	return (
		<Box flexDirection="column" padding={1}>
			<Box marginBottom={1} flexDirection="row" gap={2} marginLeft={2}>
				<Text bold color={ACCENT_COLOR}>
					{'EXPENSE TRACKER AI · GRÁFICOS'}
				</Text>
				<Text color={'gray'}>{' [ '}</Text>
				<Text bold color={YEAR_COLOR}>
					{String(formatYearWide(year)).split('').join('')}
				</Text>
				<Text color={'gray'}>{' ] '}</Text>
			</Box>

			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={ACCENT_COLOR}
				padding={1}
				marginBottom={1}
			>
				<Box marginBottom={1}>
					<Text bold color={ACCENT_COLOR}>
						{CHART_TITLES[chartIndex]}
					</Text>
					<Text color={MUTED_COLOR}>
						{`  ·  ${chartIndex + 1}/${CHART_TITLES.length}`}
					</Text>
				</Box>
				{ChartBody[chartIndex]({ data, width, year, currentYear, currentMonthIndex })}
			</Box>

			<Box>
				<Text color={HINT_COLOR}>
					{'  '}1-{CHART_TITLES.length} Gráfico · ←→ Año · Esc Volver
				</Text>
			</Box>
		</Box>
	);
}

type ChartBodyProps = {
	data: ChartsData;
	width: number;
	year: number;
	currentYear: number;
	currentMonthIndex: number;
};

const ChartBody: ((props: ChartBodyProps) => ReactNode)[] = [
	MonthlyChart,
	ByTypeChart,
	TopItemsChart,
	DistributionChart,
];

function MonthlyChart({ data, width, year, currentYear, currentMonthIndex }: ChartBodyProps) {
	const labelWidth = 4;
	const barWidth = Math.max(10, width - labelWidth - 30);
	const max = Math.max(...data.monthly.map((m) => m.total), 1);
	const hasData = data.monthly.some((m) => m.total > 0);

	if (!hasData) {
		return <Text dimColor>Sin datos para este año.</Text>;
	}

	return (
		<Box flexDirection="column">
			{data.monthly.map((m, i) => {
				const isCurrent = currentYear === year && i === currentMonthIndex;
				const isShared = m.myShare > 0 && m.myShare < m.total;
				const totalBlocks = scaleBlocksMin(m.total, max, barWidth);
				const myBlocks = isShared ? scaleBlocksMin(m.myShare, max, barWidth) : 0;
				return (
					<Box key={i}>
						<Text
							bold={isCurrent}
							color={isCurrent ? CURRENT_MONTH_COLOR : MUTED_COLOR}
						>
							{MONTHS_SHORT_ES[i].padEnd(labelWidth)}
						</Text>
						{myBlocks > 0 ? (
							<Text color={SHARED_COLOR}>{'█'.repeat(myBlocks)}</Text>
						) : null}
						{totalBlocks - myBlocks > 0 ? (
							<Text color={BAR_COLOR}>{'█'.repeat(totalBlocks - myBlocks)}</Text>
						) : null}
						{barWidth - totalBlocks > 0 ? (
							<Text color={BAR_EMPTY_COLOR}>
								{'░'.repeat(barWidth - totalBlocks)}
							</Text>
						) : null}
						<Text bold={isCurrent} color={isCurrent ? CURRENT_MONTH_COLOR : TEXT_COLOR}>
							{`  ${formatCurrency(m.total)}`}
						</Text>
						{isShared ? (
							<Text color={SHARED_COLOR}>{`  (tu parte ${formatCurrency(m.myShare)})`}</Text>
						) : null}
					</Box>
				);
			})}
		</Box>
	);
}

function ByTypeChart({ data, width }: ChartBodyProps) {
	const rows = data.byType;
	const max = Math.max(...rows.map((r) => r.value), 1);
	const grand = rows.reduce((acc, r) => acc + r.value, 0);
	const labelWidth = 20;
	const barWidth = Math.max(10, width - labelWidth - 20);
	return (
		<BarList
			rows={rows.map((r) => ({
				key: r.type,
				label: r.label,
				blocks: scaleBlocksMin(r.value, max, barWidth),
				barColor: TYPE_COLORS[r.type],
				annotation: (
					<>
						<Text color={TEXT_COLOR}>{`  ${formatCurrency(r.value)}`}</Text>
						<Text color={MUTED_COLOR}>{`  ${Math.round((r.value / grand) * 100)}%`}</Text>
					</>
				),
			}))}
			barWidth={barWidth}
			labelWidth={labelWidth}
			empty={rows.length === 0}
		/>
	);
}

function TopItemsChart({ data, width }: ChartBodyProps) {
	const rows = data.top;
	const max = Math.max(...rows.map((r) => r.value), 1);
	const grand = rows.reduce((acc, r) => acc + r.value, 0);
	const labelWidth = 26;
	const barWidth = Math.max(10, width - labelWidth - 20);
	return (
		<BarList
			rows={rows.map((r, i) => ({
				key: r.label,
				label: `${i + 1}. ${r.label}`,
				blocks: scaleBlocksMin(r.value, max, barWidth),
				barColor: BAR_COLOR,
				annotation: (
					<>
						<Text color={TEXT_COLOR}>{`  ${formatCurrency(r.value)}`}</Text>
						<Text color={MUTED_COLOR}>{`  ${Math.round((r.value / grand) * 100)}%`}</Text>
					</>
				),
			}))}
			barWidth={barWidth}
			labelWidth={labelWidth}
			empty={rows.length === 0}
		/>
	);
}

function DistributionChart({ data, width }: ChartBodyProps) {
	const rows = data.byType;
	const grand = rows.reduce((acc, r) => acc + r.value, 0);
	const barWidth = Math.max(10, width - 4);
	const segments = distributeSegments(
		rows.map((r) => r.value),
		barWidth,
	);
	return (
		<Box flexDirection="column">
			{rows.length === 0 ? (
				<Text dimColor>Sin datos para este año.</Text>
			) : (
				<>
					<Box marginBottom={1}>
						<Text color={TEXT_COLOR}>{`Total  ${formatCurrency(grand)}`}</Text>
					</Box>
					<Box>
						{rows.map((r, i) => (
							<Text key={r.type} color={TYPE_COLORS[r.type]}>
								{'█'.repeat(segments[i])}
							</Text>
						))}
					</Box>
					<Box marginTop={1} flexDirection="column">
						{rows.map((r) => (
							<Box key={r.type}>
								<Text color={TYPE_COLORS[r.type]}>{'■ '}</Text>
								<Text color={TEXT_COLOR}>{r.label}</Text>
								<Text color={MUTED_COLOR}>{`  ${formatCurrency(r.value)}`}</Text>
								<Text color={MUTED_COLOR}>{`  ${Math.round((r.value / grand) * 100)}%`}</Text>
							</Box>
						))}
					</Box>
				</>
			)}
		</Box>
	);
}

function BarList({
	rows,
	barWidth,
	labelWidth,
	empty,
}: {
	rows: { key: string; label: string; blocks: number; barColor: string; annotation: ReactNode }[];
	barWidth: number;
	labelWidth: number;
	empty: boolean;
}) {
	if (empty) return <Text dimColor>Sin datos para este año.</Text>;
	return (
		<Box flexDirection="column">
			{rows.map((row) => (
				<Box key={row.key}>
					<Text color={TEXT_COLOR}>{row.label.padEnd(labelWidth)}</Text>
					<Text color={row.barColor}>{'█'.repeat(row.blocks)}</Text>
					<Text color={BAR_EMPTY_COLOR}>
						{'░'.repeat(Math.max(0, barWidth - row.blocks))}
					</Text>
					{row.annotation}
				</Box>
			))}
		</Box>
	);
}
