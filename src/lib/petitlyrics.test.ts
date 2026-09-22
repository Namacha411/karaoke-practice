import { describe, expect, test } from 'bun:test';
import {
	PetitLyricsInputError,
	PetitLyricsParseError,
	parsePetitLyricsHtml,
	resolvePetitLyricsUrl
} from './petitlyrics';

// 実際の歌詞本文は著作権に配慮し使用せず、合成テキストでページ構造のみ再現する。
function syntheticPage(opts: { title?: string; artist?: string; lyricsHtml?: string } = {}) {
	const title = opts.title ?? '&#12486;&#12473;&#12488;&#26354;';
	const artist = opts.artist ?? '&#12486;&#12473;&#12488;&#27468;&#25163;';
	const lyricsHtml = opts.lyricsHtml ?? '&#12486;&#12473;&#12488;&#19968;&#34892;&#30446;\n&#12486;&#12473;&#12488;&#20108;&#34892;&#30446;';
	return `
<html><body>
<div class="title-bar">${title}<!-- / dummy-artist--></div>
<b>アーティスト：</b><a href="/lyrics/artist/1">${artist}</a>
<canvas id="lyrics">${lyricsHtml}</canvas>
</body></html>`;
}

describe('resolvePetitLyricsUrl', () => {
	test('数字のみのIDをURLに変換する', () => {
		expect(resolvePetitLyricsUrl('4289424')).toBe('https://petitlyrics.com/lyrics/4289424');
	});

	test('フルURLからIDを正規化する', () => {
		expect(resolvePetitLyricsUrl('https://petitlyrics.com/lyrics/4289424?foo=bar')).toBe(
			'https://petitlyrics.com/lyrics/4289424'
		);
	});

	test('不正な入力はPetitLyricsInputErrorを投げる', () => {
		expect(() => resolvePetitLyricsUrl('not a url')).toThrow(PetitLyricsInputError);
	});
});

describe('parsePetitLyricsHtml', () => {
	test('タイトル・アーティスト・歌詞行を抽出する', () => {
		const result = parsePetitLyricsHtml(syntheticPage());
		expect(result.title).toBe('テスト曲');
		expect(result.artist).toBe('テスト歌手');
		expect(result.lines).toEqual(['テスト一行目', 'テスト二行目']);
	});

	test('空行を含む歌詞を行配列として保持する', () => {
		const result = parsePetitLyricsHtml(
			syntheticPage({ lyricsHtml: '&#19968;\n\n&#20108;' })
		);
		expect(result.lines).toEqual(['一', '', '二']);
	});

	test('canvas要素が無い場合はPetitLyricsParseErrorを投げる', () => {
		expect(() => parsePetitLyricsHtml('<html><body>no lyrics here</body></html>')).toThrow(
			PetitLyricsParseError
		);
	});
});
