<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { LyricCard } from '$lib/types';
	import { getCard, saveCard } from '$lib/storage';
	import LyricCardEditor from '$lib/components/LyricCardEditor.svelte';

	let card = $state<LyricCard | null>(null);
	let notFound = $state(false);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let savedAt = $state<number | null>(null);
	let saving = $state(false);

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

	async function persist(): Promise<boolean> {
		if (!card) return false;
		saveError = null;
		saving = true;
		try {
			card.updatedAt = new Date().toISOString();
			// IndexedDBのstructured cloneはSvelte 5の$stateプロキシをそのまま渡せないため、素のオブジェクトに変換する
			await saveCard($state.snapshot(card));
			savedAt = Date.now();
			return true;
		} catch {
			saveError = '保存に失敗しました(ブラウザのストレージ設定を確認してください)';
			return false;
		} finally {
			saving = false;
		}
	}

	async function handleSaveAndExport(format: 'pdf' | 'png') {
		if (!card) return;
		const ok = await persist();
		if (ok) await goto(`/cards/${card.id}?export=${format}`);
	}
</script>

<div class="page">
	<header class="topbar">
		<a href="/">&laquo; 一覧へ戻る</a>
		{#if card}
			<div class="actions">
				<button onclick={persist} disabled={saving}>{saving ? '保存中...' : '保存'}</button>
				<button onclick={() => handleSaveAndExport('pdf')} disabled={saving}>保存してPDF書き出し</button>
				<button onclick={() => handleSaveAndExport('png')} disabled={saving}>保存してPNG書き出し</button>
				{#if savedAt}<span class="saved">保存しました</span>{/if}
				{#if saveError}<span class="error">{saveError}</span>{/if}
			</div>
		{/if}
	</header>

	<div class="body">
		{#if loading}
			<p>読み込み中...</p>
		{:else if loadError}
			<p class="error">{loadError}</p>
		{:else if notFound}
			<p>カードが見つかりませんでした。</p>
		{:else if card}
			<LyricCardEditor bind:card />
		{/if}
	</div>
</div>

<style>
	.page {
		height: 100dvh;
		display: flex;
		flex-direction: column;
		box-sizing: border-box;
	}
	.topbar {
		flex: 0 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		border-bottom: 1px solid #ddd;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 8px;
	}
	.body {
		flex: 1 1 auto;
		min-height: 0;
		padding: 0 16px;
	}
	.saved {
		color: #2e7d32;
		font-size: 12px;
	}
	.error {
		color: #c00;
		font-size: 12px;
	}
</style>
