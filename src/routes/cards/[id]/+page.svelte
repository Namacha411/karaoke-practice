<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { toPng } from 'html-to-image';
	import type { LyricCard } from '$lib/types';
	import { getCard } from '$lib/storage';
	import LyricCardView from '$lib/components/LyricCardView.svelte';

	let card = $state<LyricCard | null>(null);
	let notFound = $state(false);
	let loading = $state(true);
	let cardEl = $state<HTMLDivElement | undefined>(undefined);
	let pngResult = $state<string | null>(null);
	let pngError = $state<string | null>(null);
	let pngLoading = $state(false);
	let loadError = $state<string | null>(null);
	let autoExportDone = $state(false);

	$effect(() => {
		if (autoExportDone || !card) return;
		const requested = page.url.searchParams.get('export');
		if (requested === 'pdf') {
			autoExportDone = true;
			requestAnimationFrame(() => exportPdf());
		} else if (requested === 'png' && cardEl) {
			autoExportDone = true;
			exportPng();
		}
	});

	onMount(async () => {
		try {
			const id = page.params.id;
			const found = id ? await getCard(id) : undefined;
			if (!found) {
				notFound = true;
			} else {
				card = found;
			}
		} catch {
			loadError = 'カードの読み込みに失敗しました(ブラウザのストレージ設定を確認してください)';
		} finally {
			loading = false;
		}
	});

	function exportPdf() {
		window.print();
	}

	async function exportPng() {
		if (!cardEl) return;
		pngError = null;
		pngLoading = true;
		try {
			pngResult = await toPng(cardEl, { pixelRatio: 2, backgroundColor: '#ffffff' });
		} catch (e) {
			pngError = e instanceof Error ? e.message : String(e);
		} finally {
			pngLoading = false;
		}
	}
</script>

<div class="no-print">
	<p><a href="/">&laquo; 一覧へ戻る</a> {#if card}| <a href={`/cards/${card.id}/edit`}>編集する</a>{/if}</p>
</div>

{#if loading}
	<p class="no-print">読み込み中...</p>
{:else if loadError}
	<p class="no-print error">{loadError}</p>
{:else if notFound}
	<p class="no-print">カードが見つかりませんでした。</p>
{:else if card}
	<div class="actions no-print">
		<button onclick={exportPdf}>PDFとして印刷</button>
		<button onclick={exportPng} disabled={pngLoading}>{pngLoading ? '書き出し中...' : 'PNG書き出し'}</button>
		<p class="note">
			注: PNG書き出しはルビ付きレイアウトの再現に既知の技術的リスクがあります。書き出し後、下の画像でルビ・記号が崩れていないか必ず確認してください。
		</p>
	</div>

	<LyricCardView {card} bind:cardEl />

	{#if pngResult}
		<div class="no-print">
			<h3>PNG出力結果</h3>
			<img src={pngResult} alt="{card.title}のPNGエクスポート結果" />
			<p><a href={pngResult} download={`${card.title}.png`}>PNGを保存</a></p>
		</div>
	{/if}
	{#if pngError}
		<p class="no-print error">PNG書き出しエラー: {pngError}</p>
	{/if}
{/if}

<style>
	.actions {
		margin: 16px 0;
	}
	.note {
		font-size: 12px;
		color: #666;
		max-width: 480px;
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
