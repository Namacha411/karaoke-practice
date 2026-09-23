<script lang="ts">
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { createLyricCard } from '$lib/tokenize';
	import { saveCard } from '$lib/storage';
	import { normalizeLyricsText } from '$lib/lyricsText';

	let title = $state('');
	let artist = $state('');
	let sourceUrl = $state('');
	let rawText = $state('');
	let stripTimestamps = $state(true);
	let removeAllBlankLines = $state(false);
	let error = $state<string | null>(null);
	let saving = $state(false);

	const lines = $derived(normalizeLyricsText(rawText, { stripTimestamps, removeAllBlankLines }));
	const lyricLineCount = $derived(lines.filter((l) => l !== '').length);

	async function handleSave(e: SubmitEvent) {
		e.preventDefault();
		error = null;
		if (!title.trim()) {
			error = '曲名を入力してください';
			return;
		}
		if (lyricLineCount === 0) {
			error = '歌詞を入力してください';
			return;
		}
		saving = true;
		try {
			const card = createLyricCard({
				title: title.trim(),
				artist: artist.trim(),
				sourceUrl: sourceUrl.trim(),
				lines
			});
			await saveCard(card);
			await goto(resolve('/cards/[id]/edit', { id: card.id }));
		} catch {
			error = 'カードの保存に失敗しました(ブラウザのストレージ設定を確認してください)';
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>新しい歌詞カード | カラオケ練習</title>
</svelte:head>

<main class="container">
	<p><a href={resolve('/')}>&larr; 一覧</a></p>
	<h1>新しい歌詞カード</h1>
	<p class="muted">歌詞を貼り付けるか入力してください。入力した内容はこのブラウザ内にだけ保存されます。</p>

	<form onsubmit={handleSave}>
		<div class="meta">
			<label>
				<span>曲名 <em>必須</em></span>
				<input type="text" bind:value={title} autocomplete="off" />
			</label>
			<label>
				<span>アーティスト</span>
				<input type="text" bind:value={artist} autocomplete="off" />
			</label>
			<label class="wide">
				<span>メモ・参照元URL(任意)</span>
				<input type="text" bind:value={sourceUrl} autocomplete="off" placeholder="https://..." />
			</label>
		</div>

		<div class="editor">
			<label class="text">
				<span>歌詞</span>
				<textarea bind:value={rawText} rows="18" placeholder="ここに歌詞を貼り付け"></textarea>
			</label>
			<div class="preview">
				<span class="preview-head">プレビュー <small>{lyricLineCount}行</small></span>
				<div class="preview-body" aria-live="polite">
					{#each lines as line, i (i)}
						{#if line === ''}
							<p class="blank"></p>
						{:else}
							<p>{line}</p>
						{/if}
					{:else}
						<p class="muted">貼り付けるとここに整形後の歌詞が表示されます</p>
					{/each}
				</div>
			</div>
		</div>

		<fieldset class="options">
			<legend>貼り付けの整形</legend>
			<label><input type="checkbox" bind:checked={stripTimestamps} /> 行頭のタイムスタンプ(0:12 など)を除く</label>
			<label><input type="checkbox" bind:checked={removeAllBlankLines} /> 空行をすべて除く(1行おきに空行がある場合)</label>
		</fieldset>

		{#if error}
			<p class="error">{error}</p>
		{/if}

		<div class="actions">
			<button type="submit" class="primary" disabled={saving}>
				{saving ? '保存中...' : 'カードを作成して編集'}
			</button>
		</div>
	</form>
</main>

<style>
	.container {
		max-width: 960px;
	}
	h1 {
		margin: 8px 0 4px;
		font-size: 24px;
	}
	.muted {
		color: var(--c-muted);
		margin: 0;
	}
	form {
		margin-top: 16px;
		display: flex;
		flex-direction: column;
		gap: 16px;
	}
	label {
		display: flex;
		flex-direction: column;
		gap: 4px;
		font-size: 13px;
		font-weight: 600;
	}
	label em {
		font-style: normal;
		font-weight: normal;
		font-size: 11px;
		color: var(--c-danger);
	}
	.meta {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	.meta .wide {
		grid-column: 1 / -1;
	}
	.meta input {
		font-size: 15px;
	}
	.editor {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
	}
	textarea {
		font: inherit;
		font-size: 15px;
		line-height: 1.6;
		padding: 10px;
		border: 1px solid var(--c-border);
		border-radius: 6px;
		resize: vertical;
		min-height: 320px;
		box-sizing: border-box;
	}
	textarea:focus-visible {
		outline: 2px solid var(--c-primary);
		outline-offset: 1px;
	}
	.preview {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 0;
	}
	.preview-head {
		font-size: 13px;
		font-weight: 600;
	}
	.preview-head small {
		font-weight: normal;
		color: var(--c-muted);
	}
	.preview-body {
		flex: 1;
		min-height: 320px;
		max-height: 60vh;
		overflow-y: auto;
		padding: 10px;
		border: 1px solid var(--c-border);
		border-radius: 6px;
		background: var(--c-surface);
		font-size: 15px;
		box-sizing: border-box;
	}
	.preview-body p {
		margin: 0.2em 0;
		white-space: pre-wrap;
	}
	.blank {
		height: 0.8em;
	}
	.options {
		border: 1px solid var(--c-border);
		border-radius: 6px;
		padding: 8px 12px 10px;
		display: flex;
		flex-wrap: wrap;
		gap: 6px 20px;
	}
	.options legend {
		font-size: 12px;
		color: var(--c-muted);
		padding: 0 4px;
	}
	.options label {
		flex-direction: row;
		align-items: center;
		gap: 6px;
		font-weight: normal;
	}
	.actions {
		display: flex;
		justify-content: flex-end;
	}
	.error {
		color: var(--c-danger);
		margin: 0;
	}
	@media (max-width: 720px) {
		.meta,
		.editor {
			grid-template-columns: 1fr;
		}
		.preview-body {
			min-height: 160px;
		}
	}
</style>
