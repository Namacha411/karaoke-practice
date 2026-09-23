// 全ページがブラウザ内のIndexedDBを前提とするため、SSRせずクライアントだけで描画する(静的サイト向け)。
// 固定のページは空のHTMLとして事前生成する。
export const ssr = false;
export const prerender = true;
