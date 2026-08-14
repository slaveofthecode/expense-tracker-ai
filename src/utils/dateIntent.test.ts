import { describe, expect, test } from 'bun:test';
import { answerDateQuestion } from './dateIntent';

const NOW = new Date(2026, 7, 14, 12, 0, 0);

describe('answerDateQuestion', () => {
	test('answers the current year', () => {
		expect(answerDateQuestion('¿Cuál es el año actual?', NOW)).toBe(
			'Estamos en 2026.',
		);
		expect(answerDateQuestion('¿En qué año estamos?', NOW)).toBe(
			'Estamos en 2026.',
		);
		expect(answerDateQuestion('¿Qué año es?', NOW)).toBe('Estamos en 2026.');
		expect(answerDateQuestion('año actual', NOW)).toBe('Estamos en 2026.');
	});

	test('answers today’s date', () => {
		expect(answerDateQuestion('¿Qué fecha es hoy?', NOW)).toBe(
			'Hoy es 14 de agosto de 2026.',
		);
		expect(answerDateQuestion('fecha actual', NOW)).toBe(
			'Hoy es 14 de agosto de 2026.',
		);
		expect(answerDateQuestion('¿qué día de hoy?', NOW)).toBe(
			'Hoy es 14 de agosto de 2026.',
		);
	});

	test('answers the current month', () => {
		expect(answerDateQuestion('¿Qué mes es?', NOW)).toBe(
			'Estamos en agosto de 2026.',
		);
		expect(answerDateQuestion('mes actual', NOW)).toBe(
			'Estamos en agosto de 2026.',
		);
	});

	test('ignores expense-related questions', () => {
		expect(answerDateQuestion('¿Cuánto gasté en el año actual?', NOW)).toBeNull();
		expect(answerDateQuestion('¿Cuál es mi gasto promedio este año?', NOW)).toBeNull();
		expect(answerDateQuestion('¿qué mes del año gasto más?', NOW)).toBeNull();
		expect(answerDateQuestion('resumen del mes actual', NOW)).toBeNull();
	});

	test('returns null for unrelated questions', () => {
		expect(answerDateQuestion('¿Cuánto gasté en marzo?', NOW)).toBeNull();
		expect(answerDateQuestion('¿Qué es una factura?', NOW)).toBeNull();
		expect(answerDateQuestion('hola', NOW)).toBeNull();
		expect(answerDateQuestion('', NOW)).toBeNull();
	});
});
