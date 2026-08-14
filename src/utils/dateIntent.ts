const MONTHS = [
	'enero',
	'febrero',
	'marzo',
	'abril',
	'mayo',
	'junio',
	'julio',
	'agosto',
	'septiembre',
	'octubre',
	'noviembre',
	'diciembre',
] as const;

const EXPENSE_INTENT =
	/\b(gast|cuanto|resumen|promedio|total|mensual|anual|presupuesto)\b/;

const YEAR_PATTERNS = [
	/ano actual/,
	/ano en curso/,
	/ano en que estamos/,
	/en que ano estamos/,
	/que ano es/,
	/ano es/,
	/ano estamos/,
];

const DATE_PATTERNS = [
	/fecha de hoy/,
	/fecha actual/,
	/fecha en que estamos/,
	/que fecha es hoy/,
	/que dia es hoy/,
	/dia de hoy/,
	/dia actual/,
];

const MONTH_PATTERNS = [
	/que mes es/,
	/mes actual/,
	/mes en curso/,
	/en que mes estamos/,
];

function normalize(text: string): string {
	return text
		.toLowerCase()
		.replace(/[áàâä]/g, 'a')
		.replace(/[éèêë]/g, 'e')
		.replace(/[íìîï]/g, 'i')
		.replace(/[óòôö]/g, 'o')
		.replace(/[úùûü]/g, 'u')
		.replace(/[ñ]/g, 'n')
		.replace(/[¿?¡!.,;:]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export function answerDateQuestion(
	question: string,
	now: Date = new Date(),
): string | null {
	const q = normalize(question);
	if (q === '') return null;
	if (EXPENSE_INTENT.test(q)) return null;

	const month = MONTHS[now.getMonth()] ?? '';
	if (DATE_PATTERNS.some((pattern) => pattern.test(q))) {
		return `Hoy es ${now.getDate()} de ${month} de ${now.getFullYear()}.`;
	}
	if (YEAR_PATTERNS.some((pattern) => pattern.test(q))) {
		return `Estamos en ${now.getFullYear()}.`;
	}
	if (MONTH_PATTERNS.some((pattern) => pattern.test(q))) {
		return `Estamos en ${month} de ${now.getFullYear()}.`;
	}
	return null;
}
