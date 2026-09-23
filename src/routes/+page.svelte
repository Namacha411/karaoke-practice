<script lang="ts">
	import { onMount } from 'svelte';
	import type { LyricCard } from '$lib/types';
	import { deleteCard, listCards, saveCard } from '$lib/storage';
	import { duplicateLyricCard } from '$lib/tokenize';

	let cards = $state<LyricCard[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function refresh() {
		try {
			cards = await listCards();
			error = null;
		} catch {
			error = '歌詞カード一覧の読み込みに失敗しました(ブラウザのストレージ設定を確認してください)';
		}
	}

	onMount(async () => {
		await refresh();
		loading = false;
	});

	async function handleDelete(card: LyricCard) {
		if (!confirm(`「${card.title}」を削除しますか? この操作は取り消せません。`)) return;
		try {
			await deleteCard(card.id);
			await refresh();
		} catch {
			error = '削除に失敗しました';
		}
	}

	function formatDate(iso: string) {
		return new Date(iso).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
	}

	async function handleDuplicate(card: LyricCard) {
		try {
			// IndexedDBのstructured cloneはSvelte 5の$stateプロキシをそのまま渡せないため、素のオブジェクトに変換する
			const copy = duplicateLyricCard($state.snapshot(card));
			await saveCard(copy);
			await refresh();
		} catch {
			error = '複製に失敗しました';
		}
	}
</script>

<svelte:head>
	<title>カラオケ練習</title>
</svelte:head>

<main class="container">
	<header class="head">
		<h1>カラオケ練習</h1>
		<a class="button primary" href="/new">+ 新しい歌詞カード</a>
	</header>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if loading}
		<p class="muted">読み込み中...</p>
	{:else if cards.length === 0}
		<div class="empty">
			<p>まだ歌詞カードがありません。</p>
			<a class="button primary" href="/new">歌詞を取得してカードを作る</a>
		</div>
	{:else}
		<ul class="cards">
			{#each cards as card (card.id)}
				<li>
					<a class="main" href={`/cards/${card.id}/edit`}>
						<span class="title">{card.title}</span>
						<span class="meta">
							{#if card.artist}{card.artist} ・ {/if}印 {card.annotations.length}個 ・ 更新 {formatDate(card.updatedAt)}
						</span>
					</a>
					<div class="ops">
						<a class="button ghost" href={`/cards/${card.id}`}>表示・書き出し</a>
						<button type="button" class="small" onclick={() => handleDuplicate(card)}>複製</button>
						<button type="button" class="small danger-outline" onclick={() => handleDelete(card)}>削除</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</main>

<style>
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 16px;
	}
	.head h1 {
		margin: 0;
		font-size: 24px;
	}
	.cards {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	.cards li {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border: 1px solid var(--c-border);
		border-radius: 8px;
	}
	.cards li:hover {
		border-color: #9fb3c8;
		background: var(--c-surface);
	}
	.main {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-decoration: none;
		color: inherit;
	}
	.title {
		font-size: 17px;
		font-weight: 600;
	}
	.meta {
		font-size: 12px;
		color: var(--c-muted);
	}
	.ops {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
		justify-content: flex-end;
	}
	.empty {
		padding: 32px;
		text-align: center;
		border: 1px dashed var(--c-border);
		border-radius: 8px;
		color: var(--c-muted);
	}
	.muted {
		color: var(--c-muted);
	}
	.error {
		color: var(--c-danger);
	}
	@media (max-width: 560px) {
		.cards li {
			flex-direction: column;
			align-items: stretch;
		}
		.ops {
			justify-content: flex-start;
		}
	}
</style>
