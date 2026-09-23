<script lang="ts">
	import { toPng } from 'html-to-image';
	import { createLyricCard } from '$lib/tokenize';
	import {
		toggleBreath,
		toggleFalsetto,
		toggleSlur,
		toggleStaccato,
		toggleStrikethrough,
		upsertAccent,
		upsertDynamics,
		upsertRuby
	} from '$lib/annotations';
	import LyricCardView from '$lib/components/LyricCardView.svelte';

	// 実際の本番レンダリング経路(LyricCardView)を、著作権に配慮した合成サンプルで検証する。
	let card = $state(
		createLyricCard({
			title: '見本ソング',
			artist: 'テスト歌手',
			sourceUrl: '',
			lines: ['青い空を見上げ歌う', '湖の上で揺れる声']
		})
	);
	{
		const ids = card.lines[0].tokens.map((t) => t.id);
		// 青(強弱mf) い(アクセント上昇) 空 /(ブレス) を見上(スラー) げ(スタッカート) 歌(裏声、ルビ:うた) う(打消し線)
		let a = card.annotations;
		a = upsertDynamics(a, [ids[0]], 'mf');
		a = upsertAccent(a, ids[1], 'rise');
		a = toggleBreath(a, ids[2]);
		a = toggleSlur(a, [ids[3], ids[4], ids[5]]);
		a = toggleStaccato(a, ids[6]);
		a = toggleFalsetto(a, [ids[7]]);
		a = upsertRuby(a, [ids[7]], 'うた');
		a = toggleStrikethrough(a, [ids[8]]);

		// 2行目: 印の組み合わせ(重なりの確認用)
		// 湖(ルビ:みずうみ + アクセント下降 + スタッカート) の上(裏声+打消し線+スラー)
		// 上で揺(クレッシェンド) 揺れる(ルビ:ゆれる、途中のれから強弱f) 声(ブレス直後)
		const ids2 = card.lines[1].tokens.map((t) => t.id);
		a = upsertRuby(a, [ids2[0]], 'みずうみ');
		a = upsertAccent(a, ids2[0], 'fall');
		a = toggleStaccato(a, ids2[0]);
		a = toggleFalsetto(a, [ids2[1], ids2[2]]);
		a = toggleStrikethrough(a, [ids2[1], ids2[2]]);
		a = toggleSlur(a, [ids2[1], ids2[2]]);
		a = upsertDynamics(a, [ids2[2], ids2[3], ids2[4]], 'crescendo');
		a = upsertRuby(a, [ids2[4], ids2[5], ids2[6]], 'ゆれる');
		a = upsertDynamics(a, [ids2[5], ids2[6]], 'f');
		a = toggleBreath(a, ids2[7]);
		card.annotations = a;
	}

	let cardEl = $state<HTMLDivElement | undefined>(undefined);
	let pngResult = $state<string | null>(null);
	let pngError = $state<string | null>(null);

	async function exportPng() {
		pngError = null;
		pngResult = null;
		if (!cardEl) return;
		try {
			pngResult = await toPng(cardEl, { pixelRatio: 2, backgroundColor: '#ffffff' });
		} catch (e) {
			pngError = e instanceof Error ? e.message : String(e);
		}
	}

	function exportPdf() {
		window.print();
	}
</script>

<h1>エクスポート技術検証スパイク(Task 3)</h1>
<p>
	合成サンプル(著作権配慮のため実歌詞は使用しない)を、本番と同じ<code>LyricCardView</code>経由でPDF/PNG両経路のルビ・記号表示を確認する。
</p>

<div class="actions no-print">
	<button onclick={exportPdf}>PDFとして印刷</button>
	<button onclick={exportPng}>PNG書き出し</button>
</div>

<LyricCardView {card} bind:cardEl />
<p class="hint no-print">
	凡例(強弱/アクセント/ブレス/スラー/スタッカート/裏声/ルビ/打消し線)は<code>LyricCardView</code>が自動生成し、カード本体の下に表示される。PDF/PNGにも含まれることを確認する。
</p>

{#if pngResult}
	<h2 class="no-print">PNG出力結果(下の画像とカードDOMを見比べてルビ・記号の崩れを確認)</h2>
	<img class="no-print" src={pngResult} alt="PNGエクスポート結果" />
{/if}
{#if pngError}
	<p class="no-print error">PNG出力エラー: {pngError}</p>
{/if}

<style>
	.actions {
		margin: 16px 0;
	}
	.hint {
		font-size: 12px;
		color: #555;
	}
	.error {
		color: #c00;
	}
	@media print {
		:global(.no-print) {
			display: none !important;
		}
	}
</style>
