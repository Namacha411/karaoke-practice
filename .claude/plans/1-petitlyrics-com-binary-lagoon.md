# Implementation Plan: カラオケ練習アプリ (歌詞カード作成・注釈・エクスポート)

## Context

カラオケの練習を効率化するため、petitlyrics.com から歌詞を取得し、ブレス位置・アクセント・裏声・ルビなどの練習用注釈を書き込んだ「オリジナル歌詞カード」を作成し、印刷や画像として持ち出せるようにしたい。

現状のリポジトリは `sv create --template minimal --types ts` で生成された直後の未変更スキャフォールド(SvelteKit 2 / Svelte 5 runes / TypeScript / Vite / Bun)で、アプリ固有のコードは一切ない。今回はこの土台の上に、(1) 歌詞取得、(2) 注釈編集、(3) PDF/画像エクスポート、の3機能を持つ個人利用ツールを新規構築する。

### 事前調査で確認した事実
- petitlyrics.com の歌詞ページ (例: `/lyrics/4289424`) では、歌詞本文は `<canvas id="lyrics">...</canvas>` のフォールバックテキストとして、数値文字参照(`&#xxxx;`)・改行区切りのプレーンテキストで生HTML内に存在する(canvas描画によるコピー防止が意図されているが、DOM/HTML上はテキストとして取得可能)。ヘッドレスブラウザは不要で、サーバーサイドの HTML fetch + パースで抽出できる。
- 曲名・アーティスト名も同ページ内のプレーンHTML要素(`title-bar` div、`/lyrics/artist/xxx` リンク)に含まれる。
- `robots.txt` および `/kiyaku` (利用規約と推測したURL) はいずれも 404 で、内容は確認できなかった。ブラウザからの `fetch()` は CORS で確実にブロックされるため、取得処理はいずれにせよサーバールート経由になる。
- ユーザーとの確認の結果、**本アプリはローカル専用**(公開デプロイしない)。歌詞取得は「ユーザー自身の練習目的の私的複製」として扱い、サーバー側で歌詞テキストをキャッシュ・永続化しない(保存は利用者のブラウザ内のみ)。
- 画像(PNG)書き出しは、ルビ(`<ruby>/<rt>`)付きレイアウトの再現に既知の問題があるため、**PDF(ブラウザ印刷 `window.print()` + `@media print`)を優先実装し、PNGはPhase 1で技術検証してから可否・方式を決める**。
- 追加要望として、強弱・スラー・スタッカート・打消し線の4種の注釈も加える。背景として「歌詞カードにVOCALOID入力レベルの発音・表現情報を持たせたい」「読みの無効化・追加・上書きを頻繁に行う」との要望を受け、**今回のデータモデルに含めるのは発音・表現情報(読み/ブレス/アクセント/裏声/強弱/スラー/スタッカート/打消し線)まで**とする。音高(pitch)・ノート長(duration)などの楽譜的情報は今回のUI実装には含めないが、注釈をkind別の汎用構造にしておき将来拡張しやすくする。

## Architecture Decisions

- **フレームワーク**: 既存スキャフォールドの SvelteKit 2 (Svelte 5 runes) / TypeScript / Vite / Bun をそのまま利用。新規に別スタックへ切り替えない。
- **歌詞取得**: `src/routes/api/fetch-lyrics/+server.ts` サーバールートで petitlyrics の該当ページをfetchし、`src/lib/petitlyrics.ts` でパース(canvasフォールバックテキストの抽出・HTMLエンティティデコード・タイトル/アーティスト抽出)。ローカル専用デプロイ前提のため認証・レート制限は不要だが、`adapter-auto` のまま公開デプロイしないことをREADMEに明記する。
- **データモデル**: 注釈が文字列オフセットに依存すると歌詞編集のたびに壊れるため、`行(Line) → トークン(Token, 安定ID付き)` に分割し、注釈は `(lineId, tokenIndex)` または `tokenId` を参照する形にする。注釈は `kind` 別の判別共用体(discriminated union)として汎用化し、将来の種別追加(例: pitch/duration)がモデル破壊なしで行えるようにする。
  - `Ruby`(ルビ): トークン範囲 → 読み(reading) + `enabled: boolean`。無効化はレコードを削除せず `enabled` を切り替えるだけにし、再有効化や上書き(テキスト書き換え)を素早く行えるようにする。
  - `Accent`(アクセント): トークン単位 → アクセント記号種別
  - `Breath`(ブレス): トークン境界(afterTokenId)へのマーク
  - `Falsetto`(裏声): トークン範囲 → 裏声フラグ
  - `Dynamics`(強弱): トークン範囲 → 強弱記号(pp/p/mp/mf/f/ff 等)またはクレッシェンド/デクレッシェンド
  - `Slur`(スラー): トークン範囲 → なめらかに繋げて歌う指示(範囲の始点・終点)
  - `Staccato`(スタッカート): トークン単位 → 短く切って歌う指示
  - `Strikethrough`(打消し線): 任意のトークン範囲に付けられる汎用マーク。ルビの有効/無効とは独立の注釈種別とし、「歌わない部分」「差し替え候補」など歌詞本文全般への用途に使う
- **ルビの自動生成は行わない(v1)**: 歌詞のルビは固有名詞・当て字・歌い方による読み替えが多く自動生成の精度が低いため、手動入力を基本機能とする。自動プリフィル(kuroshiro等)は将来の追加候補として Open Questions に記載するのみで、今回のタスクには含めない。ただし「無効化・追加・上書きを頻繁に行う」という要望を踏まえ、Ruby編集UI自体は編集コストが低くなるよう設計する(Task 7)。
- **永続化**: 単一ユーザーのローカル利用のため、ブラウザの IndexedDB (`src/lib/storage.ts`) にカード一覧を保存する。バックエンドDBは持たない。
- **エクスポート**:
  - PDF: 依存ライブラリなし。カード表示用コンポーネントに `@media print` スタイルを適用し、`window.print()` を呼ぶ。ルビのレイアウトはブラウザネイティブ印刷で正しく再現される。
  - PNG: `html-to-image` を用いて同じカードDOMをラスタライズする想定だが、ルビ表示崩れの既知問題があるため、Phase 1 で日本語+ルビ+アクセント記号を含むサンプルを使い実際に試し、崩れる場合はv1の対応範囲から外すか代替手段を再検討する。

## Task List

### Phase 0: 準備
- [ ] Task 0: 作業ブランチの作成
  - **Description**: `main` 上での直接作業を避けるため、`feature/lyrics-practice-cards` などの作業ブランチを作成する。
  - **Acceptance criteria**: 現在のブランチが `main` から分岐した新規ブランチになっている。
  - **Dependencies**: None

### Phase 1: 基盤 & 実現性検証(スパイク)
- [ ] Task 1: petitlyrics 歌詞取得・パース機能
  - **Description**: `/api/fetch-lyrics` サーバールートと `src/lib/petitlyrics.ts` を実装し、petitlyricsのURLまたはIDを受け取り `{ title, artist, lines: string[] }` を返す。`<canvas id="lyrics">` 内のフォールバックテキストを抽出し、数値文字参照をデコード、改行でLine配列に分割する。
  - **Acceptance criteria**:
    - [ ] 実在のpetitlyrics URL(例: `/lyrics/4289424`)を渡すと曲名・アーティスト名・歌詞行配列が正しく返る
    - [ ] 存在しないID/取得失敗時に適切なエラーを返す
  - **Verification**:
    - [ ] 手動確認: 実URLで `/api/fetch-lyrics` を叩いて結果を確認(自動テストに実データを含めない。フィクスチャは合成テキストを使う)
  - **Files likely touched**: `src/routes/api/fetch-lyrics/+server.ts`, `src/lib/petitlyrics.ts`
  - **Dependencies**: Task 0

- [ ] Task 2: データモデル定義
  - **Description**: `LyricCard` / `Line` / `Token` / `Annotation`(Ruby/Accent/Breath/Falsetto)の型と、トークン分割ヘルパー(歌詞行→安定ID付きトークン配列)を定義する。
  - **Acceptance criteria**:
    - [ ] 型定義がPhase 2以降の全機能(取得結果の保存、注釈編集、エクスポート)から共通利用できる
    - [ ] トークン分割関数に対する単体テストがある(合成テキストで)
  - **Verification**:
    - [ ] Tests pass: `bun run check` および該当unitテスト
  - **Files likely touched**: `src/lib/types.ts`, `src/lib/tokenize.ts`
  - **Dependencies**: None(Task 1と並行可)

- [ ] Task 3: エクスポート技術検証スパイク
  - **Description**: ルビ・アクセント記号を含む合成の日本語サンプルカードを1枚作り、(a) `window.print()` + `@media print` でPDF化、(b) `html-to-image` でPNG化を実際に試して見比べる。PNGでルビが崩れるかどうかを判定する。
  - **Acceptance criteria**:
    - [ ] PDF経路でルビが正しく表示されることを確認
    - [ ] PNG経路の結果(崩れる/崩れない)を確認し、崩れる場合はv1でのPNG対応方針(見送り/代替手段)を決定してTask 12に反映する
  - **Verification**:
    - [ ] Manual check: 実際に出力したPDF/PNGを目視確認
  - **Files likely touched**: 検証用の一時コンポーネント(後続タスクで本実装に置き換え)
  - **Dependencies**: Task 2

### Checkpoint: Phase 1 完了後
- [ ] 歌詞取得→パースが実データで動く
- [ ] 型定義がビルドを通る
- [ ] PDF/PNGエクスポートの技術的実現性が判明している(PNGの可否含む)
- [ ] 人間によるレビュー

### Phase 2: 歌詞取得〜保存の垂直スライス
- [ ] Task 4: 歌詞取得画面
  - **Description**: `/new` ルートで petitlyrics のURLを入力→Task 1のAPIを呼び出し→取得した生歌詞(曲名・アーティスト・行一覧)をプレビュー表示する画面を作る。
  - **Acceptance criteria**:
    - [ ] URLを入力して取得ボタンを押すと歌詞プレビューが表示される
    - [ ] 取得失敗時にエラーメッセージが表示される
  - **Verification**:
    - [ ] Manual check: ブラウザで実際にURLを入力して動作確認
  - **Files likely touched**: `src/routes/new/+page.svelte`
  - **Dependencies**: Task 1

- [ ] Task 5: 歌詞カードの永続化と一覧
  - **Description**: 取得した歌詞をTask 2のデータモデルに変換してIndexedDBに保存し、トップページ(`/`)に保存済みカード一覧を表示する。
  - **Acceptance criteria**:
    - [ ] 取得→保存→一覧に表示、の流れがブラウザ内で完結する(リロードしても保存内容が残る)
  - **Verification**:
    - [ ] Manual check: 保存後にページをリロードして永続化を確認
  - **Files likely touched**: `src/lib/storage.ts`, `src/routes/+page.svelte`
  - **Dependencies**: Task 2, Task 4

### Checkpoint: Phase 2 完了後
- [ ] URLから歌詞を取得しカードとして保存・一覧表示までE2Eで動く
- [ ] 人間によるレビュー

### Phase 3: 注釈編集
- [ ] Task 6: 注釈編集画面の骨格
  - **Description**: `/cards/[id]/edit` ルートと `LyricCardEditor.svelte` を作成。行/トークン単位で歌詞を表示し、トークンや境界を選択できるUIの土台を作る(まだ注釈種別ごとの機能は付けない)。
  - **Acceptance criteria**:
    - [ ] 保存済みカードを開くと行・トークン単位で歌詞が表示される
    - [ ] トークンをクリックして選択状態にできる
  - **Files likely touched**: `src/routes/cards/[id]/edit/+page.svelte`, `src/lib/components/LyricCardEditor.svelte`
  - **Dependencies**: Task 5

- [ ] Task 7: ルビ注釈(追加・上書き・無効化/再有効化)
  - **Description**: 選択したトークン範囲に読みを入力し、`<ruby><rt>` で表示・保存する。読みの上書き(テキスト書き換え)と、削除せず ON/OFF できる無効化/再有効化(`enabled`フラグ)を、素早く行えるUIにする。
  - **Acceptance criteria**:
    - [ ] ルビを追加・編集(上書き)でき、編集画面上に反映される
    - [ ] ルビを削除せずに無効化/再有効化でき、無効時は打消し線とは別の見た目(例: 淡色表示)で区別できる
  - **Dependencies**: Task 6

- [ ] Task 8: アクセント注釈
  - **Description**: トークン単位でアクセント記号(例: 上昇/下降)を付与し、視覚的に区別して表示する。
  - **Acceptance criteria**: [ ] アクセント記号を追加・編集・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 9: ブレス注釈
  - **Description**: トークン境界にブレスマークを挿入・削除できるようにする。
  - **Acceptance criteria**: [ ] ブレスマークを任意の境界に追加・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 10: 裏声注釈
  - **Description**: トークン範囲を裏声区間として選択し、専用スタイルで表示する。
  - **Acceptance criteria**: [ ] 裏声区間を追加・編集・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 11: 強弱注釈(Dynamics)
  - **Description**: トークン範囲に強弱記号(pp/p/mp/mf/f/ff やクレッシェンド/デクレッシェンド)を付与し表示する。
  - **Acceptance criteria**: [ ] 強弱記号を追加・編集・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 12: スラー注釈
  - **Description**: 複数トークンにまたがる範囲を「なめらかに繋げて歌う」区間としてマークし、視覚的な連結線で表示する。
  - **Acceptance criteria**: [ ] スラー区間を追加・編集・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 13: スタッカート注釈
  - **Description**: トークン単位で「短く切って歌う」マークを付与する。
  - **Acceptance criteria**: [ ] スタッカートを追加・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

- [ ] Task 14: 打消し線注釈(汎用)
  - **Description**: 任意のトークン範囲に取り消し線を付けられる汎用注釈。ルビの無効化とは独立した機能とし、「歌わない部分」「差し替え候補」など歌詞本文全般への用途に使う。
  - **Acceptance criteria**: [ ] 任意のトークン範囲に取り消し線を追加・削除でき、編集画面上に反映される
  - **Dependencies**: Task 6

### Checkpoint: Phase 3 完了後
- [ ] 1枚のカードに8種類(ルビ/アクセント/ブレス/裏声/強弱/スラー/スタッカート/打消し線)全ての注釈を付けて画面上で確認できる
- [ ] 人間によるレビュー

### Phase 4: エクスポート
- [ ] Task 15: PDF書き出し
  - **Description**: `LyricCardView.svelte`(印刷・画面共通の表示コンポーネント)と `@media print` スタイルを実装し、「PDFとして保存」ボタンから `window.print()` を呼ぶ。
  - **Acceptance criteria**: [ ] 注釈付きカードをPDF(ブラウザ印刷)で保存でき、8種類の注釈すべてが正しく表示される
  - **Dependencies**: Phase 3 完了, Task 3(スパイク結果)

- [ ] Task 16: PNG書き出し
  - **Description**: Task 3の検証結果に基づき実装する。崩れないと判明していればTask 15と同じDOMを `html-to-image` でPNG化。崩れる場合はv1では見送るか、判明した代替手段を実装する。
  - **Acceptance criteria**: [ ] Task 3の検証結果に沿った形でPNGエクスポートが提供される(見送りの場合はUI上でその旨明示)
  - **Dependencies**: Task 15

### Checkpoint: Phase 4 完了後
- [ ] 注釈済みカードをPDFで書き出し、注釈が正しく表示されることを確認
- [ ] 人間によるレビュー

### Phase 5: 仕上げ
- [ ] Task 17: カード一覧の基本CRUD(削除・複製)
- [ ] Task 18: エラーハンドリング・UI微調整(不正URL、フェッチ失敗、空状態など)

### Checkpoint: 完了
- [ ] 全Acceptance criteria達成
- [ ] `bun run check` / `bun run build` が通る
- [ ] レビュー準備完了

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| petitlyricsの歌詞取得がサイト側の意図(canvas描画によるコピー防止)に反する可能性 | Med | ローカル専用・私的複製目的に限定し、公開デプロイやサーバー側キャッシュを行わない |
| petitlyrics側でHTML構造が変更されパーサーが壊れる | Low-Med | パース処理を`src/lib/petitlyrics.ts`に集約し、失敗時はエラーを明示して手動貼り付け等の代替手段に切り替えやすくする |
| PNGエクスポートでルビ表示が崩れる | Med | Phase 1でスパイク検証し、崩れる場合はv1のスコープから外すか代替手段を採用 |
| 注釈データモデルが後から破綻する | High(手戻り大) | Phase 1でトークンID参照方式を先に固め、以降の全注釈機能をそれに統一する |

## Open Questions (実装着手時に決めるか、後日検討)
- ルビの自動読み仮名プリフィル(kuroshiro等)を将来追加するか。v1では手動入力のみ。
- 複数曲をまとめて印刷(製本的なエクスポート)に対応するか。v1は1曲=1カード単位。
- 音高(pitch)・ノート長(duration)など楽譜的情報を将来モデルに追加するか。v1のAnnotationは`kind`判別共用体で拡張余地を残すのみで、UIは実装しない。

## Note
- `tasks/plan.md` / `tasks/todo.md` は実装フェーズ開始時に本ファイルの内容を元に作成する(planning-and-task-breakdownスキルの既定出力パス)。
- サンプル/フィクスチャに実際の歌詞本文を含めない(著作権配慮のため、テストには合成の日本語テキストを使用する)。
