<script lang="ts">
	import type { DynamicsLevel, LyricCard, Token } from '$lib/types';
	import {
		findAccent,
		findExactDynamics,
		findExactRuby,
		removeAccent,
		removeAnnotation,
		removeDynamics,
		setRubyEnabled,
		toggleBreath,
		toggleFalsetto,
		toggleSlur,
		toggleStaccato,
		toggleStrikethrough,
		upsertAccent,
		upsertDynamics,
		upsertRuby
	} from '$lib/annotations';
	import LyricLine from './LyricLine.svelte';

	let { card = $bindable() }: { card: LyricCard } = $props();

	let selectedTokenIds = $state<string[]>([]);
	let anchorId = $state<string | null>(null);
	let rubyInput = $state('');

	const DYNAMICS_LEVELS: DynamicsLevel[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'crescendo', 'decrescendo'];
	let dynamicsLevel = $state<DynamicsLevel>('mf');

	function findLineOf(tokenId: string) {
		return card.lines.find((l) => l.tokens.some((t) => t.id === tokenId));
	}

	function handleTokenClick(token: Token, e: MouseEvent) {
		if (e.shiftKey && anchorId) {
			const line = findLineOf(anchorId);
			if (line && line.tokens.some((t) => t.id === token.id)) {
				const ids = line.tokens.map((t) => t.id);
				const start = ids.indexOf(anchorId);
				const end = ids.indexOf(token.id);
				const [lo, hi] = start < end ? [start, end] : [end, start];
				selectedTokenIds = ids.slice(lo, hi + 1);
				syncRubyInput();
				return;
			}
		}
		anchorId = token.id;
		selectedTokenIds = [token.id];
		syncRubyInput();
	}

	function syncRubyInput() {
		const ruby = findExactRuby(card.annotations, selectedTokenIds);
		rubyInput = ruby?.reading ?? '';
	}

	function selectedText(): string {
		const byId = new Map(card.lines.flatMap((l) => l.tokens).map((t) => [t.id, t.text] as const));
		return selectedTokenIds.map((id) => byId.get(id) ?? '').join('');
	}

	// --- ルビ ---
	function applyRuby() {
		if (selectedTokenIds.length === 0 || !rubyInput.trim()) return;
		card.annotations = upsertRuby(card.annotations, selectedTokenIds, rubyInput.trim());
	}
	function toggleSelectedRubyEnabled() {
		const ruby = findExactRuby(card.annotations, selectedTokenIds);
		if (!ruby) return;
		card.annotations = setRubyEnabled(card.annotations, ruby.id, !ruby.enabled);
	}
	function deleteSelectedRuby() {
		const ruby = findExactRuby(card.annotations, selectedTokenIds);
		if (!ruby) return;
		card.annotations = removeAnnotation(card.annotations, ruby.id);
		rubyInput = '';
	}

	// --- アクセント(単一トークンのみ) ---
	function applyAccent(type: 'rise' | 'fall') {
		if (selectedTokenIds.length !== 1) return;
		card.annotations = upsertAccent(card.annotations, selectedTokenIds[0], type);
	}
	function clearAccent() {
		if (selectedTokenIds.length !== 1) return;
		card.annotations = removeAccent(card.annotations, selectedTokenIds[0]);
	}

	// --- ブレス(単一トークンの直後に挿入、トグル) ---
	function applyBreath() {
		if (selectedTokenIds.length !== 1) return;
		card.annotations = toggleBreath(card.annotations, selectedTokenIds[0]);
	}

	// --- 裏声・打消し線(範囲トグル) ---
	function applyFalsetto() {
		if (selectedTokenIds.length === 0) return;
		card.annotations = toggleFalsetto(card.annotations, selectedTokenIds);
	}
	function applyStrikethrough() {
		if (selectedTokenIds.length === 0) return;
		card.annotations = toggleStrikethrough(card.annotations, selectedTokenIds);
	}

	// --- スラー(2トークン以上、トグル) ---
	function applySlur() {
		if (selectedTokenIds.length < 2) return;
		card.annotations = toggleSlur(card.annotations, selectedTokenIds);
	}

	// --- スタッカート(単一トークン、トグル) ---
	function applyStaccato() {
		if (selectedTokenIds.length !== 1) return;
		card.annotations = toggleStaccato(card.annotations, selectedTokenIds[0]);
	}

	// --- 強弱(範囲) ---
	function applyDynamics() {
		if (selectedTokenIds.length === 0) return;
		card.annotations = upsertDynamics(card.annotations, selectedTokenIds, dynamicsLevel);
	}
	function clearDynamics() {
		if (selectedTokenIds.length === 0) return;
		card.annotations = removeDynamics(card.annotations, selectedTokenIds);
	}

	const selectedRuby = $derived(findExactRuby(card.annotations, selectedTokenIds));
	const selectedDynamics = $derived(findExactDynamics(card.annotations, selectedTokenIds));
</script>

<div class="editor">
	<div class="scroll-area">
		<h2>{card.title}</h2>
		{#if card.artist}<p class="artist">{card.artist}</p>{/if}

		<div class="lines">
			{#each card.lines as line (line.id)}
				<LyricLine {line} annotations={card.annotations} {selectedTokenIds} onTokenClick={handleTokenClick} />
			{/each}
		</div>
	</div>

	<div class="footer">
	<p class="hint">
		クリックでトークンを選択、Shift+クリックで同じ行内の範囲選択。選択中: 「{selectedText()}」({selectedTokenIds.length}件)
	</p>

	<div class="toolbar">
		<section>
			<h3>ルビ</h3>
			<input type="text" bind:value={rubyInput} placeholder="読み" />
			<button type="button" onclick={applyRuby} disabled={selectedTokenIds.length === 0}>追加/上書き</button>
			<button type="button" onclick={toggleSelectedRubyEnabled} disabled={!selectedRuby}>
				{selectedRuby?.enabled === false ? '再有効化' : '無効化'}
			</button>
			<button type="button" onclick={deleteSelectedRuby} disabled={!selectedRuby}>削除</button>
		</section>

		<section>
			<h3>アクセント(1文字選択)</h3>
			<button type="button" onclick={() => applyAccent('rise')} disabled={selectedTokenIds.length !== 1}
				>↗ 上昇</button
			>
			<button type="button" onclick={() => applyAccent('fall')} disabled={selectedTokenIds.length !== 1}
				>↘ 下降</button
			>
			<button type="button" onclick={clearAccent} disabled={selectedTokenIds.length !== 1}>削除</button>
		</section>

		<section>
			<h3>ブレス(1文字選択・直後に挿入)</h3>
			<button type="button" onclick={applyBreath} disabled={selectedTokenIds.length !== 1}>追加/削除切替</button>
		</section>

		<section>
			<h3>裏声</h3>
			<button type="button" onclick={applyFalsetto} disabled={selectedTokenIds.length === 0}>追加/削除切替</button>
		</section>

		<section>
			<h3>強弱</h3>
			<select bind:value={dynamicsLevel}>
				{#each DYNAMICS_LEVELS as level (level)}
					<option value={level}>{level}</option>
				{/each}
			</select>
			<button type="button" onclick={applyDynamics} disabled={selectedTokenIds.length === 0}>設定</button>
			<button type="button" onclick={clearDynamics} disabled={!selectedDynamics}>削除</button>
		</section>

		<section>
			<h3>スラー(2文字以上選択)</h3>
			<button type="button" onclick={applySlur} disabled={selectedTokenIds.length < 2}>追加/削除切替</button>
		</section>

		<section>
			<h3>スタッカート(1文字選択)</h3>
			<button type="button" onclick={applyStaccato} disabled={selectedTokenIds.length !== 1}>追加/削除切替</button>
		</section>

		<section>
			<h3>打消し線</h3>
			<button type="button" onclick={applyStrikethrough} disabled={selectedTokenIds.length === 0}
				>追加/削除切替</button
			>
		</section>
	</div>
	</div>
</div>

<style>
	.editor {
		font-size: 20px;
		height: 100%;
		display: flex;
		flex-direction: column;
		min-height: 0;
	}
	.scroll-area {
		flex: 1 1 auto;
		min-height: 0;
		overflow-y: auto;
		padding-bottom: 8px;
	}
	.footer {
		flex: 0 0 auto;
		border-top: 1px solid #ddd;
		background: #fff;
		padding-top: 8px;
		max-height: 45vh;
		overflow-y: auto;
	}
	.artist {
		color: #666;
		margin-top: -0.5em;
	}
	.lines {
		line-height: 3.2;
	}
	.hint {
		font-size: 12px;
		color: #666;
		margin: 0;
	}
	.toolbar {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
		gap: 12px;
		margin-top: 10px;
		padding-top: 4px;
	}
	.toolbar section {
		border: 1px solid #eee;
		padding: 8px;
		border-radius: 4px;
	}
	.toolbar h3 {
		font-size: 13px;
		margin: 0 0 6px;
	}
	.toolbar input,
	.toolbar select {
		width: 100%;
		margin-bottom: 6px;
	}
	.toolbar button {
		font-size: 12px;
		margin: 2px 2px 0 0;
	}
</style>
