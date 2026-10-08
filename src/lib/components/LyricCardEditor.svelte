<script lang="ts">
	import { tick } from 'svelte';
	import type { Annotation, DynamicsLevel, LyricCard, TechniqueType, Token } from '$lib/types';
	import {
		clearRangeKindOnTokens,
		dynamicsCovering,
		dynamicsLabel,
		dynamicsName,
		findAccent,
		findExactRuby,
		hasBreathAfter,
		hasStaccato,
		hasTechnique,
		isHairpin,
		isRangeKindCovering,
		removeAnnotation,
		removeAnnotationsOnTokens,
		setDynamicsOnTokens,
		setRubyEnabled,
		setRubyOnTokens,
		TECHNIQUE_TYPES,
		techniqueLabel,
		toggleAccentOnTokens,
		toggleBreath,
		toggleRangeKindOnTokens,
		toggleStaccatoOnTokens,
		toggleTechniqueOnTokens
	} from '$lib/annotations';
	import TechniqueIcon from './TechniqueIcon.svelte';
	import LyricLine from './LyricLine.svelte';

	let { card = $bindable(), onchange }: { card: LyricCard; onchange?: () => void } = $props();

	// --- 選択 -------------------------------------------------------------
	// 選択は「起点(anchor)」と「終点(focus)」で表し、同じ行内の間の文字すべてを選択範囲とする。

	let anchorId = $state<string | null>(null);
	let focusId = $state<string | null>(null);
	let dragging = $state(false);
	let rubyInput = $state('');
	let rubyInputEl = $state<HTMLInputElement | undefined>(undefined);
	let notice = $state<string | null>(null);

	const tokenIndex = $derived.by(() => {
		const map = new Map<string, { token: Token; lineIdx: number; idx: number }>();
		card.lines.forEach((line, lineIdx) => line.tokens.forEach((token, idx) => map.set(token.id, { token, lineIdx, idx })));
		return map;
	});

	const selectedTokenIds = $derived.by(() => {
		if (!anchorId || !focusId) return [];
		const a = tokenIndex.get(anchorId);
		const f = tokenIndex.get(focusId);
		if (!a || !f || a.lineIdx !== f.lineIdx) return anchorId ? [anchorId] : [];
		const [lo, hi] = a.idx < f.idx ? [a.idx, f.idx] : [f.idx, a.idx];
		return card.lines[a.lineIdx].tokens.slice(lo, hi + 1).map((t) => t.id);
	});

	const selectedText = $derived(selectedTokenIds.map((id) => tokenIndex.get(id)?.token.text ?? '').join(''));
	const hasSelection = $derived(selectedTokenIds.length > 0);

	function select(anchor: string | null, focus: string | null = anchor) {
		anchorId = anchor;
		focusId = focus;
		notice = null;
		rubyInput = findExactRuby(card.annotations, selectedTokenIds)?.reading ?? '';
	}

	function sameLine(a: string | null, b: string) {
		return !!a && tokenIndex.get(a)?.lineIdx === tokenIndex.get(b)?.lineIdx;
	}

	function handlePointerDown(token: Token, e: PointerEvent) {
		if (e.shiftKey && sameLine(anchorId, token.id)) {
			select(anchorId, token.id);
		} else {
			select(token.id);
		}
		dragging = true;
	}

	function handlePointerEnter(token: Token) {
		if (dragging && sameLine(anchorId, token.id)) select(anchorId, token.id);
	}

	function handleKeyActivate(token: Token, e: MouseEvent) {
		if (e.shiftKey && sameLine(anchorId, token.id)) select(anchorId, token.id);
		else select(token.id);
	}

	async function focusToken(id: string) {
		await tick();
		document.querySelector<HTMLElement>(`[data-token-id="${CSS.escape(id)}"]`)?.focus();
	}

	function moveHorizontal(delta: 1 | -1, extend: boolean) {
		const cur = focusId ? tokenIndex.get(focusId) : undefined;
		if (!cur) {
			const first = card.lines.find((l) => l.tokens.length > 0)?.tokens[0];
			if (first) {
				select(first.id);
				focusToken(first.id);
			}
			return;
		}
		const line = card.lines[cur.lineIdx];
		let next = line.tokens[cur.idx + delta];
		if (!next && !extend) {
			// 行をまたいで前後の行の端へ移動する
			for (let i = cur.lineIdx + delta; i >= 0 && i < card.lines.length; i += delta) {
				const tokens = card.lines[i].tokens;
				if (tokens.length > 0) {
					next = delta > 0 ? tokens[0] : tokens[tokens.length - 1];
					break;
				}
			}
		}
		if (!next) return;
		if (extend) select(anchorId, next.id);
		else select(next.id);
		focusToken(next.id);
	}

	function moveVertical(delta: 1 | -1) {
		const cur = focusId ? tokenIndex.get(focusId) : undefined;
		if (!cur) return moveHorizontal(1, false);
		for (let i = cur.lineIdx + delta; i >= 0 && i < card.lines.length; i += delta) {
			const tokens = card.lines[i].tokens;
			if (tokens.length > 0) {
				const next = tokens[Math.min(cur.idx, tokens.length - 1)];
				select(next.id);
				focusToken(next.id);
				return;
			}
		}
	}

	// --- 履歴(元に戻す/やり直す) -------------------------------------------
	// IndexedDB保存と同様、$stateプロキシはstructuredCloneできないため$state.snapshotで退避する

	let past = $state.raw<Annotation[][]>([]);
	let future = $state.raw<Annotation[][]>([]);
	const HISTORY_LIMIT = 200;

	function commit(next: Annotation[]) {
		if (next === card.annotations) return;
		past = [...past.slice(-(HISTORY_LIMIT - 1)), $state.snapshot(card.annotations)];
		future = [];
		card.annotations = next;
		onchange?.();
	}

	function undo() {
		const prev = past.at(-1);
		if (!prev) return;
		future = [...future, $state.snapshot(card.annotations)];
		past = past.slice(0, -1);
		card.annotations = prev;
		notice = '元に戻しました';
		onchange?.();
	}

	function redo() {
		const next = future.at(-1);
		if (!next) return;
		past = [...past, $state.snapshot(card.annotations)];
		future = future.slice(0, -1);
		card.annotations = next;
		notice = 'やり直しました';
		onchange?.();
	}

	// --- 印の付け外し -------------------------------------------------------

	type ToolId =
		| 'accent-rise'
		| 'accent-fall'
		| 'staccato'
		| 'breath'
		| 'falsetto'
		| 'slur'
		| 'strikethrough'
		| TechniqueType;

	interface Tool {
		id: ToolId;
		/** 歌唱技法の印の場合、その種類(アイコンの描画に使う) */
		technique?: TechniqueType;
		label: string;
		key: string;
		/** 付け外しができない理由(できる場合はnull) */
		blocked: string | null;
		active: boolean;
		run: () => void;
	}

	const tools = $derived.by((): Tool[] => {
		const ids = selectedTokenIds;
		const a = card.annotations;
		const none = hasSelection ? null : '先に歌詞の文字を選択してください';
		const last = ids.at(-1);
		return [
			{
				id: 'accent-rise',
				label: '上昇アクセント',
				key: 'U',
				blocked: none,
				active: hasSelection && ids.every((id) => findAccent(a, id)?.type === 'rise'),
				run: () => commit(toggleAccentOnTokens(card.annotations, ids, 'rise'))
			},
			{
				id: 'accent-fall',
				label: '下降アクセント',
				key: 'D',
				blocked: none,
				active: hasSelection && ids.every((id) => findAccent(a, id)?.type === 'fall'),
				run: () => commit(toggleAccentOnTokens(card.annotations, ids, 'fall'))
			},
			{
				id: 'staccato',
				label: 'スタッカート',
				key: 'T',
				blocked: none,
				active: hasSelection && ids.every((id) => hasStaccato(a, id)),
				run: () => commit(toggleStaccatoOnTokens(card.annotations, ids))
			},
			{
				id: 'breath',
				label: 'ブレス(直後)',
				key: 'B',
				blocked: none,
				active: !!last && hasBreathAfter(a, last),
				run: () => last && commit(toggleBreath(card.annotations, last))
			},
			{
				id: 'falsetto',
				label: '裏声',
				key: 'F',
				blocked: none,
				active: isRangeKindCovering(a, 'falsetto', ids),
				run: () => commit(toggleRangeKindOnTokens(card.annotations, 'falsetto', ids))
			},
			{
				id: 'slur',
				label: 'スラー',
				key: 'S',
				blocked: none ?? (ids.length < 2 ? 'スラーは2文字以上を選択してください' : null),
				active: isRangeKindCovering(a, 'slur', ids),
				run: () => commit(toggleRangeKindOnTokens(card.annotations, 'slur', ids))
			},
			{
				id: 'strikethrough',
				label: '打消し線',
				key: 'X',
				blocked: none,
				active: isRangeKindCovering(a, 'strikethrough', ids),
				run: () => commit(toggleRangeKindOnTokens(card.annotations, 'strikethrough', ids))
			}
		];
	});

	// --- 歌唱技法(カラオケの採点項目) ---
	const TECHNIQUE_KEYS: Record<TechniqueType, string> = { shakuri: 'J', kobushi: 'K', vibrato: 'V', fall: 'L' };

	const techniqueTools = $derived.by((): Tool[] => {
		const ids = selectedTokenIds;
		return TECHNIQUE_TYPES.map((type) => ({
			id: type,
			technique: type,
			label: techniqueLabel(type),
			key: TECHNIQUE_KEYS[type],
			blocked: hasSelection ? null : '先に歌詞の文字を選択してください',
			active: hasSelection && ids.every((id) => hasTechnique(card.annotations, id, type)),
			run: () => commit(toggleTechniqueOnTokens(card.annotations, ids, type))
		}));
	});

	function runTool(tool: Tool) {
		if (tool.blocked) {
			notice = tool.blocked;
			return;
		}
		notice = null;
		tool.run();
	}

	// --- 強弱 ---
	const DYNAMICS_LEVELS: DynamicsLevel[] = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'crescendo', 'decrescendo'];

	const selectedDynamicsLevel = $derived.by(() => {
		if (!hasSelection) return null;
		const levels = new Set(selectedTokenIds.map((id) => dynamicsCovering(card.annotations, id)?.level ?? null));
		return levels.size === 1 ? [...levels][0] : null;
	});
	const selectionHasDynamics = $derived(selectedTokenIds.some((id) => dynamicsCovering(card.annotations, id)));

	function applyDynamics(level: DynamicsLevel) {
		if (!hasSelection) {
			notice = '先に歌詞の文字を選択してください';
			return;
		}
		if (selectedDynamicsLevel === level) {
			commit(clearRangeKindOnTokens(card.annotations, 'dynamics', selectedTokenIds));
		} else {
			commit(setDynamicsOnTokens(card.annotations, selectedTokenIds, level));
		}
	}

	// --- ルビ ---
	const selectedRuby = $derived(findExactRuby(card.annotations, selectedTokenIds));

	function applyRuby() {
		const reading = rubyInput.trim();
		if (!hasSelection) {
			notice = '先に歌詞の文字を選択してください';
			return;
		}
		if (!reading) {
			notice = '読みを入力してください';
			return;
		}
		if (selectedRuby?.reading === reading && selectedRuby.enabled) return;
		commit(setRubyOnTokens(card.annotations, selectedTokenIds, reading));
	}

	function toggleRubyEnabled() {
		if (!selectedRuby) return;
		commit(setRubyEnabled(card.annotations, selectedRuby.id, !selectedRuby.enabled));
	}

	function deleteRuby() {
		if (!selectedRuby) return;
		commit(removeAnnotation(card.annotations, selectedRuby.id));
		rubyInput = '';
	}

	function clearAllOnSelection() {
		if (!hasSelection) return;
		const next = removeAnnotationsOnTokens(card.annotations, selectedTokenIds);
		if (next.length === card.annotations.length && next.every((a, i) => a === card.annotations[i])) {
			notice = '選択範囲に印はありません';
			return;
		}
		commit(next);
		rubyInput = '';
	}

	// --- キーボード操作 ------------------------------------------------------

	const TOOL_KEYS: Record<string, ToolId> = {
		u: 'accent-rise',
		d: 'accent-fall',
		t: 'staccato',
		b: 'breath',
		f: 'falsetto',
		s: 'slur',
		x: 'strikethrough',
		j: 'shakuri',
		k: 'kobushi',
		v: 'vibrato',
		l: 'fall'
	};

	function isTypingTarget(target: EventTarget | null) {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		// IME変換中のキー入力(ルビの日本語入力など)は横取りしない
		if (e.isComposing || e.key === 'Process') return;
		if (isTypingTarget(e.target)) return;

		const mod = e.ctrlKey || e.metaKey;
		const key = e.key.toLowerCase();
		if (mod && key === 'z') {
			e.preventDefault();
			if (e.shiftKey) redo();
			else undo();
			return;
		}
		if (mod && key === 'y') {
			e.preventDefault();
			redo();
			return;
		}
		if (mod || e.altKey) return;

		switch (e.key) {
			case 'Escape':
				select(null);
				(document.activeElement as HTMLElement | null)?.blur?.();
				return;
			case 'ArrowLeft':
			case 'ArrowRight':
				e.preventDefault();
				moveHorizontal(e.key === 'ArrowRight' ? 1 : -1, e.shiftKey);
				return;
			case 'ArrowUp':
			case 'ArrowDown':
				e.preventDefault();
				moveVertical(e.key === 'ArrowDown' ? 1 : -1);
				return;
			case 'Delete':
			case 'Backspace':
				e.preventDefault();
				clearAllOnSelection();
				return;
		}

		if (key === 'r') {
			e.preventDefault();
			rubyInputEl?.focus();
			rubyInputEl?.select();
			return;
		}
		const toolId = TOOL_KEYS[key];
		if (toolId) {
			e.preventDefault();
			const tool = [...tools, ...techniqueTools].find((t) => t.id === toolId);
			if (tool) runTool(tool);
			return;
		}
		const num = Number(e.key);
		if (Number.isInteger(num) && num >= 1 && num <= DYNAMICS_LEVELS.length) {
			e.preventDefault();
			applyDynamics(DYNAMICS_LEVELS[num - 1]);
		}
	}

	function handleRubyKeydown(e: KeyboardEvent) {
		if (e.isComposing || e.key === 'Process') return;
		if (e.key === 'Enter') {
			e.preventDefault();
			applyRuby();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			rubyInputEl?.blur();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onpointerup={() => (dragging = false)} onpointercancel={() => (dragging = false)} />

{#snippet toolButton(tool: Tool)}
	<button
		type="button"
		class="tool"
		class:active={tool.active}
		class:blocked={!!tool.blocked}
		aria-pressed={tool.active}
		aria-disabled={!!tool.blocked}
		title={tool.blocked ?? `${tool.label} (${tool.key})`}
		onclick={() => runTool(tool)}
	>
		<span class="glyph glyph-{tool.technique ? 'technique' : tool.id}" aria-hidden="true">
			{#if tool.technique}<TechniqueIcon type={tool.technique} />{:else if tool.id === 'accent-rise'}↗{:else if tool.id === 'accent-fall'}↘{:else if tool.id === 'staccato'}●{:else if tool.id === 'breath'}V{:else if tool.id === 'falsetto'}〰{:else if tool.id === 'slur'}◡{:else}あ{/if}
		</span>
		<span class="tool-label">{tool.label}</span>
		<kbd>{tool.key}</kbd>
	</button>
{/snippet}

<div class="editor">
	<div class="lyrics-pane">
		<div class="lyrics">
			<h2>{card.title}</h2>
			{#if card.artist}<p class="artist">{card.artist}</p>{/if}

			<div class="lines" role="group" aria-label="歌詞(文字をクリック・ドラッグで選択)">
				{#each card.lines as line (line.id)}
					<LyricLine
						{line}
						annotations={card.annotations}
						{selectedTokenIds}
						onTokenPointerDown={handlePointerDown}
						onTokenPointerEnter={handlePointerEnter}
						onTokenKeyActivate={handleKeyActivate}
					/>
				{/each}
			</div>
		</div>
	</div>

	<aside class="panel" aria-label="印の編集">
		<div class="selection" class:empty={!hasSelection}>
			{#if hasSelection}
				<div class="selection-text">
					<span class="label">選択中</span>
					<strong>「{selectedText}」</strong>
					<span class="count">{selectedTokenIds.length}文字</span>
				</div>
				<button type="button" class="ghost small" onclick={() => select(null)} title="選択解除 (Esc)">解除</button>
			{:else}
				<p>歌詞の文字を<strong>クリック</strong>、または<strong>ドラッグ</strong>して選択</p>
			{/if}
		</div>
		<p class="notice" role="status" aria-live="polite">{notice ?? ''}</p>

		<div class="history">
			<button type="button" class="small" onclick={undo} disabled={past.length === 0} title="元に戻す (Ctrl+Z)">
				↶ 元に戻す
			</button>
			<button type="button" class="small" onclick={redo} disabled={future.length === 0} title="やり直す (Ctrl+Y)">
				↷ やり直す
			</button>
		</div>

		<section>
			<h3>印 <span class="sub">押すたびに付ける/外す</span></h3>
			<div class="tools">
				{#each tools as tool (tool.id)}
					{@render toolButton(tool)}
				{/each}
			</div>
		</section>

		<section>
			<h3>歌唱技法 <span class="sub">カラオケの採点項目</span></h3>
			<div class="tools">
				{#each techniqueTools as tool (tool.id)}
					{@render toolButton(tool)}
				{/each}
			</div>
		</section>

		<section>
			<h3>強弱 <span class="sub">同じものを押すと外す</span></h3>
			<div class="dynamics">
				{#each DYNAMICS_LEVELS as level, i (level)}
					<button
						type="button"
						class="dyn"
						class:active={selectedDynamicsLevel === level}
						class:wide={isHairpin(level)}
						aria-pressed={selectedDynamicsLevel === level}
						aria-disabled={!hasSelection}
						aria-label={dynamicsName(level)}
						title={`${dynamicsName(level)} (${i + 1})`}
						onclick={() => applyDynamics(level)}
					>
						{#if isHairpin(level)}
							<svg class="hairpin" viewBox="0 0 40 12" aria-hidden="true">
								<path d={level === 'crescendo' ? 'M38 1 L2 6 L38 11' : 'M2 1 L38 6 L2 11'} />
							</svg>
						{:else}
							{dynamicsLabel(level)}
						{/if}
						<kbd>{i + 1}</kbd>
					</button>
				{/each}
			</div>
			{#if selectionHasDynamics}
				<button
					type="button"
					class="ghost small"
					onclick={() => commit(clearRangeKindOnTokens(card.annotations, 'dynamics', selectedTokenIds))}
				>
					選択範囲の強弱を外す
				</button>
			{/if}
		</section>

		<section>
			<h3>ルビ <span class="sub">R で入力欄へ、Enter で確定</span></h3>
			<div class="ruby-row">
				<input
					type="text"
					bind:this={rubyInputEl}
					bind:value={rubyInput}
					onkeydown={handleRubyKeydown}
					placeholder={hasSelection ? '読みを入力' : '文字を選択してから入力'}
					aria-label="ルビ(読み)"
				/>
				<button type="button" class="primary" onclick={applyRuby}>
					{selectedRuby ? '更新' : '付ける'}
				</button>
			</div>
			{#if selectedRuby}
				<div class="ruby-actions">
					<button type="button" class="small" onclick={toggleRubyEnabled}>
						{selectedRuby.enabled ? '一時的に隠す' : '再表示する'}
					</button>
					<button type="button" class="small ghost" onclick={deleteRuby}>ルビを削除</button>
				</div>
				{#if !selectedRuby.enabled}
					<p class="sub">隠したルビは編集画面にだけ取り消し線付きで表示され、印刷・書き出しには出ません。</p>
				{/if}
			{/if}
		</section>

		<button type="button" class="danger-outline" onclick={clearAllOnSelection} disabled={!hasSelection}>
			選択範囲の印をすべて外す <kbd>Del</kbd>
		</button>

		<details class="shortcuts">
			<summary>キーボード操作</summary>
			<dl>
				<dt>クリック / ドラッグ</dt>
				<dd>文字を選択(ドラッグ・Shift+クリックで同じ行内の範囲)</dd>
				<dt>← →</dt>
				<dd>前後の文字へ移動(Shift で範囲を伸ばす)</dd>
				<dt>↑ ↓</dt>
				<dd>前後の行へ移動</dd>
				<dt>U / D</dt>
				<dd>アクセント 上昇 / 下降</dd>
				<dt>T / B</dt>
				<dd>スタッカート / ブレス</dd>
				<dt>F / S / X</dt>
				<dd>裏声 / スラー / 打消し線</dd>
				<dt>J / K / V / L</dt>
				<dd>しゃくり / こぶし / ビブラート / フォール</dd>
				<dt>1〜8</dt>
				<dd>強弱(pp, p, mp, mf, f, ff, &lt; クレッシェンド, &gt; デクレッシェンド)</dd>
				<dt>R</dt>
				<dd>ルビ入力欄へ</dd>
				<dt>Del</dt>
				<dd>選択範囲の印をすべて外す</dd>
				<dt>Ctrl+Z / Ctrl+Y</dt>
				<dd>元に戻す / やり直す</dd>
				<dt>Esc</dt>
				<dd>選択解除</dd>
			</dl>
		</details>
	</aside>
</div>

<style>
	.editor {
		height: 100%;
		min-height: 0;
		display: grid;
		grid-template-columns: minmax(0, 1fr) 360px;
	}
	.lyrics-pane {
		min-height: 0;
		overflow-y: auto;
		padding: 16px 24px 48px;
	}
	.lyrics {
		max-width: 760px;
		margin: 0 auto;
	}
	.lyrics h2 {
		margin: 8px 0 0;
	}
	.artist {
		color: var(--c-muted);
		margin: 4px 0 16px;
	}
	.lines {
		font-size: 24px;
	}

	.panel {
		min-height: 0;
		overflow-y: auto;
		border-left: 1px solid var(--c-border);
		background: var(--c-surface);
		padding: 12px 14px 24px;
		display: flex;
		flex-direction: column;
		gap: 12px;
	}
	.selection {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 10px 12px;
		border-radius: 8px;
		background: #e3f0ff;
		border: 1px solid #90c2ff;
		min-height: 44px;
		box-sizing: border-box;
	}
	.selection.empty {
		background: #fff;
		border-style: dashed;
		border-color: var(--c-border);
		color: var(--c-muted);
	}
	.selection p {
		margin: 0;
		font-size: 13px;
	}
	.selection-text {
		min-width: 0;
		display: flex;
		align-items: baseline;
		flex-wrap: wrap;
		gap: 4px;
	}
	.selection-text strong {
		font-size: 18px;
		word-break: break-all;
	}
	.selection .label,
	.selection .count {
		font-size: 12px;
		color: var(--c-muted);
	}
	.notice {
		margin: -6px 0 0;
		min-height: 1.2em;
		font-size: 12px;
		color: #b45309;
	}
	.history {
		display: flex;
		gap: 6px;
	}
	.history button {
		flex: 1;
	}
	section {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}
	h3 {
		margin: 0;
		font-size: 13px;
		display: flex;
		align-items: baseline;
		gap: 8px;
	}
	.sub {
		font-size: 11px;
		font-weight: normal;
		color: var(--c-muted);
		margin: 0;
	}

	.tools {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 6px;
	}
	.tool {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px;
		text-align: left;
	}
	.tool-label {
		flex: 1;
		font-size: 13px;
		white-space: nowrap;
	}
	.glyph {
		width: 22px;
		text-align: center;
		font-size: 18px;
		font-weight: bold;
		line-height: 1;
	}
	.glyph-accent-rise,
	.glyph-accent-fall {
		color: #d32f2f;
	}
	.glyph-staccato {
		color: #2e7d32;
		font-size: 11px;
	}
	.glyph-breath {
		color: #00838f;
	}
	.glyph-falsetto {
		color: #8e24aa;
	}
	.glyph-slur {
		color: #ef6c00;
	}
	.glyph-technique {
		display: inline-flex;
		justify-content: center;
	}
	.glyph-strikethrough {
		color: #8a8a8a;
		text-decoration: line-through 2px #37474f;
	}
	.tool.active,
	.dyn.active {
		background: #1565c0;
		border-color: #0d47a1;
		color: #fff;
	}
	.tool.active .glyph {
		color: #fff;
		--technique-color: #fff;
	}
	.tool.active kbd,
	.dyn.active kbd {
		background: rgba(255, 255, 255, 0.2);
		color: #fff;
		border-color: transparent;
	}
	.tool.blocked,
	.dyn[aria-disabled='true'] {
		opacity: 0.45;
	}

	.dynamics {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: 4px;
	}
	.dyn {
		padding: 6px 2px;
		font-family: Georgia, 'Times New Roman', serif;
		font-style: italic;
		font-weight: bold;
		font-size: 14px;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2px;
	}
	.dyn.wide {
		grid-column: span 3;
		flex-direction: row;
		justify-content: center;
		gap: 6px;
	}
	.dyn .hairpin {
		width: 40px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-width: 1.6;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.dyn kbd {
		font-style: normal;
		font-weight: normal;
	}

	.ruby-row {
		display: flex;
		gap: 6px;
	}
	.ruby-row input {
		flex: 1;
		min-width: 0;
		font-size: 16px;
	}
	.ruby-actions {
		display: flex;
		gap: 6px;
	}

	kbd {
		font-family: ui-monospace, monospace;
		font-size: 10px;
		padding: 1px 4px;
		border: 1px solid var(--c-border);
		border-radius: 3px;
		background: #f3f4f6;
		color: var(--c-muted);
	}

	.shortcuts summary {
		cursor: pointer;
		font-size: 13px;
		color: var(--c-muted);
	}
	.shortcuts dl {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 4px 10px;
		font-size: 12px;
		margin: 8px 0 0;
	}
	.shortcuts dt {
		font-family: ui-monospace, monospace;
		white-space: nowrap;
	}
	.shortcuts dd {
		margin: 0;
		color: var(--c-muted);
	}

	/* 狭い画面では歌詞の下にパネルを置く */
	@media (max-width: 900px) {
		.editor {
			grid-template-columns: minmax(0, 1fr);
			grid-template-rows: minmax(0, 1fr) auto;
		}
		.lyrics-pane {
			padding: 12px 12px 24px;
		}
		.panel {
			border-left: none;
			border-top: 1px solid var(--c-border);
			max-height: 42dvh;
		}
		.tools {
			grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		}
		.shortcuts {
			display: none;
		}
	}
</style>
