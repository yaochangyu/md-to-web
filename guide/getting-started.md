# 快速開始

## 安裝

```bash
git clone https://github.com/yaochangyu/md-to-web.git
cd md-to-web
npm install
```

## 本地開發

```bash
npm run docs:dev
```

瀏覽器開啟 `http://localhost:5173` 即可預覽。

## 新增頁面

1. 在根目錄或任意子目錄建立 `.md` 檔
2. 在 `.vitepress/config.mts` 的 `sidebar` 加上連結

```ts
sidebar: [
  {
    text: '指南',
    items: [
      { text: '快速開始', link: '/guide/getting-started' },
      { text: '語法範例', link: '/guide/syntax' },
    ]
  }
]
```

## 部署

Push 到 `main`，GitHub Actions 自動 build 並部署到 GitHub Pages。

詳細說明請見 [語法範例](./syntax)。
