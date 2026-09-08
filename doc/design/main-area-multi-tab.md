# MainAreaの複数タブ化

> Status: 要件定義・設計検討中(未実装)。作成日 2026-09-08。

## 機能要件

- MainAreaのタブを最大10個まで作成可能とする。
- 各タブの右端にxボタンを配置する。
- タブバーの最も右側に配置されるタブの隣に+ボタンを配置する。
- +ボタンがクリックされたらタブを新規作成する。タブが作成されるとルートエントリ及び通信ソケットを新規に作成しタブに対応させる。
- xボタンがクリックされたらタブを削除する。タブが削除されると対応するルートエントリ及び通信ソケットも削除される。
- メニューエリアのLoadボタン押下によりレシピをロードすると、新規にタブ作成してそこにレシピをロードする。タブが10個作成されている場合、Loadボタンは無効化される。
- メニューエリアのSaveボタンを押してレシピを保存する場合、選択されているタブのレシピを保存する。タブが選択されていない場合、Saveボタンは無効化される。

## 前提: 現状のコード構造

- [MainArea.vue](../../client/components/MainArea.vue) の `.tab-bar` はタブ1個分のHTMLが固定で書かれているだけで、タブの配列やアクティブタブという状態は存在しない。子には常に単一の `RecipeItem` が表示される。
- [RecipeItem.vue](../../client/components/RecipeItem.vue) の `setup()` が `entryManager.addEntry('container', 'root-container')` → `entryManager.moveEntry(rootContainerId, null, 0)` でルートエントリを**自分自身の初期化時に1回だけ**生成している。Run/Clear/Communication Settingボタンはすべてこの `rootContainerId` に対して動作する。
- [EntryHierarchyHandler.js](../../client/ecs/component-handlers/internal/EntryHierarchyHandler.js) の `setRoot`/`unsetRoot`/`getRootOf`/`getHierarchyTick` は複数ルートを内部的に保持できる設計で、`__tests__/EntryHandlerFacade.test.js:152-199` に2ルート並行運用のテストが既にある。
- ただし `EntryHandlerFacade.getRoot()`(`EntryHandlerFacade.js:218`)、`clearEntries()`(`EntryHandlerFacade.js:356-366`)は内部で「最初に作られたルート」を暗黙に使う一本道の実装。`RecipeSerializer.buildRecipe()`(`RecipeSerializer.js:19`)と`RecipeDeserializer.restoreRecipe()`(`RecipeDeserializer.js:42`)も同様に `entryManager.getRoot()` を直接呼んでおり、rootIdを引数で選べない。
- `SocketManager`(`client/managers/SocketManager.js`)はentryId単位でソケットを管理する `Map` を持っており、`CommSettingView`にも`entryId`(=rootContainerId)を渡している。**ソケットは既にentryId単位で複数持てる設計**であり、この点はタブ単位に分離するための追加改修が原理的には不要。
- `useSystemState.js` の `isExecuting` / `selectedEntryId` / `connectingSource` / `showLog` はいずれもモジュールレベルの単一 `ref` で、アプリ全体でただ1つ共有されている(タブという概念が存在しないため当然だが、複数タブ化すると影響が出る)。`ExecutionLogService` の実行履歴ツリーも同様にインスタンス単一。

## 設計検討

### 1. ルートエントリ/レシピ操作APIのタブ(rootId)対応化

現状 `EntryHandlerFacade.getRoot()` / `clearEntries()` / `RecipeSerializer.buildRecipe()` / `RecipeDeserializer.restoreRecipe()` はいずれも「暗黙に単一のルートを対象にする」実装であり、複数タブ(複数ルート)を扱うにはrootIdを明示的に渡せるようにする変更が必須になる。

**提案:** `clearEntries(rootId)` / `buildRecipe(rootId)` / `restoreRecipe(data, rootId)` のようにrootId引数を追加する。`getRoot()`自体は「最初のルートを返す」実装のまま残し、呼び出し元(MenuArea/タブ管理側)が「アクティブなタブのrootId」を明示的に渡す形にする。既存の単一タブ運用の呼び出し元(テストなど)への影響は最小限。

### 2. タブ状態(タブ一覧・アクティブタブ)をどこで管理するか

タブID・ラベル・対応する`rootEntryId`の一覧、およびどのタブがアクティブかという状態は現在どこにも存在しない。MenuArea(Load/Saveボタンの有効・無効判定に必要)とMainArea(タブバー描画に必要)の両方から参照される。

**提案:** `useSystemState.js`と同じ「モジュールレベル`ref`を持つcomposable」パターンで新規に `useTabs.js` を作り、`tabs: ref([{ id, label, rootEntryId }])` と `activeTabId: ref(null)` を保持する。MenuAreaはこれを参照して「タブ数===10ならLoad無効」「activeTabId===nullならSave無効」を判定する。

### 3. RecipeItemコンポーネントの複数タブ対応

現在`RecipeItem.vue`は自分でルートエントリを生成する(コンストラクタ的な副作用を`setup()`に持つ)ため、タブ数だけインスタンス化すると呼ぶたびに新しいルートができてしまい、タブ切替時の「既存タブに戻る」動作と衝突する。

**設計判断が必要な点:** タブ切替時にRecipeItemインスタンスをどう扱うか。
- (a) タブごとに1つのRecipeItemを`v-for`で生成し、非アクティブなものは`v-show`で隠す(常時マウント)
- (b) アクティブな1インスタンスのみ`v-if`でマウントし、`rootEntryId`をpropで渡し直す(タブ切替時に再マウント)

**提案:** (b)。(a)は最大10個のRecipeItemが常時`getHierarchyTick`監視等のwatcherを持ち続けることになり、要件上メリットが薄い割にコストが大きい。`RecipeItem`を「`rootEntryId`をpropで受け取る」形に変更し(ルート生成は呼び出し元=タブ管理側の責務にする)、タブ作成時はタブ管理側が`entryManager.addEntry('container', ...)` → `moveEntry(id, null, 0)`でルートを作ってタブに記録する。ただし(b)では**タブ切替時にスクロール位置や選択状態がリセットされる**というUX上のトレードオフがある。これは要件に明記がなく、許容できるか確認したい(その他不明点として後述)。

### 4. アプリ全体で共有されているグローバル状態の扱い

`isExecuting`(実行中ロック)、`selectedEntryId`(選択状態)、`connectingSource`(パラメータ接続中状態)、`ExecutionLogService`の実行履歴は現状すべて「アプリ全体でただ1つ」。複数タブ化すると以下の挙動になる。
- 実行中ロック: タブAで実行中の間、タブBのRun/Load/Saveボタンも無効化される(MainArea全体に`.executing`のdim overlayがかかる)。
- 選択状態/接続中状態: タブを切り替えても内部的には値が残るが、別タブのentryIdなので実害は小さい(表示上は何も選択されていないように見える)。
- 実行ログ: 全タブの実行ログが1つのログパネルに混在して表示される。

**提案:** 今回の機能要件は「タブの作成・削除・Load/Save」に閉じたスコープなので、実行ロックやログのタブ単位分離は本機能のスコープ外とし、現状通り「アプリ全体で1つ」の挙動を維持することを提案する。将来的にタブごとの分離(タブAの実行中はタブBを操作可能にする、ログをタブ別にフィルタする等)が必要になった場合は別の設計検討として切り出す。

### 5. タブ削除時のソケット/ルート削除

`EntryHandlerFacade.removeEntry(entryId)`(`EntryHandlerFacade.js:296-320`)は対象がルート自身の場合に`hierarchyHandler.unsetRoot()`まで含めて処理する既存実装があり、ルートの削除自体は追加改修なしで可能。ソケット解放は`RecipeDeserializer.restoreRecipe()`が`socketManager.release(rootId)`を呼んでいる既存パターン(`RecipeDeserializer.js:48`)と同じ呼び方を、xボタン押下時のタブ削除処理でも踏襲すればよい。**設計判断は不要**(既存パターンの流用)だが、実装順序の確認のため記載。

### 6. その他の不明点(要確認)

- **「通信ソケットを新規に作成」の意味**: 現状ソケットは`CommSettingView`でユーザーがホスト/ポートを入力して初めて`SocketManager.create()`が呼ばれる(TCP接続を実際に張る)仕組み。タブ作成時点では接続先情報が無いため、要件文言の「通信ソケットを新規に作成」は「タブ(ルート)ごとに独立したソケット管理スロット(entryIdに紐づく管理単位)を用意する」という意味であり、タブ作成時に実際にTCP接続を試みるわけではないと解釈している。この理解で正しいか確認したい。
- **タブ削除時の確認ダイアログ**: Loadボタン押下時は既存レシピの上書きを`window.confirm`で確認しているが、タブ削除(xボタン)については要件に確認の有無が書かれていない。未保存の変更が失われる可能性がある点は同様なので、確認ダイアログを出すべきか。
- **全タブ削除後(0タブ)の扱い**: 全てのタブを閉じられる仕様か、最低1タブは残す(最後の1つの xボタンは無効化する)仕様か。0タブを許容する場合、MainAreaの空状態の表示をどうするか。
- **タブのラベル**: 新規作成タブのデフォルトラベル(例: "Recipe 1"のような連番か、単に空白か)と、Loadでレシピをロードしたタブのラベル(レシピの`meta.name`やファイル名を使うか)をどうするか、要件に指定がない。
- **新規タブの初期表示**: +ボタンで作成したタブ、およびLoadで新規作成したタブは、作成後すぐにアクティブ(選択状態)にする想定でよいか。
- **タブ数上限に達した場合の+ボタン**: 要件はLoadボタンの無効化のみ明記しているが、タブが10個の状態で+ボタンも無効化するべきか(一貫性の観点では無効化が自然だが要件に明記がないため確認したい)。
