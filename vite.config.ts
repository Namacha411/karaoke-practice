import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// サーバー処理を持たない静的サイトとして出力する。
			// 固定のページは事前生成し、/cards/[id] などの動的なページはfallbackの404.htmlで描画する
			// (GitHub Pagesは存在しないパスに404.htmlを返すため、そのままSPAとして動く)。
			adapter: adapter({ fallback: '404.html' }),

			// GitHub Pagesのプロジェクトサイト(https://<user>.github.io/<repo>/)向けに、
			// ビルド時の環境変数BASE_PATH(例: /karaoke-practice)をサブパスとして使う。開発時は空。
			paths: {
				base: (process.env.BASE_PATH ?? '') as '' | `/${string}`
			}
		})
	]
});
