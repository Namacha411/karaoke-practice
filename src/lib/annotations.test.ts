import { describe, expect, test } from 'bun:test';
import {
	buildAllLegendEntries,
	buildLineRenderItems,
	clearRangeKindOnTokens,
	dynamicsCovering,
	dynamicsLabel,
	dynamicsSpanOf,
	hairpinSegmentPath,
	hasTechnique,
	techniquesOf,
	toggleTechnique,
	toggleTechniqueOnTokens,
	isRangeKindCovering,
	removeAnnotationsOnTokens,
	setDynamicsOnTokens,
	setRubyOnTokens,
	toggleAccentOnTokens,
	toggleRangeKindOnTokens,
	toggleStaccatoOnTokens,
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

describe('強弱の楽譜表記', () => {
	test('クレッシェンド/デクレッシェンドは文字ではなく松葉記号で表す', () => {
		expect(dynamicsLabel('crescendo')).toBe('<');
		expect(dynamicsLabel('decrescendo')).toBe('>');
		expect(dynamicsLabel('mf')).toBe('mf');
	});

	test('dynamicsSpanOf: 範囲内での位置と長さが得られる', () => {
		const ids = buildLines(['あいうえ'])[0].tokens.map((t) => t.id);
		const annotations = upsertDynamics([], [ids[1], ids[2], ids[3]], 'p');
		expect(dynamicsSpanOf(annotations, ids[0])).toBeNull();
		expect(dynamicsSpanOf(annotations, ids[1])).toEqual({ level: 'p', index: 0, length: 3 });
		expect(dynamicsSpanOf(annotations, ids[3])).toEqual({ level: 'p', index: 2, length: 3 });
	});

	test('hairpinSegmentPath: クレッシェンドは左で閉じて右へ開き、文字の境目で連続する', () => {
		const first = hairpinSegmentPath({ level: 'crescendo', index: 0, length: 2 });
		const second = hairpinSegmentPath({ level: 'crescendo', index: 1, length: 2 });
		expect(first).toBe('M0 50 L100 29 M0 50 L100 71');
		expect(second).toBe('M0 29 L100 8 M0 71 L100 92');
	});

	test('hairpinSegmentPath: デクレッシェンドは左で開いて右で閉じる', () => {
		expect(hairpinSegmentPath({ level: 'decrescendo', index: 0, length: 1 })).toBe('M0 8 L100 50 M0 92 L100 50');
	});
});

describe('technique (しゃくり / こぶし / ビブラート / フォール)', () => {
	test('トグルで追加・削除でき、1文字に複数種類を重ねられる', () => {
		const id = buildLines(['あ'])[0].tokens[0].id;
		let annotations: Annotation[] = toggleTechnique([], id, 'vibrato');
		annotations = toggleTechnique(annotations, id, 'shakuri');
		expect(techniquesOf(annotations, id)).toEqual(['shakuri', 'vibrato']);
		annotations = toggleTechnique(annotations, id, 'vibrato');
		expect(hasTechnique(annotations, id, 'vibrato')).toBe(false);
		expect(hasTechnique(annotations, id, 'shakuri')).toBe(true);
	});

	test('toggleTechniqueOnTokens: 一部だけ付いていれば残りに付け、全部付いていれば外す', () => {
		const ids = buildLines(['あい'])[0].tokens.map((t) => t.id);
		let annotations: Annotation[] = toggleTechnique([], ids[0], 'kobushi');
		annotations = toggleTechnique(annotations, ids[0], 'fall');
		annotations = toggleTechniqueOnTokens(annotations, ids, 'kobushi');
		expect(annotations.filter((a) => a.kind === 'technique' && a.type === 'kobushi')).toHaveLength(2);
		annotations = toggleTechniqueOnTokens(annotations, ids, 'kobushi');
		expect(techniquesOf(annotations, ids[0])).toEqual(['fall']);
		expect(techniquesOf(annotations, ids[1])).toEqual([]);
	});

	test('removeAnnotationsOnTokens: 選択した文字の技法も外れる', () => {
		const ids = buildLines(['あい'])[0].tokens.map((t) => t.id);
		let annotations: Annotation[] = toggleTechniqueOnTokens([], ids, 'fall');
		annotations = removeAnnotationsOnTokens(annotations, [ids[0]]);
		expect(hasTechnique(annotations, ids[0], 'fall')).toBe(false);
		expect(hasTechnique(annotations, ids[1], 'fall')).toBe(true);
	});
});

describe('buildAllLegendEntries', () => {
	test('9種類の注釈すべてに対応する凡例が、それぞれ見本の注釈データ付きで得られる', () => {
		const entries = buildAllLegendEntries();
		expect(new Set(entries.map((e) => e.kind))).toEqual(
			new Set(['ruby', 'accent', 'breath', 'falsetto', 'dynamics', 'slur', 'staccato', 'strikethrough', 'technique'])
		);
		expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length);
		for (const entry of entries) {
			expect(entry.line.tokens.length).toBeGreaterThan(0);
			expect(entry.annotations.some((a) => a.kind === entry.kind && entry.matches(a))).toBe(true);
			expect(entry.label.length).toBeGreaterThan(0);
		}
	});

	test('強弱と歌唱技法は、使われている種類の凡例だけが該当する', () => {
		const ids = buildLines(['あい'])[0].tokens.map((t) => t.id);
		let annotations: Annotation[] = upsertDynamics([], ids, 'crescendo');
		annotations = toggleTechnique(annotations, ids[0], 'vibrato');
		const used = buildAllLegendEntries()
			.filter((e) => annotations.some(e.matches))
			.map((e) => e.id);
		expect(used).toEqual(['dynamics-crescendo', 'technique-vibrato']);
	});
});

describe('選択範囲単位の操作', () => {
	const setup = (text = 'あいうえお') => buildLines([text])[0].tokens.map((t) => t.id);

	test('clearRangeKindOnTokens: 範囲の途中を外すと前後に分割される', () => {
		const ids = setup();
		let annotations: Annotation[] = toggleFalsetto([], ids);
		annotations = clearRangeKindOnTokens(annotations, 'falsetto', [ids[2]]);
		const ranges = annotations.filter((a) => a.kind === 'falsetto').map((a) => ('tokenIds' in a ? a.tokenIds : []));
		expect(ranges).toEqual([
			[ids[0], ids[1]],
			[ids[3], ids[4]]
		]);
	});

	test('clearRangeKindOnTokens: スラーは1文字だけ残る断片を捨てる', () => {
		const ids = setup();
		let annotations: Annotation[] = toggleSlur([], [ids[0], ids[1], ids[2]]);
		annotations = clearRangeKindOnTokens(annotations, 'slur', [ids[1]]);
		expect(annotations.filter((a) => a.kind === 'slur')).toHaveLength(0);
	});

	test('toggleRangeKindOnTokens: 部分的に重なる範囲は重複させずに付け直し、全体が覆われていれば外す', () => {
		const ids = setup();
		let annotations: Annotation[] = toggleStrikethrough([], [ids[0], ids[1]]);
		expect(isRangeKindCovering(annotations, 'strikethrough', [ids[1], ids[2]])).toBe(false);
		annotations = toggleRangeKindOnTokens(annotations, 'strikethrough', [ids[1], ids[2]]);
		const ranges = annotations.filter((a) => a.kind === 'strikethrough');
		expect(ranges).toHaveLength(2);
		expect(isRangeKindCovering(annotations, 'strikethrough', [ids[0], ids[1], ids[2]])).toBe(true);
		annotations = toggleRangeKindOnTokens(annotations, 'strikethrough', [ids[1], ids[2]]);
		expect(hasStrikethrough(annotations, ids[0])).toBe(true);
		expect(hasStrikethrough(annotations, ids[1])).toBe(false);
		expect(hasStrikethrough(annotations, ids[2])).toBe(false);
	});

	test('toggleRangeKindOnTokens: スラーは1文字では付かない', () => {
		const ids = setup();
		expect(toggleRangeKindOnTokens([], 'slur', [ids[0]])).toEqual([]);
	});

	test('setDynamicsOnTokens: 重なる強弱は切り取られ、各トークンを覆う強弱は1つになる', () => {
		const ids = setup();
		let annotations: Annotation[] = setDynamicsOnTokens([], ids, 'p');
		annotations = setDynamicsOnTokens(annotations, [ids[2], ids[3]], 'ff');
		for (const id of ids) {
			expect(annotations.filter((a) => a.kind === 'dynamics' && a.tokenIds.includes(id))).toHaveLength(1);
		}
		expect(dynamicsCovering(annotations, ids[0])?.level).toBe('p');
		expect(dynamicsCovering(annotations, ids[2])?.level).toBe('ff');
		expect(dynamicsCovering(annotations, ids[4])?.level).toBe('p');
	});

	test('setRubyOnTokens: 重なるルビを外してから付ける', () => {
		const ids = setup();
		let annotations: Annotation[] = upsertRuby([], [ids[0], ids[1]], 'いち');
		annotations = setRubyOnTokens(annotations, [ids[1], ids[2]], 'に');
		const rubies = annotations.filter((a) => a.kind === 'ruby');
		expect(rubies).toHaveLength(1);
		expect(findExactRuby(annotations, [ids[1], ids[2]])?.reading).toBe('に');
	});

	test('toggleAccentOnTokens: 複数文字に一括で付け、全部同じ向きなら外す', () => {
		const ids = setup();
		let annotations: Annotation[] = upsertAccent([], ids[0], 'fall');
		annotations = toggleAccentOnTokens(annotations, [ids[0], ids[1]], 'rise');
		expect(findAccent(annotations, ids[0])?.type).toBe('rise');
		expect(findAccent(annotations, ids[1])?.type).toBe('rise');
		annotations = toggleAccentOnTokens(annotations, [ids[0], ids[1]], 'rise');
		expect(annotations.filter((a) => a.kind === 'accent')).toHaveLength(0);
	});

	test('toggleStaccatoOnTokens: 一部だけ付いていれば残りに付け、全部付いていれば外す', () => {
		const ids = setup();
		let annotations: Annotation[] = toggleStaccato([], ids[0]);
		annotations = toggleStaccatoOnTokens(annotations, [ids[0], ids[1]]);
		expect(hasStaccato(annotations, ids[0])).toBe(true);
		expect(hasStaccato(annotations, ids[1])).toBe(true);
		annotations = toggleStaccatoOnTokens(annotations, [ids[0], ids[1]]);
		expect(annotations.filter((a) => a.kind === 'staccato')).toHaveLength(0);
	});

	test('removeAnnotationsOnTokens: 選択部分に関わる印だけを外す', () => {
		const ids = setup();
		let annotations: Annotation[] = [];
		annotations = upsertRuby(annotations, [ids[0]], 'よみ');
		annotations = upsertAccent(annotations, ids[1], 'rise');
		annotations = toggleBreath(annotations, ids[1]);
		annotations = toggleStaccato(annotations, ids[3]);
		annotations = toggleFalsetto(annotations, ids);
		annotations = removeAnnotationsOnTokens(annotations, [ids[0], ids[1]]);
		expect(findExactRuby(annotations, [ids[0]])).toBeUndefined();
		expect(findAccent(annotations, ids[1])).toBeUndefined();
		expect(hasBreathAfter(annotations, ids[1])).toBe(false);
		expect(hasStaccato(annotations, ids[3])).toBe(true);
		expect(hasFalsetto(annotations, ids[0])).toBe(false);
		expect(hasFalsetto(annotations, ids[2])).toBe(true);
	});
});
