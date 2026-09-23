import { describe, expect, test } from 'bun:test';
import { normalizeLyricsText } from './lyricsText';

describe('normalizeLyricsText', () => {
	test('改行コードを統一し、行末の空白と前後の空行を取り除く', () => {
		expect(normalizeLyricsText('\r\n\r\nあいう  \r\nえお\t\r\n\r\n')).toEqual(['あいう', 'えお']);
	});

	test('連続する空行は1つにまとめる(段落の区切りは残す)', () => {
		expect(normalizeLyricsText('あ\n\n\n\nい\n\nう')).toEqual(['あ', '', 'い', '', 'う']);
	});

	test('行中の全角スペースは残す', () => {
		expect(normalizeLyricsText('あい　うえ　')).toEqual(['あい　うえ']);
	});

	test('行頭のタイムスタンプを取り除く(オプションで無効化できる)', () => {
		const text = '0:12 あいう\n[1:02:03] えお\n12:34かき';
		expect(normalizeLyricsText(text)).toEqual(['あいう', 'えお', 'かき']);
		expect(normalizeLyricsText(text, { stripTimestamps: false })).toEqual(['0:12 あいう', '[1:02:03] えお', '12:34かき']);
	});

	test('removeAllBlankLinesで空行をすべて取り除く', () => {
		expect(normalizeLyricsText('あ\n\nい\n\nう', { removeAllBlankLines: true })).toEqual(['あ', 'い', 'う']);
	});

	test('空の入力は空配列になる', () => {
		expect(normalizeLyricsText('  \n\n ')).toEqual([]);
	});
});
