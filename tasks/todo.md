# Todo: カラオケ練習アプリ

詳細は `tasks/plan.md` を参照。

## Phase 0
- [x] Task 0: 作業ブランチの作成

## Phase 1: 基盤 & 実現性検証
- [ ] Task 1: petitlyrics 歌詞取得・パース機能
- [ ] Task 2: データモデル定義
- [~] Task 3: エクスポート技術検証スパイク(実装済み・ユーザーによる目視確認待ち: /spike/export)
- [ ] Checkpoint: Phase 1

## Phase 2: 歌詞取得〜保存
- [x] Task 4: 歌詞取得画面(実装済み・要ブラウザ確認)
- [x] Task 5: 歌詞カードの永続化と一覧(実装済み・要ブラウザ確認)
- [ ] Checkpoint: Phase 2

## Phase 3: 注釈編集
- [x] Task 6: 注釈編集画面の骨格
- [x] Task 7: ルビ注釈
- [x] Task 8: アクセント注釈
- [x] Task 9: ブレス注釈
- [x] Task 10: 裏声注釈
- [x] Task 11: 強弱注釈
- [x] Task 12: スラー注釈
- [x] Task 13: スタッカート注釈
- [x] Task 14: 打消し線注釈
- [ ] Checkpoint: Phase 3(要ブラウザ確認)

## Phase 4: エクスポート
- [x] Task 15: PDF書き出し(実装済み・要ブラウザ確認)
- [x] Task 16: PNG書き出し(実装済み・ルビ崩れの目視確認は保留中)
- [ ] Checkpoint: Phase 4(要ブラウザ確認)

## Phase 5: 仕上げ
- [x] Task 17: カード一覧の基本CRUD(削除・複製)
- [x] Task 18: エラーハンドリング・UI微調整
- [x] Checkpoint: 完了(`bun run check` / `bun test` / `bun run build` は通過。実ブラウザでのE2E動作確認はユーザー側で要実施)
