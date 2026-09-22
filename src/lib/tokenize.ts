import type { Line, LyricCard, Token } from './types';

export function tokenizeLine(lineId: string, text: string): Token[] {
	return Array.from(text).map((ch, index) => ({
		id: `${lineId}:${index}`,
		lineId,
		text: ch,
		index
	}));
}

export function buildLines(rawLines: string[], idPrefix = 'line'): Line[] {
	return rawLines.map((text, i) => {
		const lineId = `${idPrefix}-${i}`;
		return { id: lineId, tokens: tokenizeLine(lineId, text) };
	});
}

export interface CreateLyricCardInput {
	title: string;
	artist: string;
	sourceUrl: string;
	lines: string[];
}

export function createLyricCard(input: CreateLyricCardInput): LyricCard {
	const now = new Date().toISOString();
	return {
		id: crypto.randomUUID(),
		title: input.title,
		artist: input.artist,
		sourceUrl: input.sourceUrl,
		lines: buildLines(input.lines),
		annotations: [],
		createdAt: now,
		updatedAt: now
	};
}

export function duplicateLyricCard(card: LyricCard): LyricCard {
	const now = new Date().toISOString();
	return {
		...structuredClone(card),
		id: crypto.randomUUID(),
		title: `${card.title} のコピー`,
		createdAt: now,
		updatedAt: now
	};
}
