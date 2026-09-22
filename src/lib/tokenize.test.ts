import { describe, expect, test } from 'bun:test';
import { buildLines, createLyricCard, tokenizeLine } from './tokenize';

describe('tokenizeLine', () => {
	test('文字ごとに安定したIDを持つトークンへ分割する', () => {
		const tokens = tokenizeLine('line-0', 'あいう');
		expect(tokens.map((t) => t.text)).toEqual(['あ', 'い', 'う']);
		expect(tokens.map((t) => t.id)).toEqual(['line-0:0', 'line-0:1', 'line-0:2']);
		expect(tokens.every((t) => t.lineId === 'line-0')).toBe(true);
	});

	test('空行はトークン0件の行になる', () => {
		expect(tokenizeLine('line-1', '')).toEqual([]);
	});

	test('サロゲートペア文字も1トークンとして扱う', () => {
		const tokens = tokenizeLine('line-2', '😀あ');
		expect(tokens.map((t) => t.text)).toEqual(['😀', 'あ']);
	});
});

describe('buildLines', () => {
	test('行配列からLine[]を構築し、行IDの一意性を保つ', () => {
		const lines = buildLines(['あ', '', 'いう']);
		expect(lines).toHaveLength(3);
		expect(lines[1].tokens).toEqual([]);
		expect(lines[2].tokens.map((t) => t.text)).toEqual(['い', 'う']);
		const ids = new Set(lines.map((l) => l.id));
		expect(ids.size).toBe(3);
	});
});

describe('createLyricCard', () => {
	test('取得結果からLyricCardを組み立てる', () => {
		const card = createLyricCard({
			title: 'テスト曲',
			artist: 'テスト歌手',
			sourceUrl: 'https://petitlyrics.com/lyrics/1',
			lines: ['一行目', '二行目']
		});
		expect(card.title).toBe('テスト曲');
		expect(card.lines).toHaveLength(2);
		expect(card.annotations).toEqual([]);
		expect(card.id).toBeTruthy();
		expect(card.createdAt).toBe(card.updatedAt);
	});
});
