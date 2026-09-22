import type { LyricCard } from './types';

const DB_NAME = 'karaoke-practice';
const DB_VERSION = 1;
const STORE_NAME = 'cards';

function openDb(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE_NAME)) {
				db.createObjectStore(STORE_NAME, { keyPath: 'id' });
			}
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error);
	});
}

export async function saveCard(card: LyricCard): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).put(card);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}

export async function getCard(id: string): Promise<LyricCard | undefined> {
	const db = await openDb();
	const result = await new Promise<LyricCard | undefined>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const req = tx.objectStore(STORE_NAME).get(id);
		req.onsuccess = () => resolve(req.result as LyricCard | undefined);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return result;
}

export async function listCards(): Promise<LyricCard[]> {
	const db = await openDb();
	const result = await new Promise<LyricCard[]>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readonly');
		const req = tx.objectStore(STORE_NAME).getAll();
		req.onsuccess = () => resolve(req.result as LyricCard[]);
		req.onerror = () => reject(req.error);
	});
	db.close();
	return result.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function deleteCard(id: string): Promise<void> {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, 'readwrite');
		tx.objectStore(STORE_NAME).delete(id);
		tx.oncomplete = () => resolve();
		tx.onerror = () => reject(tx.error);
	});
	db.close();
}
