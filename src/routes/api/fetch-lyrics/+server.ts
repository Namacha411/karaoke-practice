import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { PetitLyricsError, fetchPetitLyrics } from '$lib/petitlyrics';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json().catch(() => null);
	const input = typeof body?.url === 'string' ? body.url : '';

	if (!input.trim()) {
		return json({ error: 'petitlyricsのURL、またはIDを入力してください' }, { status: 400 });
	}

	try {
		const result = await fetchPetitLyrics(input);
		return json(result);
	} catch (err) {
		if (err instanceof PetitLyricsError) {
			return json({ error: err.message }, { status: err.status });
		}
		return json({ error: '予期しないエラーが発生しました' }, { status: 500 });
	}
};
