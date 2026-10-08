<script lang="ts">
	import type { TechniqueType } from '$lib/types';

	// カラオケの採点画面に出る記号に寄せた、歌唱技法のアイコン。
	// 大きさは親のfont-size(1em角)に従う。色は技法ごとに決まっており、
	// 親が--technique-colorを指定したときだけ上書きされる(選択中のボタン上で白抜きにする等)。

	let { type }: { type: TechniqueType } = $props();

	const PATHS: Record<TechniqueType, string> = {
		// 低い音からしゃくり上げる
		shakuri: 'M2 10 Q8 10 10 2',
		// 平らな音の途中で一瞬だけ跳ねる
		kobushi: 'M1 8.5 H4 Q6 -1 8 8.5 H11',
		// 細かく揺れる波
		vibrato: 'M1 6 Q2.25 1.5 3.5 6 T6 6 T8.5 6 T11 6',
		// 音の終わりで下げて抜く
		fall: 'M2 2 Q8 2 10 10'
	};
</script>

<svg class={type} viewBox="0 0 12 12" aria-hidden="true"><path d={PATHS[type]} /></svg>

<style>
	svg {
		width: 1em;
		height: 1em;
		fill: none;
		stroke: var(--technique-color, var(--c));
		stroke-width: 1.8;
		stroke-linecap: round;
		stroke-linejoin: round;
	}
	.shakuri {
		--c: #d32f2f;
	}
	.kobushi {
		--c: #1565c0;
	}
	.vibrato {
		--c: #2e7d32;
	}
	.fall {
		--c: #8e24aa;
	}
</style>
