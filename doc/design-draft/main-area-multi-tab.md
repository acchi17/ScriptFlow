# Multi-Tab Support for MainArea

> Status: 要件定義・設計検討中(未実装)。作成日 2026-09-08。

## Functional Requirements

- MainAreaのタブを最大10個まで作成可能とする。
- 各タブの右端にxボタンを配置する。
- タブバーの最も右側に配置されるタブの隣に+ボタンを配置する。
- +ボタンがクリックされたらタブを新規作成する。タブが作成されるとルートエントリ及び通信ソケットを新規に作成しタブに対応させる。
- xボタンがクリックされたらタブを削除する。タブが削除されると対応するルートエントリ及び通信ソケットも削除される。
- メニューエリアのLoadボタン押下によりレシピをロードすると、新規にタブ作成してそこにレシピをロードする。タブが10個作成されている場合、Loadボタンは無効化される。
- メニューエリアのSaveボタンを押してレシピを保存する場合、選択されているタブのレシピを保存する。タブが選択されていない場合、Saveボタンは無効化される。

## Background: Current Code Structure

- [MainArea.vue](../../client/components/MainArea.vue) の `.tab-bar` はタブ1個分のHTML(ラベル "Recipe" 固定)が書かれているだけで、タブの配列やアクティブタブという状態は存在しない。ルートエントリは**MainAreaの`setup()`で1回だけ** `entryManager.addEntry('container', 'root-container')` → `moveEntry(rootEntryId, null, 0)` → `setComm(rootEntryId)`(既定の通信設定を登録)の順で生成され(`MainArea.vue:33-35`)、その`rootEntryId`がpropとして単一の`RecipeItem`に渡される。
- [RecipeItem.vue](../../client/components/RecipeItem.vue) は `entryId` を必須propとして受け取る形になっており、自分ではルートを生成しない。Run/Communication Settingボタン、`getHierarchyTick(props.entryId)`の監視はこのpropのrootIdに対して動作する。ただしClearボタンは `entryManager.clearEntries()` を引数なしで呼んでおり(`RecipeItem.vue:76`)、propのrootIdを使っていない。また`measureEntries()`は`entryManager.clearLayouts()`でレイアウト情報を全エントリ分クリアしてから自分のパネル内のエントリだけを再登録する。
- [EntryHierarchyHandler.js](../../client/ecs/component-handlers/internal/EntryHierarchyHandler.js) の `setRoot`/`unsetRoot`/`isRoot`/`getRootOf`/`getHierarchyTick` は複数ルートを内部的に保持できる設計で、`__tests__/EntryHandlerFacade.test.js` に2ルート並行運用のテスト(`:113` ルート削除時に他ルートが残る、`:152-185` 2ルート/`getRootOf`/ルート別の連番、`:187-211` ルート別のhierarchy tick)が既にある。`ContainerChildren.vue:51` も`getRootOf()`経由で所属ルートのtickを監視している。
- ただし `EntryHandlerFacade.getRoot()`(`EntryHandlerFacade.js:245`)は「最初に登録されたルート」を返し、`clearEntries()`(`EntryHandlerFacade.js:383-393`)も内部でその`getRoot()`を暗黙に使う。同様に `entryManager.getRoot()` を直接呼んでいる箇所が以下にあり、いずれもrootIdを引数で選べない。
  - `RecipeSerializer.buildRecipe()`(`RecipeSerializer.js:17`)
  - `RecipeDeserializer.restoreRecipe()`(`RecipeDeserializer.js:42`)
  - `MenuArea.vue:62`(Load前の上書き確認で「現在のレシピが空か」を判定)
  - `ExecutionLogView.vue:124`(ルートコンテナ自身の実行行をログ表示から除外する判定)
- 接続(connection)はルートを問わず1つのストアに入っており、`getConnections()`(`EntryHandlerFacade.js:528`)は全ルート分を返す。`RecipeSerializer.buildRecipe()`はこれをそのまま`connections`として保存し(`RecipeSerializer.js:28`)、`ConnectionView.vue:40`も全接続を描画対象にする。`RecipeDeserializer`の`connectionCount`(`RecipeDeserializer.js:64`)も全ルート分の件数になる。
- 通信設定は ECS の `comms` コンポーネント(`EntryHandlerFacade.getComm()`/`setComm()`)としてエントリ単位で保持され、`World.despawn()`で他コンポーネントと一緒に削除される。実際のソケットは `EntryExecutionService` の `_entrySocketMap`(`entryId -> { socketId }`)で管理され、`createComm(entryId, host, port)`/`deleteComm(entryId)`(`EntryExecutionService.js:191-211`)がホスト側(Electron IPC `socket:create`/`socket:destroy`、Web版 `POST /api/sockets`・`DELETE /api/sockets/:id`)に依頼する。`CommSettingView` には`entryId`(=rootEntryId)が渡され、`socketId`にもそのentryIdが使われる。**ソケットは既にentryId(ルート)単位で複数持てる設計**。
- スクリプト実行子プロセスは [RunnerHostRegistry.js](../../shared/RunnerHostRegistry.js) により**ルートのentryId単位で既に分離済み**。`ScriptRunnerHost`(1インスタンス=1子プロセス、JS/Pythonの切替はAppSettingsで決まるアプリ共通設定)を`Map<entryId, ScriptRunnerHost>`で保持し、`get(entryId)`で遅延生成する。`EntryExecutionService`はスクリプト実行時に`getRootOf(entryId)`で所属ルートを解決して渡し(`EntryExecutionService.js:80-81`)、`electron/main.js:120-131`・`server/api.js:64-79`がそのentryIdで`runnerRegistry.get(entryId)`を引く。ソケット作成/破棄も同じルートのプロセスにルーティングされる。
  - ただし`RunnerHostRegistry.shutdown(entryId)`(1ルート分のプロセス終了)を呼ぶ経路は無く、現状呼ばれているのはアプリ/サーバ終了時の`shutdownAll()`のみ(`electron/main.js:177-183`、`server/index.js:56-58`)。レンダラからルート単位でプロセス終了を依頼するIPC/HTTP APIは存在しない。
- `useSystemState.js` の `isExecuting` / `selectedEntryId` / `connectingSource` / `showLog` / `lastError` はいずれもモジュールレベルの単一 `ref` で、アプリ全体でただ1つ共有されている。`executingRootEntryId` も追加されているが、値が入るのは`executeEntry()`経由(`useEntryOperation.js:23`)のみで、Save/Load時の`setExecuting(true)`(`useEntryOperation.js:53,68`)ではnullのまま。現状この値を参照している箇所は無い。`ExecutionLogService` の実行履歴ツリーもインスタンス単一。

## Design Considerations

### 1. ルートエントリ/レシピ操作APIのタブ(rootId)対応化 [resolved]

現状 `EntryHandlerFacade.clearEntries()` / `RecipeSerializer.buildRecipe()` / `RecipeDeserializer.restoreRecipe()` はいずれも内部で`getRoot()`を呼び「暗黙に最初のルートを対象にする」実装であり、複数タブ(複数ルート)を扱うにはrootIdを明示的に渡せるようにする変更が必須になる。`EntryPersistanceService.saveRecipe()`/`loadRecipe()`・`useEntryOperation.saveRecipe()`/`loadRecipe()`もrootIdを受け取る口が無いため、同様に引数を通す必要がある。

また接続ストアがルート共通であるため、`buildRecipe()`が全ルートの接続を保存してしまう問題がある(タブ1つの現状では顕在化しない)。

**検討した選択肢:**
- (A) `clearEntries(rootId)` / `buildRecipe(rootId)` / `restoreRecipe(data, rootId)` のように**必須**のrootId引数を追加し、呼び出し元が`useTabStore`の`activeTab.rootEntryId`を明示的に渡す
- (A') (A)と同様だがrootIdを省略可能とし、省略時は`getRoot()`(最初のルート)にフォールバックする
- (B) シグネチャは変えず、`getRoot()`がタブストアの設定する「アクティブなルート」を返すようにする

**決定:** (A)を採用し、rootIdは**必須引数**とする。どのルートを操作するかが呼び出し側で明示され、テストしやすく、`EntryHierarchyHandler`の既存の複数ルート対応とも整合する。(A')は既存の呼び出し元・テストを変更せずに済むが、rootIdを渡し忘れた呼び出しが黙って最初のタブを操作してしまい、発見しにくいバグになるため不採用。(B)は差分が小さいが、ECSがUI状態(アクティブタブ)に依存し、操作対象が暗黙のグローバル状態で決まるため別タブを保存/クリアする事故を招きやすく不採用とした。

**API変更:**

| 層 | 変更前 | 変更後 |
|---|---|---|
| `EntryHandlerFacade` | `clearEntries()` | `clearEntries(rootId)` |
| `RecipeSerializer` | `buildRecipe()` | `buildRecipe(rootId)` |
| `RecipeDeserializer` | `restoreRecipe(data)` | `restoreRecipe(data, rootId)`(内部の`clearEntries()`・`deleteComm()`にも同じrootIdを渡す) |
| `EntryPersistanceService` | `buildRecipe()` / `restoreRecipe(data)` / `saveRecipe(name)` / `loadRecipe()` | `buildRecipe(rootId)` / `restoreRecipe(data, rootId)` / `saveRecipe(rootId, name)` / `loadRecipe(rootId)` |
| `useEntryOperation` | `saveRecipe()` / `loadRecipe()` | `saveRecipe(rootId)` / `loadRecipe(rootId)` |

- rootIdが渡されない、またはルートでないIDが渡された場合は(`isRoot(rootId)`で検証し)例外を投げる。暗黙のフォールバックは行わない。
- `getRoot()`自体は「最初に登録されたルートを返す」実装のまま残すが、アプリコード(コンポーネント・サービス)からは呼ばない。用途は既存テスト内の参照など、単一ルートであることが自明な箇所に限る。

**呼び出し元の対応:**
- **Save(MenuArea)**: `useTabStore().activeTab.rootEntryId`を`saveRecipe(rootId)`に渡す(`activeTab === null`ならSaveボタンは無効化済み。セクション2参照)。
- **Load(MenuArea)**: `useTabStore().createTab()`で新規タブを作成し、返された`tab.rootEntryId`を`loadRecipe(rootId)`に渡す。新規タブにロードするため、`MenuArea.vue:62`の「現在のレシピが空か」による上書き確認は不要になる(この`getRoot()`呼び出しは削除)。ファイル選択がキャンセルされた場合にタブを残すか閉じるかはセクション6の不明点として扱う。
- **Clear(RecipeItem)**: 既に持っている`props.entryId`を`clearEntries(props.entryId)`に渡す(`RecipeItem.vue:76`)。
- **ExecutionLogView**: ログは全タブ共通(セクション4参照)のため、`ExecutionLogView.vue:124`の`getRoot()`との比較を「`useTabStore().tabs`のいずれかの`rootEntryId`と一致するか」の判定に置き換える(`entryManager.isRoot(entryId)`でも同等)。

**接続のルート別フィルタ:**
- `buildRecipe(rootId)`は、接続の両端が`getRootOf(endpoint.entryId) === rootId`を満たすものだけを`connections`として保存する。
- `RecipeDeserializer`の`connectionCount`も同様に、そのルートに属する接続のみを数える。
- `ConnectionView.vue:40`もアクティブタブのrootIdに属する接続のみを描画対象とする(セクション3参照)。

**テストへの影響:** `EntryPersistanceService.test.js`など既存テストの`buildRecipe()`/`restoreRecipe(recipe)`/`clearEntries()`呼び出しはrootIdを渡す形に更新する。あわせて、2ルートを作成し「片方のルートだけが保存/クリア/復元され、他方のルートとその接続は影響を受けない」ことを検証するテストを追加する。

### 2. タブ状態(タブ一覧・アクティブタブ)をどこで管理するか [resolved]

タブID・ラベル・対応する`rootEntryId`の一覧、およびどのタブがアクティブかという状態は現在どこにも存在しない。MenuArea(Load/Saveボタンの有効・無効判定に必要)とMainArea(タブバー描画に必要)をはじめ、RecipeItem・ExecutionLogView・ConnectionView・`useEntryOperation`など複数のモジュールから参照される。

**検討した選択肢:**
- (A) 専用のグローバルなタブストアを新設し、タブ一覧・アクティブタブとタブ作成/削除処理を集約する
- (B) MainAreaのローカル状態とし、MenuAreaへはprops/イベントまたはprovide/injectで受け渡す
- (C) ECS(`EntryHierarchyHandler`のルート一覧)からタブ一覧を導出し、`activeRootId`のみ保持する

**決定:** (A)を採用し、**Pinia**のストア `useTabStore` として実装する。タブ状態は複数モジュールから参照されるため、`useSystemState.js`のような独自のモジュールレベル`ref`ではなく、Vue公式の状態管理ライブラリであるPiniaで管理する。(B)は兄弟コンポーネント間(MainArea/MenuArea)でのバケツリレーやLoad時のタブ作成コールバックが必要になり、(C)はラベルやタブ単位のUI状態(Comm状態・スクロール位置)をECSに持たせられず、ルートの並び順も保証されないため不採用とした。

**導入作業:**
- `pinia`を`dependencies`に追加し、`client/main.js`で`app.use(createPinia())`を登録する(既存の`app.provide(...)`より前)。
- ストアは`client/stores/useTabStore.js`に配置する(ファイル名はエクスポートする`useTabStore`と一致させる)。
- ユニットテストでは各テストの`beforeEach`で`setActivePinia(createPinia())`を呼び、テスト間で状態をリセットする(モジュールレベル`ref`の手動リセットが不要になる)。

**ストアの構成(Setup Store形式):**

```js
// client/stores/useTabStore.js
export const useTabStore = defineStore('tab', () => {
  const entryManager = inject('entryManager')
  const entryExecutionService = inject('entryExecutionService')

  // state
  const tabs = ref([])            // [{ id, label, rootEntryId }]
  const activeTabId = ref(null)

  // getters
  const activeTab = computed(() => tabs.value.find(t => t.id === activeTabId.value) ?? null)
  const isTabLimitReached = computed(() => tabs.value.length >= MAX_TABS) // MAX_TABS = 10

  // actions
  function createTab(label) { /* addEntry → moveEntry(id, null, 0) → setComm(id) → tabs.push → activeTabId 更新 */ }
  async function closeTab(tabId) { /* deleteComm → shutdownRunner → removeEntry → tabs から除去 → activeTabId 付け替え */ }
  function setActiveTab(tabId) { /* activeTabId 更新 */ }

  return { tabs, activeTabId, activeTab, isTabLimitReached, createTab, closeTab, setActiveTab }
})
```

- **state**: `tabs`(`{ id, label, rootEntryId }`の配列)と`activeTabId`。タブ単位のUI状態(セクション3の`commBtnStatus`、セクション6のスクロール位置など)が必要になった場合は、タブ要素のフィールドとしてこのストアに追加する。
- **getters**: `activeTab`、`isTabLimitReached`。MenuAreaは`isTabLimitReached`でLoadボタンを、`activeTab === null`でSaveボタンを無効化する。
- **actions**:
  - `createTab(label)`: 現在`MainArea.vue:33-35`にあるルート生成処理(`entryManager.addEntry('container', 'root-container')` → `moveEntry(id, null, 0)` → `setComm(id)`)をここに移し、タブを`tabs`に追加して作成した`tab`を返す。上限到達時は何もせず`null`を返す。+ボタン(MainArea)とLoad(MenuArea → `useEntryOperation.loadRecipe()`)の両方がこのアクションを呼ぶ。
  - `closeTab(tabId)`: セクション5の順序(`deleteComm(rootId)` → `shutdownRunner(rootId)` → `removeEntry(rootId)` → `tabs`から除去 → アクティブタブの付け替え)でタブを削除する。
  - `setActiveTab(tabId)`: アクティブタブを切り替える。
- **依存サービスの取得**: `entryManager`・`entryExecutionService`は`client/main.js`で`app.provide()`されているため、Setup Store内で`inject()`して取得する(Vue 3.3+ / Pinia 2.1+ではストア初期化がアプリのinjectionコンテキスト内で行われる。本リポジトリのVueは3.5系)。ユニットテストでは`createApp().provide(...)`+`app.use(pinia)`でモックを注入する。
- **ECSとの整合**: ルートの生成・削除は必ず`createTab()`/`closeTab()`経由で行い、コンポーネントから直接`addEntry`/`removeEntry`でルートを増減させないことで、`tabs`とECSのルート一覧の不整合を防ぐ。

なお、新規タブを作成直後にアクティブにするか、0タブを許容するかといったストアの振る舞いの詳細は、セクション6の不明点として引き続き確認する。

### 3. RecipeItemコンポーネントの複数タブ対応 [undecided]

`RecipeItem.vue`は既に`entryId`(rootId)をpropで受け取る形になっており、ルート生成の責務は呼び出し元(現状MainArea)にある。したがって「インスタンス化するたびにルートが増える」問題は既に解消済みで、残る論点はタブ切替時のインスタンスの扱いのみ。

**設計判断が必要な点:** タブ切替時にRecipeItemインスタンスをどう扱うか。
- (a) タブごとに1つのRecipeItemを`v-for`で生成し、非アクティブなものは`v-show`で隠す(常時マウント)
- (b) アクティブな1インスタンスのみマウントし、`:key="activeTab.rootEntryId"`で`rootEntryId`をpropで渡し直す(タブ切替時に再マウント)

**提案:** (b)。(a)は最大10個のRecipeItemが常時`getHierarchyTick`監視等のwatcherを持ち続けることになり、要件上メリットが薄い割にコストが大きい。さらに(a)では各RecipeItemの`measureEntries()`が`clearLayouts()`で全エントリのレイアウトを消し合うため、レイアウトストアのルート別分離が別途必要になる。(b)ならアクティブな1インスタンスだけがレイアウトを登録するため現状の実装のまま動く。ただし(b)では**タブ切替時にスクロール位置やCommボタンの接続状態表示(`commBtnStatus`、RecipeItemのローカル`ref`)がリセットされる**というUX上のトレードオフがある。`commBtnStatus`はタブ単位の状態として`useTabStore`側に持たせる(または`EntryExecutionService._entrySocketMap`の有無から導出する)ことで回避できる。スクロール位置のリセットは要件に明記がなく、許容できるか確認したい(その他不明点として後述)。

また、`ConnectionView.vue:40`は`getConnections()`で全ルートの接続を描画対象にしているため、(b)でも非アクティブタブの接続が混入する。接続線は`getAllLayouts()`にレイアウトがあるエントリ同士しか描けないため実害は出にくいが、`getRootOf()`でアクティブタブのrootIdに属する接続のみに絞る修正を入れる。

### 4. アプリ全体で共有されているグローバル状態の扱い [undecided]

`isExecuting`(実行中ロック)、`selectedEntryId`(選択状態)、`connectingSource`(パラメータ接続中状態)、`lastError`、`ExecutionLogService`の実行履歴は現状すべて「アプリ全体でただ1つ」。複数タブ化すると以下の挙動になる。
- 実行中ロック: タブAで実行中の間、タブBのRun/Load/Saveボタンも無効化される(MainArea全体に`.executing`のdim overlayがかかるため、タブバーの切替・+/xボタンも操作不可になる)。
- 選択状態/接続中状態: RecipeItemのhierarchy tick監視で`cancelConnection()`/選択解除が行われるが、タブ切替そのものでは解除されない。別タブのentryIdなので実害は小さい(表示上は何も選択されていないように見える)が、タブ切替時に`resetState()`を呼んでおくのが安全。
- 実行ログ: 全タブの実行ログが1つのログパネルに混在して表示される。

**提案:** 今回の機能要件は「タブの作成・削除・Load/Save」に閉じたスコープなので、実行ロックやログのタブ単位分離は本機能のスコープ外とし、現状通り「アプリ全体で1つ」の挙動を維持することを提案する。スクリプト実行プロセスは既にルート単位で分離されている(前提参照)ため、将来タブごとの分離(タブAの実行中はタブBを操作可能にする、ログをタブ別にフィルタする等)が必要になった場合も、ボトルネックはUI側のロック/ログのみで、既存の`executingRootEntryId`をタブ単位ロックの起点にできる。その際は別の設計検討として切り出す。

### 5. タブ削除時のソケット/ルート/子プロセス削除 [undecided]

- **ルート**: `EntryHandlerFacade.removeEntry(entryId)`(`EntryHandlerFacade.js:323-347`)は対象がルート自身の場合に`hierarchyHandler.unsetRoot()`まで含めて処理し、配下エントリ・接続・パラメータ・`comms`コンポーネントも削除する(`__tests__/EntryHandlerFacade.test.js:113`で他ルートが残ることも検証済み)。ルートの削除自体は追加改修なしで可能。
- **ソケット**: `RecipeDeserializer.restoreRecipe()`がLoad時に`entryExecutionService.deleteComm(rootId)`を呼んでいる既存パターン(`RecipeDeserializer.js:48`)と同じ呼び方を、xボタン押下時のタブ削除処理でも踏襲すればよい(`useEntryOperation.releaseSocket(rootId)`経由でも可)。`removeEntry()`より先に呼ぶ。
- **子プロセス**: 前提のとおり、タブ(ルート)ごとの`ScriptRunnerHost`は`RunnerHostRegistry`に残り続ける。タブ削除時にプロセスを終了させないと、最大10個を超えて作成/削除を繰り返すたびにアイドルの子プロセスが蓄積する。`RunnerHostRegistry.shutdown(entryId)`自体は実装済みなので、これを呼ぶ経路(Electron: `runner:shutdown` のようなIPCハンドラと`preload.js`の公開API、Web版: `DELETE /api/runners/:entryId`のようなAPIルート、クライアント: `ScriptExecutionService.shutdownRunner(entryId)`)を追加する必要がある。

**削除処理の順序(提案):** `deleteComm(rootId)` → ランナー終了依頼(`shutdownRunner(rootId)`) → `removeEntry(rootId)` → `useTabStore`からタブを除去しアクティブタブを付け替え(`useTabStore.closeTab()`がこの一連の処理を担う)。ルート削除とソケット解放は既存パターンの流用で、設計判断が必要なのは子プロセス終了APIの追加のみ。

### 6. その他の不明点(要確認) [undecided]

- **「通信ソケットを新規に作成」の意味**: 現状ソケットは`CommSettingView`でユーザーがホスト/ポートを入力し`useTcpIp`を有効にして初めて`EntryExecutionService.createComm()`が呼ばれる(ホスト側でTCP接続を実際に張る)仕組み。タブ作成時に行うのは`setComm(rootId)`による既定の通信設定(`comms`コンポーネント)の登録のみで、接続先情報は無い。要件文言の「通信ソケットを新規に作成」は「タブ(ルート)ごとに独立した通信設定・ソケット管理単位(entryIdに紐づく)を用意する」という意味であり、タブ作成時に実際にTCP接続を試みるわけではないと解釈している。この理解で正しいか確認したい。
- **タブ削除時の確認ダイアログ**: Loadボタン押下時は既存レシピの上書きを`window.confirm`で確認しているが、タブ削除(xボタン)については要件に確認の有無が書かれていない。未保存の変更が失われる可能性がある点は同様なので、確認ダイアログを出すべきか。
- **全タブ削除後(0タブ)の扱い**: 全てのタブを閉じられる仕様か、最低1タブは残す(最後の1つの xボタンは無効化する)仕様か。0タブを許容する場合、MainAreaの空状態の表示をどうするか。
- **タブのラベル**: 新規作成タブのデフォルトラベル(例: "Recipe 1"のような連番か、単に空白か)と、Loadでレシピをロードしたタブのラベル(レシピの`meta.name`やファイル名を使うか)をどうするか、要件に指定がない。
- **新規タブの初期表示**: +ボタンで作成したタブ、およびLoadで新規作成したタブは、作成後すぐにアクティブ(選択状態)にする想定でよいか。
- **Loadのファイル選択キャンセル時の新規タブ**: セクション1の方針ではLoad時に先に`createTab()`で新規タブを作成してから`loadRecipe(rootId)`を呼ぶ。ファイル選択がキャンセルされた場合やレシピの読み込みに失敗した場合、作成した空タブを`closeTab()`で閉じるか、空タブとして残すか(あるいはファイル選択後にタブを作成する順序にするか)。
- **タブ数上限に達した場合の+ボタン**: 要件はLoadボタンの無効化のみ明記しているが、タブが10個の状態で+ボタンも無効化するべきか(一貫性の観点では無効化が自然だが要件に明記がないため確認したい)。
- **タブ切替時のスクロール位置**: セクション3の(b)案ではタブ切替のたびにRecipeItemが再マウントされ、レシピパネルのスクロール位置が先頭に戻る。これを許容してよいか(許容しない場合はタブごとにスクロール位置を`useTabStore`に保存・復元する)。

### 7. Per-Recipe Child Process Isolation (Implemented) and Remaining Issues [resolved]

当初は将来の検討事項としていたが、レシピ(ルート)単位の子プロセス分離は既に実装済みである。

**現状のアーキテクチャ**: `shared/ScriptRunnerHost.js`は1インスタンス=1子プロセス(JS: `shared/script-runner.js`、Python: `appdata/python/script_runner.py`。どちらを起動するかはAppSettingsの`script.interpreterName`によるアプリ共通設定)を管理し、TCP制御チャネル(`shared/SocketComm.js`)越しにリクエストcorrelation(`_pending` Map)を行う。`shared/RunnerHostRegistry.js`がこれを`Map<entryId(rootId), ScriptRunnerHost>`で保持し、`electron/main.js`/`server/index.js`はレジストリ経由で`get(entryId)`する。`ScriptRunnerHost._ensureConnection()`による遅延生成のため、タブ(ルート)を作っただけではプロセスは起動せず、そのルートで最初にスクリプト実行またはソケット作成が行われた時点で起動する。IPC(`script:execute`/`socket:create`/`socket:destroy`)とWeb版APIは既にentryId(rootId)を受け取るプロトコルになっている。

**採用したインスタンス設計**: 「単一インスタンスが内部で複数プロセスを管理する」案ではなく、`ScriptRunnerHost`をルートごとに複数生成し、ルーティングだけを外側の薄いレジストリ(`RunnerHostRegistry`)に切り出す案を採用している。1プロセス分のプロトコル管理とプール管理の責務が分離され、`ScriptRunnerHost`は1インスタンス=1プロセスの実装のまま再利用できる。

**本機能に関わる残課題**:
- タブ削除時に`RunnerHostRegistry.shutdown(entryId)`を呼ぶ経路が無い(セクション5参照)。これは本機能のスコープで対応する。
- 実行ロック・ログはUI側でアプリ全体共通のままなので、プロセスが分離されていてもタブ間の並列実行はUI上できない(セクション4の方針どおりスコープ外)。

**注意点**: 素のPythonインタプリタ起動自体はNodeと大差ない(実測: 素のPython起動 約60ms、`node -e ""` 約64ms)。ただし`script_runner.py`が起動時に読み込む標準ライブラリ(特に`asyncio`)のimportで実質約180msかかり、加えてユーザースクリプトが`numpy`/`pandas`等の重いライブラリをimportする場合はプロセスごとにそのコストを個別に払うことになる。遅延生成により各タブでこのコストは「そのタブで最初にスクリプトを実行した時」に一度だけ発生するため、タブ上限(10個)分が同時に重なることはないが、ユーザースクリプトの内容次第で新規タブの初回実行が重くなり得る点は要検討事項として残る。
