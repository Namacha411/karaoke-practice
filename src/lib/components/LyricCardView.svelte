<script lang="ts">
	import type { LyricCard } from '$lib/types';
	import { buildAllLegendEntries } from '$lib/annotations';
	import LyricLine from './LyricLine.svelte';

	let { card, cardEl = $bindable(undefined) }: { card: LyricCard; cardEl?: HTMLDivElement } = $props();

	const legendEntries = $derived(buildAllLegendEntries().filter((e) => card.annotations.some(e.matches)));
</script>

<div class="card" bind:this={cardEl}>
	<h2 class="title">{card.title}</h2>
	{#if card.artist}<p class="artist">{card.artist}</p>{/if}

	<div class="lines">
		{#each card.lines as line (line.id)}
			<LyricLine {line} annotations={card.annotations} />
		{/each}
	</div>

	{#if legendEntries.length > 0}
		<div class="legend">
			<h3>凡例</h3>
			<ul>
				{#each legendEntries as entry (entry.id)}
					<li>
						<span class="sample"><LyricLine line={entry.line} annotations={entry.annotations} /></span>
						<span class="label">{entry.label}</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.card {
		width: 100%;
		max-width: 640px;
		padding: 24px;
		box-sizing: border-box;
		background: #fff;
		color: #111;
	}
	.title {
		margin: 0;
	}
	.artist {
		color: #666;
		margin-top: 0;
	}
	.lines {
		font-size: 20px;
		margin-top: 12px;
	}
	.legend {
		margin-top: 24px;
		padding-top: 12px;
		border-top: 1px solid #ccc;
		break-inside: avoid;
	}
	.legend h3 {
		font-size: 13px;
		margin: 0 0 8px;
		color: #444;
	}
	.legend ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
		gap: 6px 16px;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 12px;
		color: #444;
	}
	.legend .sample {
		flex: 0 0 auto;
		font-size: 18px;
		min-width: 3em;
	}
	.legend .sample :global(.line) {
		margin-bottom: 0;
	}
	.legend .label {
		flex: 1 1 auto;
	}

	@media print {
		@page {
			margin: 15mm;
		}
	}
</style>
