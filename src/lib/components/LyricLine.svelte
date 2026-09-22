<script lang="ts">
	import type { Annotation, Line, Token } from '$lib/types';
	import {
		buildLineRenderItems,
		dynamicsStartingAt,
		findAccent,
		hasBreathAfter,
		hasFalsetto,
		hasStaccato,
		hasStrikethrough,
		slurPositionOf
	} from '$lib/annotations';

	let {
		line,
		annotations,
		selectedTokenIds = [],
		onTokenClick
	}: {
		line: Line;
		annotations: Annotation[];
		selectedTokenIds?: string[];
		onTokenClick?: (token: Token, e: MouseEvent) => void;
	} = $props();

	function decorationClasses(token: Token) {
		const slur = slurPositionOf(annotations, token.id);
		return {
			token: true,
			selected: selectedTokenIds.includes(token.id),
			'accent-rise': findAccent(annotations, token.id)?.type === 'rise',
			'accent-fall': findAccent(annotations, token.id)?.type === 'fall',
			staccato: hasStaccato(annotations, token.id),
			falsetto: hasFalsetto(annotations, token.id),
			strikethrough: hasStrikethrough(annotations, token.id),
			'slur-start': slur === 'start' || slur === 'solo',
			'slur-mid': slur === 'mid',
			'slur-end': slur === 'end' || slur === 'solo'
		};
	}
</script>

{#if line.tokens.length === 0}
	<div class="line blank"></div>
{:else}
	<div class="line">
		{#each buildLineRenderItems(line, annotations) as item (item.tokens[0].id)}
			{#if dynamicsStartingAt(annotations, item.tokens[0].id)}
				<span class="dynamics-label">{dynamicsStartingAt(annotations, item.tokens[0].id)?.level}</span>
			{/if}
			{#if item.type === 'ruby' && item.ruby}
				{@const ruby = item.ruby}
				<ruby class="token-group" class:ruby-disabled={!ruby.enabled}>
					{#each item.tokens as token (token.id)}
						{#if onTokenClick}
							<button
								type="button"
								class={decorationClasses(token)}
								onclick={(e) => onTokenClick?.(token, e)}
							>
								{token.text}
							</button>
						{:else}
							<span class={decorationClasses(token)}>{token.text}</span>
						{/if}
					{/each}
					{#if ruby.enabled}
						<rt>{ruby.reading}</rt>
					{/if}
				</ruby>
			{:else}
				{@const token = item.tokens[0]}
				{#if onTokenClick}
					<button type="button" class={decorationClasses(token)} onclick={(e) => onTokenClick?.(token, e)}>
						{token.text}
					</button>
				{:else}
					<span class={decorationClasses(token)}>{token.text}</span>
				{/if}
			{/if}
			{#if hasBreathAfter(annotations, item.tokens[item.tokens.length - 1].id)}
				<span class="breath-mark">/</span>
			{/if}
		{/each}
	</div>
{/if}

<style>
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		break-inside: avoid;
	}
	.line.blank {
		height: 1em;
	}
	.token-group {
		ruby-position: over;
	}
	.token-group rt {
		font-size: 0.5em;
	}
	.token {
		position: relative;
		font: inherit;
		border: none;
		background: none;
		padding: 2px 1px;
	}
	button.token {
		cursor: pointer;
	}
	.token.selected {
		background: #fff59d;
		border-radius: 2px;
	}
	.ruby-disabled {
		text-decoration: dotted underline #999;
		opacity: 0.7;
	}
	.breath-mark {
		color: #1976d2;
		font-weight: bold;
		padding: 0 4px;
	}
	.accent-rise::before {
		content: '↗';
		position: absolute;
		top: -1.1em;
		left: 0;
		font-size: 0.6em;
		color: #d32f2f;
	}
	.accent-fall::before {
		content: '↘';
		position: absolute;
		top: -1.1em;
		left: 0;
		font-size: 0.6em;
		color: #d32f2f;
	}
	.staccato::after {
		content: '•';
		position: absolute;
		top: -1.3em;
		left: 50%;
		transform: translateX(-50%);
		color: #388e3c;
	}
	.falsetto {
		text-decoration: underline wavy #7b1fa2;
	}
	.strikethrough {
		text-decoration: line-through;
		text-decoration-color: #444;
		text-decoration-thickness: 2px;
	}
	.dynamics-label {
		align-self: flex-start;
		font-size: 0.5em;
		font-style: italic;
		color: #555;
		padding-top: 0.2em;
	}
	.slur-start,
	.slur-mid,
	.slur-end {
		border-bottom: 2px solid #ef6c00;
	}
	.slur-start {
		border-radius: 8px 0 0 0;
	}
	.slur-end {
		border-radius: 0 0 8px 0;
	}
</style>
