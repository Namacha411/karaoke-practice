<script lang="ts">
	import { resolve } from '$app/paths';
	import { onDestroy, onMount } from 'svelte';
	import { beforeNavigate, goto } from '$app/navigation';
	import { page } from '$app/state';
	import type { LyricCard } from '$lib/types';
	import { getCard, saveCard } from '$lib/storage';
	import LyricCardEditor from '$lib/components/LyricCardEditor.svelte';

	// 編集は自動保存する。変更のたびに少し待ってから保存し、状態を上部に表示する。
	const AUTOSAVE_DELAY_MS = 800;

	let card = $state<LyricCard | null>(null);
	let notFound = $state(false);
	let loading = $state(true);
	let loadError = $state<string | null>(null);
	let saveError = $state<string | null>(null);
	let savedAt = $state<Date | null>(null);
	let saving = $state(false);
	let dirty = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

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

	onDestroy(() => clearTimeout(timer));

	function handleChange() {
		dirty = true;
		clearTimeout(timer);
		timer = setTimeout(persist, AUTOSAVE_DELAY_MS);
	}

	let inFlight: Promise<boolean> | null = null;

	async function persist(): Promise<boolean> {
		clearTimeout(timer);
		// 保存中に呼ばれたら、その保存を待ってから(まだ変更が残っていれば)もう一度保存する
		while (inFlight) await inFlight;
		if (!dirty && savedAt) return true;
		inFlight = save();
		try {
			return await inFlight;
		} finally {
			inFlight = null;
		}
	}

	async function save(): Promise<boolean> {
		if (!card) return false;
		saveError = null;
		saving = true;
		dirty = false;
		try {
			card.updatedAt = new Date().toISOString();
			// IndexedDBのstructured cloneはSvelte 5の$stateプロキシをそのまま渡せないため、素のオブジェクトに変換する
			await saveCard($state.snapshot(card));
			savedAt = new Date();
			return true;
		} catch {
			dirty = true;
			saveError = '保存に失敗しました(ブラウザのストレージ設定を確認してください)';
			return false;
		} finally {
			saving = false;
		}
	}

	// 未保存のまま画面を離れる場合は、保存してから移動する
	beforeNavigate(({ cancel, to, type }) => {
		if (!dirty) return;
		if (type === 'leave') {
			// タブを閉じる・リロードなど(toはnull)。ブラウザの確認ダイアログを出す
			cancel();
			return;
		}
		if (!to) return;
		cancel();
		persist().then((ok) => {
			if (ok) goto(to.url);
		});
	});

	async function handleExport(format: 'pdf' | 'png') {
		if (!card) return;
		if (dirty && !(await persist())) return;
		await goto(`${resolve('/cards/[id]', { id: card.id })}?export=${format}`);
	}

	const status = $derived.by(() => {
		if (saveError) return { tone: 'error', text: saveError };
		if (saving) return { tone: 'muted', text: '保存中…' };
		if (dirty) return { tone: 'muted', text: '未保存の変更あり' };
		if (savedAt)
			return {
				tone: 'ok',
				text: `保存済み ${savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`
			};
		return { tone: 'muted', text: '変更は自動で保存されます' };
	});
</script>

<svelte:head>
	<title>{card ? `${card.title} を編集` : '編集'} | カラオケ練習</title>
</svelte:head>

<div class="page">
	<header class="topbar">
		<a href={resolve('/')} class="back">&larr; 一覧</a>
		{#if card}
			<span class="status {status.tone}" role="status" aria-live="polite">
				{#if status.tone === 'ok'}✓ {/if}{status.text}
			</span>
			<div class="actions">
				<a class="button ghost" href={resolve('/cards/[id]', { id: card.id })}>プレビュー</a>
				<button type="button" onclick={() => handleExport('pdf')} disabled={saving}>PDF</button>
				<button type="button" onclick={() => handleExport('png')} disabled={saving}>PNG</button>
			</div>
		{/if}
	</header>

	<div class="body">
		{#if loading}
			<p class="message">読み込み中...</p>
		{:else if loadError}
			<p class="message error">{loadError}</p>
		{:else if notFound}
			<p class="message">カードが見つかりませんでした。</p>
		{:else if card}
			<LyricCardEditor bind:card onchange={handleChange} />
		{/if}
	</div>
</div>

<style>
	.page {
		height: 100dvh;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		flex: 0 0 auto;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 12px;
		padding: 8px 16px;
		border-bottom: 1px solid var(--c-border);
		background: #fff;
	}
	.back {
		font-weight: 600;
	}
	.status {
		font-size: 13px;
	}
	.status.ok {
		color: #2e7d32;
	}
	.status.muted {
		color: var(--c-muted);
	}
	.status.error {
		color: var(--c-danger);
	}
	.actions {
		margin-left: auto;
		display: flex;
		gap: 8px;
	}
	.body {
		flex: 1 1 auto;
		min-height: 0;
	}
	.message {
		padding: 16px;
	}
	.error {
		color: var(--c-danger);
	}
</style>
