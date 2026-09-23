<script lang="ts">
	import type { Annotation, Line, Token } from '$lib/types';
	import {
		buildLineRenderItems,
		dynamicsCovering,
		dynamicsLabel,
		dynamicsStartingAt,
		findAccent,
		hasBreathAfter,
		hasFalsetto,
		hasStaccato,
		hasStrikethrough,
		slurPositionOf
	} from '$lib/annotations';

	// 各文字は「ルビ段 / 上の印段(アクセント・スタッカート) / 文字 / 波線段(裏声) / 弧段(スラー)」の
	// 固定高さの段で構成する。印ごとに専用の段を持たせることで、印同士やルビと重ならないようにしている。
	// 疑似要素や<ruby>ではなく実要素で描くのは、印刷(PDF)とhtml-to-image(PNG)で同じ見た目にするため。

	let {
		line,
		annotations,
		selectedTokenIds = [],
		onTokenPointerDown,
		onTokenPointerEnter,
		onTokenKeyActivate
	}: {
		line: Line;
		annotations: Annotation[];
		selectedTokenIds?: string[];
		/** 指定すると編集モードになり、各文字がボタンとして描画される */
		onTokenPointerDown?: (token: Token, e: PointerEvent) => void;
		onTokenPointerEnter?: (token: Token, e: PointerEvent) => void;
		/** キーボード(Enter/Space)で文字ボタンが押されたとき */
		onTokenKeyActivate?: (token: Token, e: MouseEvent) => void;
	} = $props();

	const editable = $derived(!!onTokenPointerDown);
	const items = $derived(buildLineRenderItems(line, annotations));

	function cellClasses(token: Token) {
		const slur = slurPositionOf(annotations, token.id);
		return {
			cell: true,
			selected: selectedTokenIds.includes(token.id),
			strike: hasStrikethrough(annotations, token.id),
			dyn: !!dynamicsCovering(annotations, token.id),
			'slur-start': slur === 'start' || slur === 'solo',
			'slur-mid': slur === 'mid',
			'slur-end': slur === 'end' || slur === 'solo'
		};
	}
</script>

{#snippet cellContent(token: Token)}
	{@const accent = findAccent(annotations, token.id)}
	<span class="marks" aria-hidden="true">
		{#if accent}
			<svg class="accent" viewBox="0 0 12 12" aria-hidden="true">
				{#if accent.type === 'rise'}
					<path d="M2 10 L10 2 M4.5 2 H10 V7.5" />
				{:else}
					<path d="M2 2 L10 10 M10 4.5 V10 H4.5" />
				{/if}
			</svg>
		{/if}
		{#if hasStaccato(annotations, token.id)}
			<span class="staccato"></span>
		{/if}
	</span>
	<span class="char">{token.text}</span>
	<span class="wave" class:on={hasFalsetto(annotations, token.id)}></span>
	<span class="slur"></span>
{/snippet}

{#snippet cell(token: Token)}
	{@const dyn = dynamicsStartingAt(annotations, token.id)}
	{#if dyn}
		<span class="dyn-badge">{dynamicsLabel(dyn.level)}</span>
	{/if}
	{#if editable}
		<button
			type="button"
			class={cellClasses(token)}
			data-token-id={token.id}
			aria-pressed={selectedTokenIds.includes(token.id)}
			onpointerdown={(e) => {
				if (e.button !== 0) return;
				e.preventDefault();
				onTokenPointerDown?.(token, e);
			}}
			onpointerenter={(e) => onTokenPointerEnter?.(token, e)}
			onclick={(e) => {
				// マウス操作はpointerdownで処理済み。detail===0はキーボードによるクリック
				if (e.detail === 0) onTokenKeyActivate?.(token, e);
			}}
		>
			{@render cellContent(token)}
		</button>
	{:else}
		<span class={cellClasses(token)}>{@render cellContent(token)}</span>
	{/if}
{/snippet}

{#if line.tokens.length === 0}
	<div class="line blank"></div>
{:else}
	<div class="line" class:editable>
		{#each items as item (item.tokens[0].id)}
			{@const ruby = item.type === 'ruby' ? item.ruby : undefined}
			<span class="group">
				<span class="rt" class:rt-disabled={ruby && !ruby.enabled}>
					{#if ruby && (ruby.enabled || editable)}{ruby.reading}{/if}
				</span>
				<span class="bases">
					{#each item.tokens as token (token.id)}
						{@render cell(token)}
					{/each}
				</span>
			</span>
			{#if hasBreathAfter(annotations, item.tokens[item.tokens.length - 1].id)}
				<span class="breath" aria-label="ブレス">
					<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 2 L6 10 L10 2" /></svg>
				</span>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.line {
		--c-accent: #d32f2f;
		--c-staccato: #2e7d32;
		--c-breath: #00838f;
		--c-falsetto: #8e24aa;
		--c-slur: #ef6c00;
		--c-dyn: #283593;
		--c-dyn-bg: #fff3c4;
		--c-sel-bg: #bfdcff;
		--c-sel-line: #1565c0;
		--rt-h: 0.7em;
		--marks-h: 0.75em;
		--wave-h: 0.32em;
		--slur-h: 0.42em;
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		row-gap: 0.35em;
		margin-bottom: 0.35em;
		line-height: 1.25;
		break-inside: avoid;
	}
	/* 背景色で描く印(強弱の網掛け・スタッカートの点・裏声の波線)を印刷でも消さない */
	.line,
	.line :global(*) {
		print-color-adjust: exact;
		-webkit-print-color-adjust: exact;
	}
	.line.blank {
		height: 1.2em;
	}

	.group {
		display: inline-flex;
		flex-direction: column;
		align-items: stretch;
	}
	/* font-sizeを変える要素ではemの基準が変わるため、段の高さを自身の文字サイズ換算で指定する */
	.rt {
		font-size: 0.5em;
		height: 1.4em; /* = --rt-h */
		line-height: 1.4em;
		text-align: center;
		white-space: nowrap;
		color: #333;
		letter-spacing: 0.02em;
	}
	.rt-disabled {
		color: #9e9e9e;
		text-decoration: line-through;
	}
	.bases {
		display: flex;
		align-items: flex-end;
		/* ルビが親文字より長いときも、親文字をルビの中央に置く */
		justify-content: center;
	}

	.cell {
		display: inline-flex;
		flex-direction: column;
		align-items: stretch;
		font: inherit;
		color: inherit;
		border: none;
		background: none;
		margin: 0;
		padding: 0 0.05em;
		border-radius: 0;
	}
	.marks {
		height: var(--marks-h);
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.05em;
	}
	.accent {
		width: 0.62em;
		height: 0.62em;
		fill: none;
		stroke: var(--c-accent);
		stroke-width: 2.2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.staccato {
		width: 0.24em;
		height: 0.24em;
		border-radius: 50%;
		background: var(--c-staccato);
	}
	.char {
		text-align: center;
		min-width: 1em;
	}
	.wave {
		height: var(--wave-h);
	}
	.wave.on {
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 3 Q2.5 0 5 3 T10 3' fill='none' stroke='%238e24aa' stroke-width='1.6'/%3E%3C/svg%3E");
		background-repeat: repeat-x;
		background-position: left center;
		background-size: 0.5em 0.3em;
	}
	.slur {
		height: var(--slur-h);
		box-sizing: border-box;
	}
	.slur-start .slur,
	.slur-mid .slur,
	.slur-end .slur {
		border-bottom: 0.12em solid var(--c-slur);
	}
	.slur-start .slur {
		margin-left: 35%;
		border-left: 0.12em solid var(--c-slur);
		border-bottom-left-radius: 70% 100%;
	}
	.slur-end .slur {
		margin-right: 35%;
		border-right: 0.12em solid var(--c-slur);
		border-bottom-right-radius: 70% 100%;
	}

	.strike .char {
		color: #8a8a8a;
		text-decoration: line-through;
		text-decoration-color: #37474f;
		text-decoration-thickness: 0.12em;
	}
	.dyn .char {
		background: var(--c-dyn-bg);
	}
	.dyn-badge {
		align-self: flex-end;
		/* 文字段の縦中央に来るよう、波線段+弧段(と余白)の分だけ持ち上げる(0.6em換算) */
		margin: 0 0.2em 1.6em;
		padding: 0.05em 0.3em;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 0.6em;
		font-weight: bold;
		font-style: italic;
		line-height: 1.2;
		color: #fff;
		background: var(--c-dyn);
		border-radius: 0.3em;
		white-space: nowrap;
	}

	.breath {
		display: inline-flex;
		align-self: stretch;
		align-items: flex-start;
		padding-top: var(--rt-h);
		width: 0.6em;
		justify-content: center;
	}
	.breath svg {
		width: 0.55em;
		height: var(--marks-h);
		fill: none;
		stroke: var(--c-breath);
		stroke-width: 2.4;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	/* --- 編集モード --- */
	/* 全体のbuttonスタイル(ホバー時の背景・枠・gap等)を打ち消す */
	.editable .cell {
		gap: 0;
		border: none;
		border-radius: 0;
		background: none;
		transition: none;
		justify-content: flex-start;
		cursor: pointer;
		user-select: none;
	}
	.editable .cell:hover .char {
		outline: 1px dashed #90a4ae;
		outline-offset: -1px;
	}
	.editable .cell:focus-visible {
		outline: 2px solid var(--c-sel-line);
		outline-offset: 1px;
	}
	.editable .cell.selected {
		background: var(--c-sel-bg);
		box-shadow:
			inset 0 2px 0 var(--c-sel-line),
			inset 0 -2px 0 var(--c-sel-line);
	}
	.editable .cell.selected .char {
		background: transparent;
	}
</style>
