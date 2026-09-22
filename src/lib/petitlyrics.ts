export class PetitLyricsError extends Error {
	status: number;
	constructor(message: string, status = 502) {
		super(message);
		this.status = status;
	}
}

export class PetitLyricsInputError extends PetitLyricsError {
	constructor(message: string) {
		super(message, 400);
	}
}

export class PetitLyricsFetchError extends PetitLyricsError {
	constructor(message: string) {
		super(message, 502);
	}
}

export class PetitLyricsParseError extends PetitLyricsError {
	constructor(message: string) {
		super(message, 502);
	}
}

export interface FetchedLyrics {
	id: string;
	title: string;
	artist: string;
	lines: string[];
	sourceUrl: string;
}

const LYRICS_ID_PATTERN = /petitlyrics\.com\/lyrics\/(\d+)/i;

export function resolvePetitLyricsUrl(input: string): string {
	const trimmed = input.trim();
	if (/^\d+$/.test(trimmed)) {
		return `https://petitlyrics.com/lyrics/${trimmed}`;
	}
	const match = trimmed.match(LYRICS_ID_PATTERN);
	if (match) {
		return `https://petitlyrics.com/lyrics/${match[1]}`;
	}
	throw new PetitLyricsInputError('petitlyrics.comの歌詞ページURL、またはID(数字)を入力してください');
}

// petitlyricsはコピー防止のため歌詞を<canvas>要素で描画するが、
// 非対応ブラウザ向けフォールバックとして本文がHTML内にプレーンテキストで残っている。
const CANVAS_LYRICS_PATTERN = /<canvas id="lyrics">([\s\S]*?)<\/canvas>/;
const TITLE_BAR_PATTERN = /<div class="title-bar">([\s\S]*?)<\/div>/;
const ARTIST_PATTERN = /<b>アーティスト：<\/b><a href="\/lyrics\/artist\/\d+">([\s\S]*?)<\/a>/;

function decodeHtmlEntities(input: string): string {
	return input
		.replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(Number(dec)))
		.replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
		.replace(/&nbsp;/g, ' ')
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&amp;/g, '&');
}

export function parsePetitLyricsHtml(html: string): { title: string; artist: string; lines: string[] } {
	const decoded = decodeHtmlEntities(html);

	const canvasMatch = decoded.match(CANVAS_LYRICS_PATTERN);
	if (!canvasMatch) {
		throw new PetitLyricsParseError('歌詞本文が見つかりませんでした(ページ構成が変更された可能性があります)');
	}
	const lines = canvasMatch[1]
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((line) => line.replace(/\s+$/u, ''));
	while (lines.length && lines[0] === '') lines.shift();
	while (lines.length && lines[lines.length - 1] === '') lines.pop();

	const titleMatch = decoded.match(TITLE_BAR_PATTERN);
	const title = titleMatch ? titleMatch[1].replace(/<!--[\s\S]*?-->/g, '').trim() : '';

	const artistMatch = decoded.match(ARTIST_PATTERN);
	const artist = artistMatch ? artistMatch[1].trim() : '';

	if (!title) {
		throw new PetitLyricsParseError('曲名が見つかりませんでした(ページ構成が変更された可能性があります)');
	}

	return { title, artist, lines };
}

export async function fetchPetitLyrics(
	input: string,
	fetchImpl: typeof fetch = fetch
): Promise<FetchedLyrics> {
	const sourceUrl = resolvePetitLyricsUrl(input);
	const id = sourceUrl.match(LYRICS_ID_PATTERN)![1];

	let res: Response;
	try {
		res = await fetchImpl(sourceUrl, {
			headers: { 'User-Agent': 'Mozilla/5.0 (compatible; karaoke-practice/0.1; local-only)' }
		});
	} catch {
		throw new PetitLyricsFetchError('歌詞ページへの接続に失敗しました');
	}
	if (!res.ok) {
		throw new PetitLyricsFetchError(
			`歌詞ページの取得に失敗しました (HTTP ${res.status})。URLとIDを確認してください`
		);
	}

	const html = await res.text();
	const { title, artist, lines } = parsePetitLyricsHtml(html);

	return { id, title, artist, lines, sourceUrl };
}
