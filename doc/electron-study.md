# electron/main.js と src/main.js の役割の違い

`electron/main.js` と `src/main.js` は、ElectronとVue.jsを組み合わせたアプリケーションにおいて、それぞれ異なる重要な役割を担っています。

## 1. `electron/main.js` (Electronのメインプロセス)

*   **役割:** Electronアプリケーション全体の制御と管理。
*   **実行環境:** Node.js環境。OSレベルの機能（ファイルアクセス、ウィンドウ作成、ネイティブAPI呼び出しなど）に直接アクセスできます。
*   **主なタスク:**
    *   アプリケーションの起動・終了処理、および `before-quit` 時のユーティリティプロセスの終了。
    *   `BrowserWindow` の作成（`contextIsolation: true` / `nodeIntegration: false` / `sandbox: true` のセキュア設定）。
    *   初回起動時に `public/` のデフォルトファイルを `<app-dir>/scripts/` と `<app-dir>/settings/` へシード（`seedUserDirs()`）。
    *   以下の IPC ハンドラの登録（`registerIpcHandlers()`）:
        *   `scripts:list` — スクリプト一覧の取得
        *   `scripts:read` / `scripts:save` — スクリプトの読み書き
        *   `defs:read` / `defs:write` — ブロック定義JSONの読み書き
        *   `script:execute` — ユーティリティプロセスへのスクリプト実行委譲
    *   ユーティリティプロセス（`script-runner.js`）の遅延起動と管理（`ensureScriptRunner()`）。
*   **位置づけ:** アプリケーションの「バックエンド」や「オーケストレーター」に近いです。UIそのものではなく、UIが表示される環境やアプリケーション全体の動作を管理します。

## 2. `src/main.js` (Vue.jsアプリケーションのエントリーポイント / Electronのレンダラープロセス)

*   **役割:** アプリケーションのユーザーインターフェース（UI）の構築と管理。
*   **実行環境:** Chromiumブラウザ環境（Electronの `BrowserWindow` 内）。HTML、CSS、JavaScript（Vue.jsフレームワークを含む）を実行します。
*   **主なタスク:**
    *   Vueアプリケーションインスタンスの作成 (`createApp` を使用)。
    *   ルートVueコンポーネント（通常は `App.vue`）のマウント。
    *   Vue Router、Vuexストア、プラグインなどのセットアップ。
    *   UIコンポーネントの定義、データのバインディング、ユーザーインタラクションの処理。
    *   メインプロセスとの通信（IPC経由）を通じて、ネイティブ機能の利用を要求したり、メインプロセスからデータを受け取ったりします。
*   **位置づけ:** アプリケーションの「フロントエンド」です。ユーザーが直接見て操作する画面を構築します。

## まとめ

| 特徴         | `electron/main.js` (メインプロセス)                                  | `src/main.js` (レンダラープロセス内のVueエントリー)                  |
| :----------- | :---------------------------------------------------------------- | :------------------------------------------------------------------- |
| **目的**     | アプリケーション全体の制御、ウィンドウ管理、OS連携                  | UIの構築と表示、ユーザーインタラクション処理                         |
| **実行場所** | Node.js環境                                                       | Electronウィンドウ内のChromiumブラウザ環境                           |
| **APIアクセス** | Electron API、Node.js API (フルアクセス)                          | Web API (DOM、Fetchなど)、限定的なNode.js/Electron API (設定による) |
| **インスタンス数** | 通常、アプリケーション全体で1つ                                   | 各 `BrowserWindow` ごとに1つ (このプロジェクトでは通常1つ)         |
| **UI**       | 直接的なUIは持たない (ウィンドウやメニューを作成する)                 | UIそのものを構築・表示する                                           |

`electron/main.js` が家全体（構造、電気、水道など）を管理する建築家だとすれば、`src/main.js` はその家の中の特定の部屋（リビングルームなど）のインテリアデザインや家具の配置を担当するインテリアデザイナーのようなものです。両者が連携して、完全なアプリケーションが機能します。

---

# preload.js の役割と実行タイミング

## 1. preload.jsの役割

`electron/preload.js` は、Electronアプリケーションにおいて「レンダラープロセス（Webページ側）」と「メインプロセス（Node.js側）」の間で、安全に機能を橋渡しするためのスクリプトです。

`contextBridge.exposeInMainWorld` を使い、`window.electronAPI` というAPIをWebページ側に公開しています。公開されているメソッドは以下の6つです。

| メソッド | IPCチャンネル | 用途 |
| :--- | :--- | :--- |
| `listScripts()` | `scripts:list` | スクリプト名一覧の取得 |
| `readScript(name)` | `scripts:read` | スクリプトの内容読み込み |
| `saveScript(name, content)` | `scripts:save` | スクリプトの保存 |
| `readBlockDefinitions()` | `defs:read` | ブロック定義JSONの読み込み |
| `writeBlockDefinitions(data)` | `defs:write` | ブロック定義JSONの書き込み |
| `executeScript(name, inputParams)` | `script:execute` | スクリプトの実行 |

いずれも `ipcRenderer.invoke()` でメインプロセスに要求を送り、結果を `Promise` で返します。生の `ipcRenderer` や `fs`、`child_process` はレンダラーに公開しません。

## 2. 実行タイミング

`electron/preload.js` は、Electronの `BrowserWindow` 生成時に `preload` オプションで指定され、Webページ（Vueアプリ）がロードされる直前に一度だけ実行されます。

- `electron/main.js` が `preload.js` を「直接」実行するのではなく、`BrowserWindow` 生成時の設定でElectron本体が自動的に実行します。

```js
// electron/main.js
mainWindow = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    preload: path.join(__dirname, 'preload.js')
  }
})
```

この指定により、ElectronがBrowserWindow（＝レンダラープロセス）を生成するタイミングで、`preload.js` が自動的に実行されます。

## まとめ

- `preload.js` は「安全なAPIの橋渡し」と「Webページロード前の一度きりの実行」が主な役割とタイミングです。
- `electron/main.js` は `preload.js` を直接実行するのではなく、`BrowserWindow` 生成時の設定でElectronが実行します。
- レンダラーに公開するのは `window.electronAPI` の6メソッドのみで、Node.js APIは一切露出しません。

---

# electron/script-runner.js の役割

## 1. ユーティリティプロセスとは

`script-runner.js` は Electron の **ユーティリティプロセス**（Utility Process）として動作します。メインプロセスが `utilityProcess.fork()` で起動する、独立した Node.js プロセスです。

```js
// electron/main.js
scriptRunner = utilityProcess.fork(runnerPath, [getUserScriptsDir()], { ... })
```

このプロセスはアプリ起動時には生成されず、**最初のスクリプト実行要求が来たときに初めて起動**し、その後はセッションが終わるまで常駐します（`ensureScriptRunner()` による遅延生成）。

## 2. プロセス構成

このアプリには合計3つのプロセスが存在しますが、Node.js が使えるのはそのうち2つです。

| プロセス | エントリーポイント | Node.js | 役割 |
| :--- | :--- | :---: | :--- |
| **メインプロセス** | `electron/main.js` | ✓ | ウィンドウ管理・IPC・ファイルI/O・ユーティリティプロセスの起動 |
| **ユーティリティプロセス** | `electron/script-runner.js` | ✓ | `.mjs` スクリプトの動的インポートと実行 |
| レンダラープロセス | Vue アプリ | ✗ | UIの表示（`sandbox: true` / `nodeIntegration: false` で Node.js アクセス不可） |

## 3. スクリプト実行の流れ

```
[レンダラープロセス]
  window.electronAPI.executeScript(name, params)
    → ipcRenderer.invoke('script:execute', ...)       // preload.js

[メインプロセス]
  ipcMain.handle('script:execute', ...)               // main.js
    → executeScriptInRunner()
      → runner.postMessage({ type: 'execute', ... })  // IPCメッセージ送信

[ユーティリティプロセス — script-runner.js]
  process.parentPort.on('message', ...)
    → handleExecute({ id, scriptName, inputParams })
      → import('<scripts-dir>/<name>.mjs')            // 動的インポート
      → await mod.execute(inputParams)                // .mjs の execute() を呼び出し
      → process.parentPort.postMessage({ type: 'result', ... })  // 結果を返却
```

## 4. ユーティリティプロセスを分離する理由

- **安全性:** スクリプトがクラッシュしてもメインプロセスやUIには影響しない。
- **セキュリティ:** スクリプト名を `/^[A-Za-z0-9_-]+$/` で検証し、パスをスクリプトディレクトリ内に限定することで、パストラバーサル攻撃を防ぐ。
- **タイムアウト管理:** メインプロセス側で10秒のタイムアウトを設定し、スクリプトの無限ループなどを検知できる。
