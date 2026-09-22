export interface Token {
	id: string;
	lineId: string;
	/** 1文字(Unicodeコードポイント単位)を基本の編集単位とする */
	text: string;
	index: number;
}

export interface Line {
	id: string;
	tokens: Token[];
}

export type DynamicsLevel = 'pp' | 'p' | 'mp' | 'mf' | 'f' | 'ff' | 'crescendo' | 'decrescendo';

export interface RubyAnnotation {
	id: string;
	kind: 'ruby';
	tokenIds: string[];
	reading: string;
	/** 削除せずON/OFFできるようにするためのフラグ。無効時はカード表示・エクスポートから除外される */
	enabled: boolean;
}

export interface AccentAnnotation {
	id: string;
	kind: 'accent';
	tokenId: string;
	type: 'rise' | 'fall';
}

export interface BreathAnnotation {
	id: string;
	kind: 'breath';
	/** このトークンの直後にブレスを入れる */
	afterTokenId: string;
}

export interface FalsettoAnnotation {
	id: string;
	kind: 'falsetto';
	tokenIds: string[];
}

export interface DynamicsAnnotation {
	id: string;
	kind: 'dynamics';
	tokenIds: string[];
	level: DynamicsLevel;
}

export interface SlurAnnotation {
	id: string;
	kind: 'slur';
	tokenIds: string[];
}

export interface StaccatoAnnotation {
	id: string;
	kind: 'staccato';
	tokenId: string;
}

export interface StrikethroughAnnotation {
	id: string;
	kind: 'strikethrough';
	tokenIds: string[];
}

export type Annotation =
	| RubyAnnotation
	| AccentAnnotation
	| BreathAnnotation
	| FalsettoAnnotation
	| DynamicsAnnotation
	| SlurAnnotation
	| StaccatoAnnotation
	| StrikethroughAnnotation;

export interface LyricCard {
	id: string;
	title: string;
	artist: string;
	sourceUrl: string;
	lines: Line[];
	annotations: Annotation[];
	createdAt: string;
	updatedAt: string;
}
