<script lang="ts">
	import { resolve } from '$app/paths';
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

<svelte:head>
	<title>{card ? card.title : '歌詞カード'} | カラオケ練習</title>
</svelte:head>

<div class="toolbar no-print">
	<a href={resolve('/')}>&larr; 一覧</a>
	{#if card}
		<a class="button ghost" href={resolve('/cards/[id]/edit', { id: card.id })}>編集する</a>
		<div class="actions">
			<button class="primary" onclick={exportPdf}>PDFとして印刷</button>
			<button onclick={exportPng} disabled={pngLoading}>{pngLoading ? '書き出し中...' : 'PNG書き出し'}</button>
		</div>
	{/if}
</div>

<main class="sheet">
	{#if loading}
		<p class="no-print">読み込み中...</p>
	{:else if loadError}
		<p class="no-print error">{loadError}</p>
	{:else if notFound}
		<p class="no-print">カードが見つかりませんでした。</p>
	{:else if card}
		<LyricCardView {card} bind:cardEl />

		{#if pngResult}
			<section class="png-result no-print">
				<div class="png-head">
					<h3>PNG出力結果</h3>
					<a class="button primary" href={pngResult} download={`${card.title}.png`}>PNGを保存</a>
				</div>
				<p class="note">ルビ・記号が崩れていないか確認してから保存してください。</p>
				<img src={pngResult} alt="{card.title}のPNGエクスポート結果" />
			</section>
		{/if}
		{#if pngError}
			<p class="no-print error">PNG書き出しエラー: {pngError}</p>
		{/if}
	{/if}
</main>

<style>
	.toolbar {
		position: sticky;
		top: 0;
		z-index: 1;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		background: #fff;
		border-bottom: 1px solid var(--c-border);
	}
	.actions {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.sheet {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 24px 16px 48px;
		background: var(--c-surface);
		min-height: calc(100dvh - 60px);
		box-sizing: border-box;
	}
	.sheet :global(.card) {
		box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
		border-radius: 4px;
	}
	.png-result {
		margin-top: 24px;
		width: 100%;
		max-width: 688px;
	}
	.png-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.png-result img {
		max-width: 100%;
		border: 1px solid var(--c-border);
	}
	.note {
		font-size: 12px;
		color: var(--c-muted);
	}
	.error {
		color: var(--c-danger);
	}
	@media print {
		:global(.no-print) {
			display: none !important;
		}
		.sheet {
			display: block;
			padding: 0;
			background: none;
			min-height: 0;
		}
		.sheet :global(.card) {
			box-shadow: none;
			max-width: none;
			padding: 0;
		}
	}
</style>
