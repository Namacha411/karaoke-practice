# karaoke-practice

カラオケ練習用の歌詞カード作成アプリ。貼り付け・入力した歌詞に、ブレス・音程の上下・裏声・ルビ・強弱・スラー・スタッカート・打消し線・歌唱技法(しゃくり/こぶし/ビブラート/フォール)などの注釈を付けて、PDF/PNGとしてエクスポートできる。

## データと歌詞の扱い

- 歌詞は利用者自身が貼り付け・入力します。アプリが外部サイトから歌詞を取得することはありません。
- カードはブラウザのIndexedDBにのみ保存され、サーバーには送信されません(別のブラウザ・端末とは共有されません)。
- 歌詞の著作権は各権利者にあります。作成したカードや書き出した画像・PDFは、個人の練習用途の範囲で利用してください。

## 開発

```sh
bun install
bun run dev
```

## 主なコマンド

```sh
bun run dev      # 開発サーバー起動
bun run build    # 静的サイトとしてビルド(出力先: build/)
bun run check    # 型チェック(svelte-check)
bun run test     # 単体テスト(bun test)
```

## 構成

- `src/lib/lyricsText.ts`: 貼り付けた歌詞テキストの整形(空行・タイムスタンプの除去)
- `src/lib/types.ts`: 歌詞カード・注釈のデータモデル
- `src/lib/tokenize.ts`: 歌詞のトークン分割、カード生成/複製
- `src/lib/annotations.ts`: 注釈(ルビ/音程の上下(accent)/ブレス/裏声/強弱/スラー/スタッカート/打消し線/歌唱技法)のCRUDとレンダリング補助
- `src/lib/storage.ts`: IndexedDBへのカード永続化
- `src/lib/components/LyricCardEditor.svelte`: 注釈編集UI
- `src/lib/components/LyricCardView.svelte`: 表示・印刷・PNG書き出し用の読み取り専用表示
- `src/routes/spike/export`: PDF/PNGエクスポートの技術検証用ページ(合成サンプルのみ使用)

詳細な実装計画は `tasks/plan.md` を参照。

## デプロイ(GitHub Pages)

`main` へのpushで `.github/workflows/deploy.yml` が型チェック・テスト・ビルドを行い、GitHub Pagesへ公開します(リポジトリ設定の Pages → Source は「GitHub Actions」)。

- `@sveltejs/adapter-static` で静的サイトとして `build/` に出力します。固定のページは事前生成し、`/cards/<id>` などの動的なページは `404.html`(SPAフォールバック)で描画します。
- プロジェクトサイト(`https://<user>.github.io/<repo>/`)のサブパスは、ビルド時の環境変数 `BASE_PATH`(例: `/karaoke-practice`)で指定します。開発時(`bun run dev`)は不要です。
- アプリ内のリンクは `$app/paths` の `resolve()` で組み立て、サブパスでも動くようにしています。
- ローカルでサブパス付きビルドを試す場合: `BASE_PATH=/karaoke-practice bun run build`(Git Bashでは先頭に `MSYS_NO_PATHCONV=1` を付ける)
