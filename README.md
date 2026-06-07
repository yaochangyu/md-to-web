# md-to-web

VitePress template，支援 Obsidian wikilink 語法，可直接將 Obsidian vault 發布成靜態網站。

## Demo

https://yaochangyu.github.io/md-to-web/

## 功能

### 版面配置

- 三欄獨立滾動（左側目錄、主內容、右側 TOC）
- 左右側欄可拖拉調整寬度
- 左右側欄可收合/展開
- 亮色/暗色主題切換

### 閱讀體驗

- 圖片點擊燈箱放大
- 標題可折疊/展開
- TOC 關鍵字搜尋
- TOC 自動捲動同步當前閱讀位置

### Obsidian 相容語法

| 語法 | 效果 |
|------|------|
| `![[file.md]]` | 嵌入另一份 .md 的完整內容 |
| `[[#標題文字]]` | 同頁標題跳轉（build 時自動轉成標準 anchor） |
| `![按鈕文字](file.pdf)` | 渲染為可下載的按鈕（非圖片附件皆適用） |

## 快速開始

```bash
git clone https://github.com/yaochangyu/md-to-web.git
cd md-to-web
npm install
npm run docs:dev      # 開發伺服器，即時預覽
npm run docs:build    # 產生靜態檔（與 CI 相同流程）
npm run docs:preview  # 預覽 build 結果
```

## 新增頁面

在根目錄或任意子目錄新增 `.md` 檔，然後在 `.vitepress/config.mts` 的 `sidebar` 加上連結。

## 部署（GitHub Pages）

1. Fork 此 repo
2. 至 **Settings → Pages**，Source 選 **GitHub Actions**
3. Push 到 `main`，GitHub Actions 自動 build 並部署

部署後網址：`https://<your-username>.github.io/md-to-web/`

若要改成其他 repo 名稱，修改 `config.mts` 裡的：

```ts
base: '/md-to-web/',  // 改成你的 repo 名稱
```

## 附件下載的路徑慣例

```
assets/
└── {文件名稱}/
    ├── *.png / *.jpg    ← 圖片，正常渲染
    ├── *.md             ← 用 ![[path]] 嵌入 或 ![label](path) 下載
    └── *.pdf / *.zip / *.feature / ...  ← 用 ![label](path) 下載
```

## 技術棧

- [VitePress](https://vitepress.dev/) v1.6.4
- Vue 3
- GitHub Actions + GitHub Pages
