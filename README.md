# karaoke-practice

カラオケ練習用の歌詞カード作成アプリ。petitlyrics.comから歌詞を取得し、ブレス・アクセント・裏声・ルビ・強弱・スラー・スタッカート・打消し線などの注釈を付けて、PDF/PNGとしてエクスポートできる。

## 重要: ローカル専用アプリです

このアプリは**個人のローカル環境での利用のみ**を前提としています。**公開デプロイ(Vercel/Netlify等)は行わないでください。**

歌詞取得(`/api/fetch-lyrics`)はサーバー経由でpetitlyrics.comの歌詞ページを取得しますが、これは利用者自身の練習目的の私的複製として設計されています。公開デプロイすると、誰でも使える歌詞取得プロキシになってしまうため、そのような使い方は想定していません。歌詞データはサーバー側でキャッシュ・保存せず、取得結果はブラウザのIndexedDBにのみ保存されます。

## 開発

```sh
bun install
bun run dev
```

## 主なコマンド

```sh
bun run dev      # 開発サーバー起動
bun run build    # 本番ビルド
bun run check    # 型チェック(svelte-check)
bun run test     # 単体テスト(bun test)
```

## 構成

- `src/lib/petitlyrics.ts`: petitlyricsの歌詞ページ取得・パース
- `src/lib/types.ts`: 歌詞カード・注釈のデータモデル
- `src/lib/tokenize.ts`: 歌詞のトークン分割、カード生成/複製
- `src/lib/annotations.ts`: 注釈(ルビ/アクセント/ブレス/裏声/強弱/スラー/スタッカート/打消し線)のCRUDとレンダリング補助
- `src/lib/storage.ts`: IndexedDBへのカード永続化
- `src/lib/components/LyricCardEditor.svelte`: 注釈編集UI
- `src/lib/components/LyricCardView.svelte`: 表示・印刷・PNG書き出し用の読み取り専用表示
- `src/routes/spike/export`: PDF/PNGエクスポートの技術検証用ページ(合成サンプルのみ使用)

詳細な実装計画は `tasks/plan.md` を参照。
