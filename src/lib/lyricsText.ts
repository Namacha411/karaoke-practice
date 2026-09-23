// 貼り付けられた歌詞テキストを行配列に整える。
// YouTubeの概要欄・コメント欄などからのコピーを想定し、行末の空白や余分な空行、
// 行頭のタイムスタンプ(「0:12 」など)を取り除けるようにしている。

export interface NormalizeLyricsOptions {
	/** 行頭の「0:12」「1:02:03」形式のタイムスタンプを取り除く */
	stripTimestamps?: boolean;
	/** 空行をすべて取り除く(1行おきに空行が入っている貼り付け向け) */
	removeAllBlankLines?: boolean;
}

const TIMESTAMP_PATTERN = /^\s*\[?\d{1,2}:\d{2}(?::\d{2})?\]?\s*/;

export function normalizeLyricsText(text: string, options: NormalizeLyricsOptions = {}): string[] {
	const { stripTimestamps = true, removeAllBlankLines = false } = options;

	let lines = text
		.replace(/\r\n?/g, '\n')
		.split('\n')
		.map((line) => (stripTimestamps ? line.replace(TIMESTAMP_PATTERN, '') : line))
		// 行頭・行末の半角空白やタブは除き、行中の全角スペース(歌詞の区切り)は残す
		.map((line) => line.replace(/^[ \t]+|[ \t　]+$/g, ''));

	if (removeAllBlankLines) {
		lines = lines.filter((line) => line !== '');
	} else {
		// 連続する空行は1つにまとめる
		lines = lines.filter((line, i) => !(line === '' && lines[i - 1] === ''));
	}

	while (lines.length && lines[0] === '') lines.shift();
	while (lines.length && lines[lines.length - 1] === '') lines.pop();
	return lines;
}
