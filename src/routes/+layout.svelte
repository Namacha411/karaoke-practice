<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

<style>
	:global(:root) {
		--c-text: #1f2328;
		--c-muted: #5f6b76;
		--c-border: #d5dae0;
		--c-surface: #f6f7f9;
		--c-primary: #1565c0;
		--c-primary-hover: #0d47a1;
		--c-danger: #c62828;
		color: var(--c-text);
	}
	:global(html, body) {
		height: 100%;
		margin: 0;
	}
	:global(body) {
		font-family:
			system-ui,
			-apple-system,
			'Hiragino Sans',
			'Yu Gothic UI',
			'Meiryo',
			sans-serif;
		background: #fff;
	}
	:global(a) {
		color: var(--c-primary);
	}

	/* --- ボタン --- */
	:global(button),
	:global(a.button) {
		font: inherit;
		font-size: 14px;
		line-height: 1.3;
		padding: 7px 12px;
		border: 1px solid var(--c-border);
		border-radius: 6px;
		background: #fff;
		color: var(--c-text);
		cursor: pointer;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		transition:
			background-color 0.1s,
			border-color 0.1s;
	}
	:global(button:hover:not(:disabled)),
	:global(a.button:hover) {
		background: #eef1f4;
		border-color: #b8c0c8;
	}
	:global(button:disabled) {
		opacity: 0.45;
		cursor: not-allowed;
	}
	:global(button:focus-visible),
	:global(a.button:focus-visible),
	:global(input:focus-visible) {
		outline: 2px solid var(--c-primary);
		outline-offset: 1px;
	}
	:global(button.primary),
	:global(a.button.primary) {
		background: var(--c-primary);
		border-color: var(--c-primary);
		color: #fff;
	}
	:global(button.primary:hover:not(:disabled)),
	:global(a.button.primary:hover) {
		background: var(--c-primary-hover);
		border-color: var(--c-primary-hover);
	}
	:global(button.ghost),
	:global(a.button.ghost) {
		background: transparent;
		border-color: transparent;
		color: var(--c-primary);
	}
	:global(button.small) {
		font-size: 12px;
		padding: 4px 8px;
	}
	:global(button.danger-outline) {
		color: var(--c-danger);
		border-color: #f0b4b4;
	}
	:global(button.danger-outline:hover:not(:disabled)) {
		background: #fdecec;
		border-color: var(--c-danger);
	}

	/* --- 入力 --- */
	:global(input[type='text']) {
		font: inherit;
		padding: 7px 10px;
		border: 1px solid var(--c-border);
		border-radius: 6px;
		box-sizing: border-box;
	}

	/* --- 一覧・取得画面などの通常ページ --- */
	:global(.container) {
		max-width: 760px;
		margin: 0 auto;
		padding: 24px 16px 48px;
	}
</style>
