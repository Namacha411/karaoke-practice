<script lang="ts">
	import { goto } from '$app/navigation';
	import { createLyricCard } from '$lib/tokenize';
	import { saveCard } from '$lib/storage';

	interface FetchedLyrics {
		id: string;
		title: string;
		artist: string;
		lines: string[];
		sourceUrl: string;
	}

	let urlInput = $state('');
	let loading = $state(false);
	let error = $state<string | null>(null);
	let preview = $state<FetchedLyrics | null>(null);
	let saving = $state(false);

	async function handleFetch(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		preview = null;
		if (!urlInput.trim()) {
			error = 'petitlyricsのURL、またはIDを入力してください';
			return;
		}
		loading = true;
		try {
			const res = await fetch('/api/fetch-lyrics', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: urlInput })
			});
			const body = await res.json();
			if (!res.ok) {
				error = body.error ?? '取得に失敗しました';
				return;
			}
			preview = body as FetchedLyrics;
		} catch {
			error = '通信エラーが発生しました';
		} finally {
			loading = false;
		}
	}

	async function handleSave() {
		if (!preview) return;
		saving = true;
		error = null;
		try {
			const card = createLyricCard({
				title: preview.title,
				artist: preview.artist,
				sourceUrl: preview.sourceUrl,
				lines: preview.lines
			});
			await saveCard(card);
			await goto(`/cards/${card.id}/edit`);
		} catch {
			error = 'カードの保存に失敗しました(ブラウザのストレージ設定を確認してください)';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>歌詞を取得 | カラオケ練習</title>
</svelte:head>

<main class="container">
	<p><a href="/">&larr; 一覧</a></p>
	<h1>歌詞を取得</h1>
	<p class="muted">petitlyrics.comの歌詞ページURL、またはID(例: 4289424)を入力してください。</p>

	<form onsubmit={handleFetch}>
		<input
			type="text"
			bind:value={urlInput}
			placeholder="https://petitlyrics.com/lyrics/xxxxxxx"
			aria-label="petitlyrics URL または ID"
		/>
		<button type="submit" class="primary" disabled={loading}>{loading ? '取得中...' : '取得'}</button>
	</form>

	{#if error}
		<p class="error">{error}</p>
	{/if}

	{#if preview}
		<section class="preview">
			<div class="preview-head">
				<div>
					<h2>{preview.title}</h2>
					{#if preview.artist}<p class="muted">{preview.artist}</p>{/if}
				</div>
				<button class="primary" onclick={handleSave} disabled={saving}>
					{saving ? '保存中...' : 'カードとして保存して編集'}
				</button>
			</div>
			<div class="lines">
				{#each preview.lines as line, i (i)}
					{#if line === ''}
						<p class="blank"></p>
					{:else}
						<p>{line}</p>
					{/if}
				{/each}
			</div>
		</section>
	{/if}
</main>

<style>
	h1 {
		margin: 8px 0 4px;
		font-size: 24px;
	}
	form {
		display: flex;
		gap: 8px;
		margin-top: 12px;
	}
	form input {
		flex: 1;
		min-width: 0;
		font-size: 16px;
	}
	.muted {
		color: var(--c-muted);
		margin: 0;
	}
	.error {
		color: var(--c-danger);
	}
	.preview {
		margin-top: 24px;
		border: 1px solid var(--c-border);
		border-radius: 8px;
		overflow: hidden;
	}
	.preview-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 12px;
		padding: 12px 16px;
		background: var(--c-surface);
		border-bottom: 1px solid var(--c-border);
	}
	.preview-head h2 {
		margin: 0;
		font-size: 18px;
	}
	.lines {
		padding: 12px 16px;
		max-height: 60vh;
		overflow-y: auto;
	}
	.lines p {
		margin: 0.3em 0;
	}
	.blank {
		height: 0.6em;
	}
</style>
