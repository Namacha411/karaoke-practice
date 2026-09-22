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

<h1>カラオケ練習アプリ</h1>
<p><a href="/new">+ 新しい歌詞カードを作成</a></p>

{#if error}
	<p class="error">{error}</p>
{/if}

{#if loading}
	<p>読み込み中...</p>
{:else if cards.length === 0}
	<p>まだ歌詞カードがありません。「新しい歌詞カードを作成」から始めてください。</p>
{:else}
	<ul class="cards">
		{#each cards as card (card.id)}
			<li>
				<a href={`/cards/${card.id}/edit`}>{card.title}</a>
				{#if card.artist}<span class="artist"> / {card.artist}</span>{/if}
				<button type="button" onclick={() => handleDuplicate(card)}>複製</button>
				<button type="button" onclick={() => handleDelete(card)}>削除</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.cards {
		list-style: none;
		padding: 0;
	}
	.cards li {
		padding: 8px 0;
		border-bottom: 1px solid #eee;
	}
	.artist {
		color: #666;
	}
	.cards button {
		margin-left: 8px;
		font-size: 12px;
	}
	.error {
		color: #c00;
	}
</style>
