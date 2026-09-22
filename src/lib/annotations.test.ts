import { describe, expect, test } from 'bun:test';
import {
	buildAllLegendEntries,
	buildLineRenderItems,
	dynamicsStartingAt,
	findAccent,
	findExactDynamics,
	findExactRuby,
	hasBreathAfter,
	hasFalsetto,
	hasStaccato,
	hasStrikethrough,
	removeAccent,
	removeDynamics,
	setRubyEnabled,
	slurPositionOf,
	toggleBreath,
	toggleFalsetto,
	toggleSlur,
	toggleStaccato,
	toggleStrikethrough,
	upsertAccent,
	upsertDynamics,
	upsertRuby
} from './annotations';
import { buildLines } from './tokenize';
import type { Annotation } from './types';

describe('ruby', () => {
	test('追加すると有効な状態で登録される', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		let annotations: Annotation[] = [];
		annotations = upsertRuby(annotations, [ids[0], ids[1]], 'てすと');
		const ruby = findExactRuby(annotations, [ids[0], ids[1]]);
		expect(ruby?.reading).toBe('てすと');
		expect(ruby?.enabled).toBe(true);
	});

	test('同じ範囲へ再度追加すると上書きされる(重複しない)', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		let annotations: Annotation[] = [];
		annotations = upsertRuby(annotations, [ids[0], ids[1]], 'いち');
		annotations = upsertRuby(annotations, [ids[0], ids[1]], 'に');
		const rubies = annotations.filter((a) => a.kind === 'ruby');
		expect(rubies).toHaveLength(1);
		expect(findExactRuby(annotations, [ids[0], ids[1]])?.reading).toBe('に');
	});

	test('無効化してもレコードは削除されない(再有効化できる)', () => {
		const line = buildLines(['あ'])[0];
		const id = line.tokens[0].id;
		let annotations: Annotation[] = upsertRuby([], [id], 'よみ');
		const rubyId = findExactRuby(annotations, [id])!.id;
		annotations = setRubyEnabled(annotations, rubyId, false);
		expect(findExactRuby(annotations, [id])?.enabled).toBe(false);
		annotations = setRubyEnabled(annotations, rubyId, true);
		expect(findExactRuby(annotations, [id])?.enabled).toBe(true);
	});
});

describe('accent', () => {
	test('追加・上書き・削除できる', () => {
		const line = buildLines(['あ'])[0];
		const id = line.tokens[0].id;
		let annotations: Annotation[] = upsertAccent([], id, 'rise');
		expect(findAccent(annotations, id)?.type).toBe('rise');
		annotations = upsertAccent(annotations, id, 'fall');
		expect(annotations.filter((a) => a.kind === 'accent')).toHaveLength(1);
		expect(findAccent(annotations, id)?.type).toBe('fall');
		annotations = removeAccent(annotations, id);
		expect(findAccent(annotations, id)).toBeUndefined();
	});
});

describe('breath / staccato (トグル系)', () => {
	test('breathはトグルで追加・削除される', () => {
		const line = buildLines(['あい'])[0];
		const id = line.tokens[0].id;
		let annotations: Annotation[] = toggleBreath([], id);
		expect(hasBreathAfter(annotations, id)).toBe(true);
		annotations = toggleBreath(annotations, id);
		expect(hasBreathAfter(annotations, id)).toBe(false);
	});

	test('staccatoはトグルで追加・削除される', () => {
		const line = buildLines(['あ'])[0];
		const id = line.tokens[0].id;
		let annotations: Annotation[] = toggleStaccato([], id);
		expect(hasStaccato(annotations, id)).toBe(true);
		annotations = toggleStaccato(annotations, id);
		expect(hasStaccato(annotations, id)).toBe(false);
	});
});

describe('falsetto / strikethrough / slur (範囲トグル系)', () => {
	test('falsettoは範囲単位でトグルされる', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		let annotations: Annotation[] = toggleFalsetto([], [ids[0], ids[1]]);
		expect(hasFalsetto(annotations, ids[0])).toBe(true);
		expect(hasFalsetto(annotations, ids[2])).toBe(false);
		annotations = toggleFalsetto(annotations, [ids[0], ids[1]]);
		expect(hasFalsetto(annotations, ids[0])).toBe(false);
	});

	test('strikethroughは範囲単位でトグルされる', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		let annotations: Annotation[] = toggleStrikethrough([], [ids[1]]);
		expect(hasStrikethrough(annotations, ids[1])).toBe(true);
		annotations = toggleStrikethrough(annotations, [ids[1]]);
		expect(hasStrikethrough(annotations, ids[1])).toBe(false);
	});

	test('slurは3トークン以上でstart/mid/endの位置が判定できる', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		const annotations: Annotation[] = toggleSlur([], ids);
		expect(slurPositionOf(annotations, ids[0])).toBe('start');
		expect(slurPositionOf(annotations, ids[1])).toBe('mid');
		expect(slurPositionOf(annotations, ids[2])).toBe('end');
	});
});

describe('dynamics', () => {
	test('追加・上書き・削除できる', () => {
		const line = buildLines(['あい'])[0];
		const ids = line.tokens.map((t) => t.id);
		let annotations: Annotation[] = upsertDynamics([], ids, 'f');
		expect(findExactDynamics(annotations, ids)?.level).toBe('f');
		expect(dynamicsStartingAt(annotations, ids[0])?.level).toBe('f');
		annotations = upsertDynamics(annotations, ids, 'pp');
		expect(annotations.filter((a) => a.kind === 'dynamics')).toHaveLength(1);
		expect(findExactDynamics(annotations, ids)?.level).toBe('pp');
		annotations = removeDynamics(annotations, ids);
		expect(findExactDynamics(annotations, ids)).toBeUndefined();
	});
});

describe('buildLineRenderItems', () => {
	test('ルビが無ければ全トークンが単独アイテムになる', () => {
		const line = buildLines(['あいう'])[0];
		const items = buildLineRenderItems(line, []);
		expect(items).toHaveLength(3);
		expect(items.every((i) => i.type === 'token')).toBe(true);
	});

	test('ルビ範囲は1つのグループアイテムにまとまる', () => {
		const line = buildLines(['あいう'])[0];
		const ids = line.tokens.map((t) => t.id);
		const annotations: Annotation[] = upsertRuby([], [ids[0], ids[1]], 'てすと');
		const items = buildLineRenderItems(line, annotations);
		expect(items).toHaveLength(2);
		expect(items[0].type).toBe('ruby');
		expect(items[0].tokens.map((t) => t.text)).toEqual(['あ', 'い']);
		expect(items[1].type).toBe('token');
		expect(items[1].tokens.map((t) => t.text)).toEqual(['う']);
	});
});

describe('buildAllLegendEntries', () => {
	test('8種類の注釈すべてに対応する凡例が、それぞれ見本の注釈データ付きで得られる', () => {
		const entries = buildAllLegendEntries();
		const kinds = entries.map((e) => e.kind);
		expect(new Set(kinds)).toEqual(
			new Set(['ruby', 'accent', 'breath', 'falsetto', 'dynamics', 'slur', 'staccato', 'strikethrough'])
		);
		expect(kinds).toHaveLength(8);
		for (const entry of entries) {
			expect(entry.line.tokens.length).toBeGreaterThan(0);
			expect(entry.annotations.some((a) => a.kind === entry.kind)).toBe(true);
			expect(entry.label.length).toBeGreaterThan(0);
		}
	});
});
