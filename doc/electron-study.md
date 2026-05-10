# background.js と src/main.js の役割の違い

`background.js` と `src/main.js` は、ElectronとVue.jsを組み合わせたアプリケーションにおいて、それぞれ異なる重要な役割を担っています。

## 1. `background.js` (Electronのメインプロセス)

*   **役割:** Electronアプリケーション全体の制御と管理。
*   **実行環境:** Node.js環境。OSレベルの機能（ファイルアクセス、ウィンドウ作成、ネイティブAPI呼び出しなど）に直接アクセスできます。
*   **主なタスク:**
    *   アプリケーションの起動と終了処理。
    *   `BrowserWindow` インスタンス（これがレンダラープロセスをホストするウィンドウ）の作成と管理。
    *   アプリケーションメニュー、システムトレイ、ダイアログなどのネイティブUI要素の管理。
    *   複数のウィンドウ間の状態共有や通信の仲介。
    *   セキュリティ設定やプロトコルの定義。
    *   Vue.jsアプリケーション（レンダラープロセス）がロードされるHTMLファイル（または開発サーバーURL）を指定します。
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

| 特徴         | `background.js` (メインプロセス)                                  | `src/main.js` (レンダラープロセス内のVueエントリー)                  |
| :----------- | :---------------------------------------------------------------- | :------------------------------------------------------------------- |
| **目的**     | アプリケーション全体の制御、ウィンドウ管理、OS連携                  | UIの構築と表示、ユーザーインタラクション処理                         |
| **実行場所** | Node.js環境                                                       | Electronウィンドウ内のChromiumブラウザ環境                           |
| **APIアクセス** | Electron API、Node.js API (フルアクセス)                          | Web API (DOM、Fetchなど)、限定的なNode.js/Electron API (設定による) |
| **インスタンス数** | 通常、アプリケーション全体で1つ                                   | 各 `BrowserWindow` ごとに1つ (このプロジェクトでは通常1つ)         |
| **UI**       | 直接的なUIは持たない (ウィンドウやメニューを作成する)                 | UIそのものを構築・表示する                                           |

`background.js` が家全体（構造、電気、水道など）を管理する建築家だとすれば、`src/main.js` はその家の中の特定の部屋（リビングルームなど）のインテリアデザインや家具の配置を担当するインテリアデザイナーのようなものです。両者が連携して、完全なアプリケーションが機能します。

---

# preload.js の役割と実行タイミング

## 1. preload.jsの役割

preload.jsは、Electronアプリケーションにおいて「レンダラープロセス（Webページ側）」と「メインプロセス（Node.js側）」の間で、安全に機能を橋渡しするためのスクリプトです。

- contextBridge.exposeInMainWorldを使い、window.pythonApiというAPIをWebページ側に公開しています。
- これにより、Vueなどのフロントエンドから「executeScript」を呼び出すことで、Pythonスクリプトの実行をメインプロセスに依頼できます。
- executeScriptはipcRenderer.invokeを使い、メインプロセスに「execute-python-script」イベントを送信し、Pythonスクリプトの実行結果をPromiseで返します。

## 2. 実行タイミング

preload.jsは、ElectronのBrowserWindow生成時にpreloadオプションで指定され、Webページ（Vueアプリなど）がロードされる直前に一度だけ実行されます。

- background.jsがpreload.jsを「直接」実行するのではなく、BrowserWindow生成時の設定でElectron本体が自動的に実行します。

```js
const win = new BrowserWindow({
  // ...省略...
  webPreferences: {
    // ...省略...
    preload: path.join(__dirname, 'preload.js')
  }
})
```

この指定により、ElectronがBrowserWindow（＝レンダラープロセス）を生成するタイミングで、preload.jsが自動的に実行されます。

## まとめ

- preload.jsは「安全なAPIの橋渡し」と「Webページロード前の一度きりの実行」が主な役割とタイミングです。
- background.jsはpreload.jsを直接実行するのではなく、BrowserWindow生成時の設定でElectronが実行します。
