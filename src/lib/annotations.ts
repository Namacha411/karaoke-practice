import type {
	Annotation,
	AccentAnnotation,
	BreathAnnotation,
	DynamicsAnnotation,
	DynamicsLevel,
	FalsettoAnnotation,
	Line,
	RubyAnnotation,
	SlurAnnotation,
	StaccatoAnnotation,
	StrikethroughAnnotation,
	TechniqueAnnotation,
	TechniqueType,
	Token
} from './types';
import { buildLines } from './tokenize';

export const isRubyAnnotation = (a: Annotation): a is RubyAnnotation => a.kind === 'ruby';
export const isAccentAnnotation = (a: Annotation): a is AccentAnnotation => a.kind === 'accent';
export const isBreathAnnotation = (a: Annotation): a is BreathAnnotation => a.kind === 'breath';
export const isFalsettoAnnotation = (a: Annotation): a is FalsettoAnnotation => a.kind === 'falsetto';
export const isDynamicsAnnotation = (a: Annotation): a is DynamicsAnnotation => a.kind === 'dynamics';
export const isSlurAnnotation = (a: Annotation): a is SlurAnnotation => a.kind === 'slur';
export const isStaccatoAnnotation = (a: Annotation): a is StaccatoAnnotation => a.kind === 'staccato';
export const isStrikethroughAnnotation = (a: Annotation): a is StrikethroughAnnotation =>
	a.kind === 'strikethrough';
export const isTechniqueAnnotation = (a: Annotation): a is TechniqueAnnotation => a.kind === 'technique';

function rangeKey(tokenIds: string[]): string {
	return tokenIds.join('|');
}

function newId(): string {
	return crypto.randomUUID();
}

// --- Ruby -------------------------------------------------------------

export function upsertRuby(annotations: Annotation[], tokenIds: string[], reading: string): Annotation[] {
	const key = rangeKey(tokenIds);
	const filtered = annotations.filter((a) => !(isRubyAnnotation(a) && rangeKey(a.tokenIds) === key));
	const ruby: RubyAnnotation = { id: newId(), kind: 'ruby', tokenIds, reading, enabled: true };
	return [...filtered, ruby];
}

export function setRubyEnabled(annotations: Annotation[], id: string, enabled: boolean): Annotation[] {
	return annotations.map((a) => (isRubyAnnotation(a) && a.id === id ? { ...a, enabled } : a));
}

export function findExactRuby(annotations: Annotation[], tokenIds: string[]): RubyAnnotation | undefined {
	const key = rangeKey(tokenIds);
	return annotations.find((a): a is RubyAnnotation => isRubyAnnotation(a) && rangeKey(a.tokenIds) === key);
}

export function rubyStartingAt(annotations: Annotation[], tokenId: string): RubyAnnotation | undefined {
	return annotations.find((a): a is RubyAnnotation => isRubyAnnotation(a) && a.tokenIds[0] === tokenId);
}

// --- Accent -------------------------------------------------------------

export function upsertAccent(
	annotations: Annotation[],
	tokenId: string,
	type: AccentAnnotation['type']
): Annotation[] {
	const filtered = annotations.filter((a) => !(isAccentAnnotation(a) && a.tokenId === tokenId));
	return [...filtered, { id: newId(), kind: 'accent', tokenId, type }];
}

export function removeAccent(annotations: Annotation[], tokenId: string): Annotation[] {
	return annotations.filter((a) => !(isAccentAnnotation(a) && a.tokenId === tokenId));
}

export function findAccent(annotations: Annotation[], tokenId: string): AccentAnnotation | undefined {
	return annotations.find((a): a is AccentAnnotation => isAccentAnnotation(a) && a.tokenId === tokenId);
}

// --- Breath -------------------------------------------------------------

export function toggleBreath(annotations: Annotation[], afterTokenId: string): Annotation[] {
	const exists = annotations.some((a) => isBreathAnnotation(a) && a.afterTokenId === afterTokenId);
	if (exists) {
		return annotations.filter((a) => !(isBreathAnnotation(a) && a.afterTokenId === afterTokenId));
	}
	return [...annotations, { id: newId(), kind: 'breath', afterTokenId }];
}

export function hasBreathAfter(annotations: Annotation[], tokenId: string): boolean {
	return annotations.some((a) => isBreathAnnotation(a) && a.afterTokenId === tokenId);
}

// --- Falsetto / Slur / Strikethrough (単純なトークン範囲トグル) --------------

type RangeKind = 'falsetto' | 'slur' | 'strikethrough';

function toggleRange(annotations: Annotation[], kind: RangeKind, tokenIds: string[]): Annotation[] {
	const key = rangeKey(tokenIds);
	const exists = annotations.some(
		(a) => a.kind === kind && 'tokenIds' in a && rangeKey(a.tokenIds) === key
	);
	if (exists) {
		return annotations.filter((a) => !(a.kind === kind && 'tokenIds' in a && rangeKey(a.tokenIds) === key));
	}
	return [...annotations, { id: newId(), kind, tokenIds } as Annotation];
}

export function toggleFalsetto(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	return toggleRange(annotations, 'falsetto', tokenIds);
}

export function toggleSlur(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	return toggleRange(annotations, 'slur', tokenIds);
}

export function toggleStrikethrough(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	return toggleRange(annotations, 'strikethrough', tokenIds);
}

export function hasFalsetto(annotations: Annotation[], tokenId: string): boolean {
	return annotations.some((a) => isFalsettoAnnotation(a) && a.tokenIds.includes(tokenId));
}

export function hasStrikethrough(annotations: Annotation[], tokenId: string): boolean {
	return annotations.some((a) => isStrikethroughAnnotation(a) && a.tokenIds.includes(tokenId));
}

export type SlurPosition = 'solo' | 'start' | 'mid' | 'end';

export function slurPositionOf(annotations: Annotation[], tokenId: string): SlurPosition | null {
	const slur = annotations.find((a): a is SlurAnnotation => isSlurAnnotation(a) && a.tokenIds.includes(tokenId));
	if (!slur) return null;
	if (slur.tokenIds.length === 1) return 'solo';
	const idx = slur.tokenIds.indexOf(tokenId);
	if (idx === 0) return 'start';
	if (idx === slur.tokenIds.length - 1) return 'end';
	return 'mid';
}

// --- Staccato -------------------------------------------------------------

export function toggleStaccato(annotations: Annotation[], tokenId: string): Annotation[] {
	const exists = annotations.some((a) => isStaccatoAnnotation(a) && a.tokenId === tokenId);
	if (exists) {
		return annotations.filter((a) => !(isStaccatoAnnotation(a) && a.tokenId === tokenId));
	}
	return [...annotations, { id: newId(), kind: 'staccato', tokenId }];
}

export function hasStaccato(annotations: Annotation[], tokenId: string): boolean {
	return annotations.some((a) => isStaccatoAnnotation(a) && a.tokenId === tokenId);
}

// --- Technique (しゃくり / こぶし / ビブラート / フォール) ---------------------
// 1文字に複数種類の技法を重ねて付けられる(例: しゃくり+ビブラート)。同じ種類は1文字に1つまで。

export const TECHNIQUE_TYPES: TechniqueType[] = ['shakuri', 'kobushi', 'vibrato', 'fall'];

export function techniqueLabel(type: TechniqueType): string {
	if (type === 'shakuri') return 'しゃくり';
	if (type === 'kobushi') return 'こぶし';
	if (type === 'vibrato') return 'ビブラート';
	return 'フォール';
}

export function hasTechnique(annotations: Annotation[], tokenId: string, type: TechniqueType): boolean {
	return annotations.some((a) => isTechniqueAnnotation(a) && a.tokenId === tokenId && a.type === type);
}

/** 指定トークンに付いた技法を、表示順(TECHNIQUE_TYPESの順)で返す */
export function techniquesOf(annotations: Annotation[], tokenId: string): TechniqueType[] {
	return TECHNIQUE_TYPES.filter((type) => hasTechnique(annotations, tokenId, type));
}

export function toggleTechnique(annotations: Annotation[], tokenId: string, type: TechniqueType): Annotation[] {
	if (hasTechnique(annotations, tokenId, type)) {
		return annotations.filter((a) => !(isTechniqueAnnotation(a) && a.tokenId === tokenId && a.type === type));
	}
	return [...annotations, { id: newId(), kind: 'technique', tokenId, type }];
}

/** 全トークンにその技法があれば外し、そうでなければ未設定のトークンに付ける */
export function toggleTechniqueOnTokens(
	annotations: Annotation[],
	tokenIds: string[],
	type: TechniqueType
): Annotation[] {
	if (tokenIds.length === 0) return annotations;
	const allSet = tokenIds.every((id) => hasTechnique(annotations, id, type));
	let result = annotations;
	for (const id of tokenIds) {
		if (allSet || !hasTechnique(result, id, type)) result = toggleTechnique(result, id, type);
	}
	return result;
}

// --- Dynamics -------------------------------------------------------------

export function upsertDynamics(
	annotations: Annotation[],
	tokenIds: string[],
	level: DynamicsLevel
): Annotation[] {
	const key = rangeKey(tokenIds);
	const filtered = annotations.filter((a) => !(isDynamicsAnnotation(a) && rangeKey(a.tokenIds) === key));
	return [...filtered, { id: newId(), kind: 'dynamics', tokenIds, level }];
}

export function removeDynamics(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	const key = rangeKey(tokenIds);
	return annotations.filter((a) => !(isDynamicsAnnotation(a) && rangeKey(a.tokenIds) === key));
}

export function findExactDynamics(annotations: Annotation[], tokenIds: string[]): DynamicsAnnotation | undefined {
	const key = rangeKey(tokenIds);
	return annotations.find(
		(a): a is DynamicsAnnotation => isDynamicsAnnotation(a) && rangeKey(a.tokenIds) === key
	);
}

export function dynamicsStartingAt(annotations: Annotation[], tokenId: string): DynamicsAnnotation | undefined {
	return annotations.find((a): a is DynamicsAnnotation => isDynamicsAnnotation(a) && a.tokenIds[0] === tokenId);
}

// --- 共通 -------------------------------------------------------------

export function removeAnnotation(annotations: Annotation[], id: string): Annotation[] {
	return annotations.filter((a) => a.id !== id);
}

// --- 選択範囲単位の操作 ---------------------------------------------------
// 編集UIは「選択中のトークン列」に対して印を付け外しする。
// 範囲系の注釈は完全一致でなくても、選択範囲に重なる部分を切り取ってから付け直すことで、
// 同じ種類の印が重なって二重に描画されることを防ぐ。

export type RangeAnnotationKind = 'falsetto' | 'slur' | 'strikethrough' | 'dynamics';

type RangeAnnotation = FalsettoAnnotation | SlurAnnotation | StrikethroughAnnotation | DynamicsAnnotation;

function isRangeOfKind(a: Annotation, kind: RangeAnnotationKind): a is RangeAnnotation {
	return a.kind === kind;
}

/** 範囲の最小トークン数。スラーは2文字以上でないと意味を持たない */
function minRangeLength(kind: RangeAnnotationKind): number {
	return kind === 'slur' ? 2 : 1;
}

/**
 * 指定種類の範囲注釈から、選択トークンに当たる部分を取り除く。
 * 残りが前後に分かれる場合は、連続した部分ごとに別の注釈として残す。
 */
export function clearRangeKindOnTokens(
	annotations: Annotation[],
	kind: RangeAnnotationKind,
	tokenIds: string[]
): Annotation[] {
	const selected = new Set(tokenIds);
	const result: Annotation[] = [];
	for (const a of annotations) {
		if (!isRangeOfKind(a, kind) || !a.tokenIds.some((id) => selected.has(id))) {
			result.push(a);
			continue;
		}
		const segments: string[][] = [[]];
		for (const id of a.tokenIds) {
			if (selected.has(id)) {
				if (segments[segments.length - 1].length > 0) segments.push([]);
			} else {
				segments[segments.length - 1].push(id);
			}
		}
		for (const seg of segments) {
			if (seg.length < minRangeLength(kind)) continue;
			result.push({ ...a, id: newId(), tokenIds: seg });
		}
	}
	return result;
}

/** 選択トークンがすべて指定種類の範囲注釈で覆われているか */
export function isRangeKindCovering(annotations: Annotation[], kind: RangeAnnotationKind, tokenIds: string[]): boolean {
	if (tokenIds.length === 0) return false;
	return tokenIds.every((id) => annotations.some((a) => isRangeOfKind(a, kind) && a.tokenIds.includes(id)));
}

/**
 * 裏声・スラー・打消し線の付け外し。
 * 選択範囲がすでに全部覆われていれば外し、そうでなければ選択範囲ちょうどに付け直す。
 */
export function toggleRangeKindOnTokens(
	annotations: Annotation[],
	kind: Exclude<RangeAnnotationKind, 'dynamics'>,
	tokenIds: string[]
): Annotation[] {
	if (tokenIds.length < minRangeLength(kind)) return annotations;
	const covered = isRangeKindCovering(annotations, kind, tokenIds);
	const cleared = clearRangeKindOnTokens(annotations, kind, tokenIds);
	if (covered) return cleared;
	return [...cleared, { id: newId(), kind, tokenIds } as Annotation];
}

export function setDynamicsOnTokens(annotations: Annotation[], tokenIds: string[], level: DynamicsLevel): Annotation[] {
	if (tokenIds.length === 0) return annotations;
	const cleared = clearRangeKindOnTokens(annotations, 'dynamics', tokenIds);
	return [...cleared, { id: newId(), kind: 'dynamics', tokenIds, level }];
}

export function dynamicsCovering(annotations: Annotation[], tokenId: string): DynamicsAnnotation | undefined {
	return annotations.find((a): a is DynamicsAnnotation => isDynamicsAnnotation(a) && a.tokenIds.includes(tokenId));
}

/** 選択範囲にかかるルビを外してから、選択範囲ちょうどにルビを付ける(ルビ同士の重なりを防ぐ) */
export function setRubyOnTokens(annotations: Annotation[], tokenIds: string[], reading: string): Annotation[] {
	if (tokenIds.length === 0 || !reading) return annotations;
	const selected = new Set(tokenIds);
	const filtered = annotations.filter((a) => !(isRubyAnnotation(a) && a.tokenIds.some((id) => selected.has(id))));
	return [...filtered, { id: newId(), kind: 'ruby', tokenIds, reading, enabled: true }];
}

/** 全トークンが同じ向きのアクセントなら外し、そうでなければ全トークンをその向きにする */
export function toggleAccentOnTokens(
	annotations: Annotation[],
	tokenIds: string[],
	type: AccentAnnotation['type']
): Annotation[] {
	if (tokenIds.length === 0) return annotations;
	const allSet = tokenIds.every((id) => findAccent(annotations, id)?.type === type);
	let result = annotations;
	for (const id of tokenIds) {
		result = allSet ? removeAccent(result, id) : upsertAccent(result, id, type);
	}
	return result;
}

/** 全トークンにスタッカートがあれば外し、そうでなければ未設定のトークンに付ける */
export function toggleStaccatoOnTokens(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	if (tokenIds.length === 0) return annotations;
	const allSet = tokenIds.every((id) => hasStaccato(annotations, id));
	let result = annotations;
	for (const id of tokenIds) {
		if (allSet || !hasStaccato(result, id)) result = toggleStaccato(result, id);
	}
	return result;
}

/** 選択トークンに関わる印をすべて外す(範囲系は選択部分だけ切り取る) */
export function removeAnnotationsOnTokens(annotations: Annotation[], tokenIds: string[]): Annotation[] {
	const selected = new Set(tokenIds);
	let result = annotations.filter((a) => {
		if (isRubyAnnotation(a)) return !a.tokenIds.some((id) => selected.has(id));
		if (isAccentAnnotation(a) || isStaccatoAnnotation(a) || isTechniqueAnnotation(a)) return !selected.has(a.tokenId);
		if (isBreathAnnotation(a)) return !selected.has(a.afterTokenId);
		return true;
	});
	for (const kind of ['falsetto', 'slur', 'strikethrough', 'dynamics'] as const) {
		result = clearRangeKindOnTokens(result, kind, tokenIds);
	}
	return result;
}

/** クレッシェンド/デクレッシェンドは楽譜と同じ松葉(ヘアピン)記号で表す */
export function isHairpin(level: DynamicsLevel): level is 'crescendo' | 'decrescendo' {
	return level === 'crescendo' || level === 'decrescendo';
}

export function dynamicsLabel(level: DynamicsLevel): string {
	if (level === 'crescendo') return '<';
	if (level === 'decrescendo') return '>';
	return level;
}

export function dynamicsName(level: DynamicsLevel): string {
	if (level === 'crescendo') return 'クレッシェンド(だんだん強く)';
	if (level === 'decrescendo') return 'デクレッシェンド(だんだん弱く)';
	return level;
}

export interface DynamicsSpan {
	level: DynamicsLevel;
	/** 強弱の範囲内で、このトークンが何番目か(0始まり) */
	index: number;
	length: number;
}

export function dynamicsSpanOf(annotations: Annotation[], tokenId: string): DynamicsSpan | null {
	const dyn = dynamicsCovering(annotations, tokenId);
	if (!dyn) return null;
	return { level: dyn.level, index: dyn.tokenIds.indexOf(tokenId), length: dyn.tokenIds.length };
}

/**
 * 松葉記号のうち、1文字分の区間に描く2本の線のSVGパス(viewBox 0 0 100 100)。
 * 文字ごとに区切って描くことで、行の折り返しをまたいでも開き具合が連続する。
 */
export function hairpinSegmentPath(span: DynamicsSpan): string {
	const maxHalf = 42;
	const opening = (t: number) => maxHalf * (span.level === 'crescendo' ? t : 1 - t);
	const a = opening(span.index / span.length);
	const b = opening((span.index + 1) / span.length);
	return `M0 ${50 - a} L100 ${50 - b} M0 ${50 + a} L100 ${50 + b}`;
}

// --- 行のレンダリング計画 ---------------------------------------------------
// ルビだけは複数トークンを1つの<ruby>要素にまとめる必要があるため、
// 行のトークン列を「ルビでグルーピングされた範囲」と「単独トークン」の列に変換する。
// それ以外の注釈(アクセント/ブレス/裏声/強弱/スラー/スタッカート/打消し線/歌唱技法)は
// トークン単位のCSS装飾として扱うため、グルーピングの対象にしない。

export interface LineRenderItem {
	type: 'ruby' | 'token';
	ruby?: RubyAnnotation;
	tokens: Token[];
}

export function buildLineRenderItems(line: Line, annotations: Annotation[]): LineRenderItem[] {
	const items: LineRenderItem[] = [];
	const consumed = new Set<string>();
	const byId = new Map(line.tokens.map((t) => [t.id, t] as const));

	for (const token of line.tokens) {
		if (consumed.has(token.id)) continue;

		const ruby = rubyStartingAt(annotations, token.id);
		if (ruby && ruby.tokenIds.every((id) => byId.has(id))) {
			const groupTokens = ruby.tokenIds.map((id) => byId.get(id)!);
			groupTokens.forEach((t) => consumed.add(t.id));
			items.push({ type: 'ruby', ruby, tokens: groupTokens });
		} else {
			items.push({ type: 'token', tokens: [token] });
		}
	}

	return items;
}

// --- 凡例 -------------------------------------------------------------
// エクスポート(PDF/PNG)・表示画面に「この記号が何を意味するか」を示すための、
// 各注釈種別の見本(サンプル文字+実際の描画に使う注釈データ)を組み立てる。
// 見本の描画自体はLyricLineコンポーネントを流用するため、実際の見た目と必ず一致する。


export interface LegendEntry {
	/** 凡例の項目を一意に識別するキー(強弱・歌唱技法は1種別に複数の項目がある) */
	id: string;
	kind: Annotation['kind'];
	/** カード内のこの注釈が、この凡例項目で説明されるものか */
	matches: (a: Annotation) => boolean;
	label: string;
	line: Line;
	annotations: Annotation[];
}

const TECHNIQUE_LEGEND: Record<TechniqueType, string> = {
	shakuri: 'しゃくり(低い音からしゃくり上げる)',
	kobushi: 'こぶし(音を一瞬だけ上下に揺らす)',
	vibrato: 'ビブラート(伸ばす音を細かく揺らす)',
	fall: 'フォール(音の終わりを下げて抜く)'
};

export function buildAllLegendEntries(): LegendEntry[] {
	const rubyLine = buildLines(['例'], 'legend-ruby')[0];
	const accentLine = buildLines(['例'], 'legend-accent')[0];
	const breathLine = buildLines(['例い'], 'legend-breath')[0];
	const falsettoLine = buildLines(['例'], 'legend-falsetto')[0];
	const dynamicsLine = buildLines(['例い'], 'legend-dynamics')[0];
	const crescendoLine = buildLines(['例い'], 'legend-crescendo')[0];
	const decrescendoLine = buildLines(['例い'], 'legend-decrescendo')[0];
	const slurLine = buildLines(['例い'], 'legend-slur')[0];
	const staccatoLine = buildLines(['例'], 'legend-staccato')[0];
	const strikethroughLine = buildLines(['例'], 'legend-strikethrough')[0];
	const allIds = (line: Line) => line.tokens.map((t) => t.id);

	return [
		{
			id: 'ruby',
			kind: 'ruby',
			matches: isRubyAnnotation,
			label: 'ルビ(読み仮名)',
			line: rubyLine,
			annotations: upsertRuby([], [rubyLine.tokens[0].id], 'れい')
		},
		{
			id: 'accent',
			kind: 'accent',
			matches: isAccentAnnotation,
			label: 'アクセント(↗上昇 / ↘下降)',
			line: accentLine,
			annotations: upsertAccent([], accentLine.tokens[0].id, 'rise')
		},
		{
			id: 'breath',
			kind: 'breath',
			matches: isBreathAnnotation,
			label: 'ブレス(V の位置で息継ぎ)',
			line: breathLine,
			annotations: toggleBreath([], breathLine.tokens[0].id)
		},
		{
			id: 'falsetto',
			kind: 'falsetto',
			matches: isFalsettoAnnotation,
			label: '裏声(文字の下の波線)',
			line: falsettoLine,
			annotations: toggleFalsetto([], [falsettoLine.tokens[0].id])
		},
		{
			id: 'dynamics',
			kind: 'dynamics',
			matches: (a) => isDynamicsAnnotation(a) && !isHairpin(a.level),
			label: '強弱記号(文字の下。記号の位置から点線の範囲に適用)',
			line: dynamicsLine,
			annotations: upsertDynamics([], allIds(dynamicsLine), 'f')
		},
		{
			id: 'dynamics-crescendo',
			kind: 'dynamics',
			matches: (a) => isDynamicsAnnotation(a) && a.level === 'crescendo',
			label: 'クレッシェンド(文字の下の開く松葉。だんだん強く)',
			line: crescendoLine,
			annotations: upsertDynamics([], allIds(crescendoLine), 'crescendo')
		},
		{
			id: 'dynamics-decrescendo',
			kind: 'dynamics',
			matches: (a) => isDynamicsAnnotation(a) && a.level === 'decrescendo',
			label: 'デクレッシェンド(文字の下の閉じる松葉。だんだん弱く)',
			line: decrescendoLine,
			annotations: upsertDynamics([], allIds(decrescendoLine), 'decrescendo')
		},
		{
			id: 'slur',
			kind: 'slur',
			matches: isSlurAnnotation,
			label: 'スラー(文字の下の弧。なめらかに繋げて歌う)',
			line: slurLine,
			annotations: toggleSlur([], allIds(slurLine))
		},
		{
			id: 'staccato',
			kind: 'staccato',
			matches: isStaccatoAnnotation,
			label: 'スタッカート(文字の上の点。短く切って歌う)',
			line: staccatoLine,
			annotations: toggleStaccato([], staccatoLine.tokens[0].id)
		},
		{
			id: 'strikethrough',
			kind: 'strikethrough',
			matches: isStrikethroughAnnotation,
			label: '打消し線(歌わない/差し替え候補)',
			line: strikethroughLine,
			annotations: toggleStrikethrough([], [strikethroughLine.tokens[0].id])
		},
		...TECHNIQUE_TYPES.map((type): LegendEntry => {
			const line = buildLines(['例'], `legend-technique-${type}`)[0];
			return {
				id: `technique-${type}`,
				kind: 'technique',
				matches: (a) => isTechniqueAnnotation(a) && a.type === type,
				label: TECHNIQUE_LEGEND[type],
				line,
				annotations: toggleTechnique([], line.tokens[0].id, type)
			};
		})
	];
}
