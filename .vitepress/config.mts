import { defineConfig } from 'vitepress'
import fs from 'fs'
import path from 'path'

const IMAGE_EXT = /\.(png|jpe?g|gif|svg|webp|avif|bmp|ico)(\?.*)?$/i

function escHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// URL-encode 路徑各段，保留 '/' 分隔符（解決路徑含空格導致 markdown-it 拒絕解析的問題）
function encodeRelPath(p: string): string {
  return p.split('/').map(seg => encodeURIComponent(seg)).join('/')
}

// VitePress heading slug 演算法（與 markdown-it-anchor 預設一致）
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFC')
    .replace(/[ -⁯⸀-⹿\\'!"#$%&()*+,./:;<=>?@[\]^`{|}~]/g, '')
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')  // 去除首尾多餘連字號
}

// enforce: 'pre' → 在 VitePress markdown→Vue 編譯之前處理原始 .md 文字
const obsidianPlugin = {
  name: 'obsidian-md',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.endsWith('.md')) return null
    const dir = path.dirname(id)
    let result = code

    // 1. ![[file.md]] → 嵌入目標檔案內容（Obsidian wikilink embed 語法）
    result = result.replace(/!\[\[([^\]\n]+\.md)\]\]/g, (_, rel) => {
      const abs = path.resolve(dir, rel)
      if (!fs.existsSync(abs)) return `\n> **⚠️ 嵌入失敗**：找不到 \`${rel}\`\n`
      return '\n' + fs.readFileSync(abs, 'utf-8') + '\n'
    })

    // 2. [[#標題文字]] → [標題文字](#vitepress-slug)（Obsidian 同頁 heading 連結）
    result = result.replace(/\[\[#([^\]\n]+)\]\]/g, (_, heading) => {
      const h = heading.trim()
      return `[${h}](#${toSlug(h)})`
    })

    // 3. ![label](non-image-path) → 下載連結
    // 路徑含中文或空格時 markdown-it 不解析為 image token，在此提前轉成 <a> HTML
    result = result.replace(/!\[([^\]\n]*)\]\(([^)\n]+)\)/g, (match, alt, src) => {
      if (IMAGE_EXT.test(src.trim())) return match  // 圖片保留，交給 markdown-it 處理
      const trimSrc = src.trim()
      const filename = trimSrc.split('/').pop() || trimSrc
      const label = alt.trim() || decodeURIComponent(filename)
      const href = encodeRelPath(trimSrc)
      return `<a class="file-download" href="${escHtml(href)}" download>📄 ${escHtml(label)}</a>`
    })

    return result === code ? null : result
  }
}

export default defineConfig({
  title: "Md to Web",
  description: "VitePress template with Obsidian wikilink support",
  base: '/md-to-web/', // 設定 GitHub Pages 的 sub-folder 路徑
  head: [
    ['style', {}, `
      /* ================= 全域三欄獨立滾動與 Dock 佈局 ================= */
      @media (min-width: 960px) {
        /* 預設寬度：左右側框一致 256px */
        :root {
          --sidebar-resize-width: 256px;
          --aside-resize-width: 256px;
          --vp-sidebar-width: 256px;
        }
        html, body {
          overflow: hidden !important;
          height: 100vh !important;
        }
        #app, .Layout {
          height: 100vh !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
        }
        /* 左側 Sidebar 滾動控制 */
        .VPSidebar {
          height: calc(100vh - var(--vp-nav-height)) !important;
          top: var(--vp-nav-height) !important;
          overflow-y: auto !important;
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), width 0.25s ease, opacity 0.25s ease !important;
        }
        /* 中間與右側容器滾動與排版控制 */
        .VPContent {
          height: calc(100vh - var(--vp-nav-height)) !important;
          margin-top: var(--vp-nav-height) !important;
          padding-top: 0 !important;
          padding-right: 0 !important;
          padding-bottom: 0 !important;
          overflow: hidden !important;
          transition: padding-left 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        .VPDoc {
          height: 100% !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        .VPDoc > .container {
          display: flex !important;
          flex-direction: row !important;
          height: 100% !important;
          max-width: 100% !important;
          margin: 0 !important;
        }
        /* 中間主內容區自滾動（限定 container 直接子元素，避免影響 aside 內的 .content） */
        .VPDoc > .container > .content {
          flex: 1 !important;
          height: 100% !important;
          overflow-y: auto !important;
          padding: 32px 48px !important;
          max-width: 100% !important;
        }
        .VPDoc > .container > .content > .content-container {
          max-width: 800px !important;
          margin: 0 auto !important;
          transition: max-width 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        }
        /* 右側章節大綱自滾動 */
        .VPDoc .aside {
          flex: 0 0 var(--aside-resize-width, 256px) !important;
          width: var(--aside-resize-width, 256px) !important;
          max-width: none !important;
          height: 100% !important;
          overflow-y: auto !important;
          position: relative !important;
          top: 0 !important;
          padding: 32px 0 !important;
          transition: width 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease, padding 0.25s ease !important;
        }

        /* ----- 左側 Sidebar 收合狀態 ----- */
        body.sidebar-collapsed {
          --vp-sidebar-width: 0px !important;
        }
        body.sidebar-collapsed .VPSidebar {
          transform: translateX(-100%) !important;
          width: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* aside-container / aside-curtain 跟隨 --aside-resize-width 變數 */
        .VPDoc .aside-container {
          width: var(--aside-resize-width, 256px) !important;
        }
        /* aside 已改為獨立滾動，VitePress 預設的 fixed 漸層遮罩會固定在瀏覽器底部造成視覺異常，直接隱藏 */
        .VPDoc .aside-curtain {
          display: none !important;
        }
        /* 左右側框貼齊 header bar 下方（移除 VitePress 預設的額外 48px 間距） */
        .VPDoc .aside-container {
          padding-top: var(--vp-nav-height, 64px) !important;
        }
        /* sidebar 已在 top: nav-height，padding-top: 0 讓內容貼齊頂部。
           覆寫 padding-left（VitePress 在寬螢幕下預設 ~266px 造成大量左側留白），
           width 也同步縮小讓 VPContent 不產生空隙 */
        .VPSidebar {
          padding-top: 0 !important;
          padding-left: 16px !important;
          width: var(--vp-sidebar-width) !important;
        }
        .VPSidebar .curtain {
          display: none !important;
        }
        /* sidebar 連結文字單行顯示，超出截斷 */
        .VPSidebarItem .text {
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        /* VPContent padding-left 對應 sidebar 實際寬度 */
        .VPContent {
          padding-left: var(--vp-sidebar-width) !important;
        }
        body.sidebar-collapsed .VPContent {
          padding-left: 0 !important;
        }

        /* 左右側框背景色一致 */
        .VPDoc .aside,
        .VPDoc .aside-container {
          background-color: var(--vp-c-bg-alt) !important;
        }

        /* 右側拖拉 handle（aside 內部 absolute） */
        .aside-resize-handle {
          position: absolute;
          left: 0;
          top: 0;
          width: 4px;
          height: 100%;
          cursor: col-resize;
          z-index: 200;
        }
        /* 左側拖拉 handle（body-level fixed，位置由 JS 控制） */
        .sidebar-resize-handle {
          position: fixed;
          top: var(--vp-nav-height, 64px);
          width: 4px;
          height: calc(100vh - var(--vp-nav-height, 64px));
          cursor: col-resize;
          z-index: 200;
        }
        /* 只在拖拉期間顯示顏色，hover 只改 cursor 不顯示背景（避免在內容區看到線） */
        .aside-resize-handle.resizing,
        .sidebar-resize-handle.resizing {
          background-color: var(--vp-c-brand-1);
          opacity: 0.5;
        }
        /* 拖拉期間停用 transition */
        .VPDoc .aside.resizing,
        .VPDoc .aside-container.resizing,
        .VPDoc .aside-curtain.resizing { transition: none !important; }
        body.resizing-sidebar .VPContent,
        body.resizing-sidebar .VPSidebar,
        body.resizing-sidebar .sidebar-toggle-btn { transition: none !important; }

        /* ----- 右側 Aside 收合狀態 ----- */
        body.aside-collapsed {
          --vp-doc-aside-width: 0px !important;
        }
        body.aside-collapsed .aside {
          flex: 0 0 0px !important;
          width: 0 !important;
          max-width: 0 !important;
          min-width: 0 !important;
          padding: 0 !important;
          opacity: 0 !important;
          pointer-events: none !important;
          overflow: hidden !important;
        }
        body.aside-collapsed .aside,
        body.aside-collapsed .aside * {
          overflow: hidden !important;
        }
        body.aside-collapsed .VPDoc > .container > .content > .content-container {
          max-width: 1000px !important;
        }

        /* 左側收合按鈕（left 由 JS 動態設定） */
        .sidebar-toggle-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          z-index: 100;
          width: 16px;
          height: 50px;
          border-radius: 0 8px 8px 0;
          background-color: var(--vp-c-bg-elv);
          border: 1px solid var(--vp-c-divider);
          border-left: none;
          color: var(--vp-c-text-2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: left 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, color 0.2s, width 0.2s;
          font-size: 8px;
          box-shadow: 2px 0 8px rgba(0,0,0,0.08);
          opacity: 0.85;
        }
        body.sidebar-collapsed .sidebar-toggle-btn {
          left: 0 !important;
        }
        .sidebar-toggle-btn:hover {
          background-color: var(--vp-c-brand-1);
          color: var(--vp-c-white);
          width: 20px;
          opacity: 1;
        }
 
        /* 右側收合按鈕 */
        .aside-toggle-btn {
          position: fixed;
          top: 50%;
          transform: translateY(-50%);
          right: var(--aside-resize-width, 256px); /* 貼齊 aside 左壁 */
          z-index: 100;
          width: 16px;
          height: 50px;
          border-radius: 8px 0 0 8px;
          background-color: var(--vp-c-bg-elv);
          border: 1px solid var(--vp-c-divider);
          border-right: none;
          color: var(--vp-c-text-2);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: right 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s, color 0.2s, width 0.2s;
          font-size: 8px;
          box-shadow: -2px 0 8px rgba(0,0,0,0.08);
          opacity: 0.85;
        }
        body.aside-collapsed .aside-toggle-btn {
          right: 0 !important;
        }
        .aside-toggle-btn:hover {
          background-color: var(--vp-c-brand-1);
          color: var(--vp-c-white);
          width: 20px;
          opacity: 1;
        }
      }

      /* 當螢幕小於 960px 時，VitePress 預設會隱藏 sidebar 和 aside，此時不顯示 toggle 按鈕 */
      @media (max-width: 959px) {
        .sidebar-toggle-btn, .aside-toggle-btn {
          display: none !important;
        }
      }

      /* ================= 原有功能樣式保留 ================= */
      /* 右側目錄章節收闔樣式 */
      .VPDocAsideOutline li {
        position: relative;
      }
      .VPDocAsideOutline li:has(ul)::before {
        content: '▼';
        position: absolute;
        left: -16px;
        top: 2px;
        width: 16px;
        height: 16px;
        cursor: pointer;
        color: var(--vp-c-text-3);
        font-size: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease, color 0.2s;
        z-index: 2;
      }
      .VPDocAsideOutline li:has(ul):hover::before {
        color: var(--vp-c-brand-1);
      }
      .VPDocAsideOutline li.collapsed > ul {
        display: none !important;
      }
      .VPDocAsideOutline li.collapsed::before {
        transform: rotate(-90deg);
      }

      /* --- 右側目錄增強樣式 --- */
      /* sticky header：title + tools 固定在 outline 頂部 */
      .outline-sticky-header {
        position: sticky;
        top: 0;
        z-index: 5;
        background-color: var(--vp-c-bg-alt);
        padding-bottom: 6px;
        margin-bottom: 4px;
      }
      .VPDocAsideOutline {
        max-height: calc(100vh - 180px);
        overflow-y: auto;
        scrollbar-width: thin;
        padding-right: 8px;
      }
      .VPDocAsideOutline::-webkit-scrollbar {
        width: 4px;
      }
      .VPDocAsideOutline::-webkit-scrollbar-track {
        background: transparent;
      }
      .VPDocAsideOutline::-webkit-scrollbar-thumb {
        background: var(--vp-c-divider);
        border-radius: 4px;
      }
      .VPDocAsideOutline::-webkit-scrollbar-thumb:hover {
        background: var(--vp-c-brand-1);
      }
      .VPDocAsideOutline .outline-link {
        white-space: normal;
        overflow-wrap: anywhere;
        display: block;
        line-height: 1.4;
        padding: 4px 0;
      }
      .outline-tools {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 4px;
        margin-bottom: 0;
      }
      #outline-search {
        flex: 1;
        font-size: 11px;
        padding: 4px 8px;
        border-radius: 4px;
        border: 1px solid var(--vp-c-divider);
        background-color: var(--vp-c-bg-elv);
        color: var(--vp-c-text-1);
        outline: none;
        transition: border-color 0.2s;
        min-width: 0;
      }
      #outline-search:focus {
        border-color: var(--vp-c-brand-1);
      }
      .outline-tool-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        font-size: 11px;
        border-radius: 4px;
        border: 1px solid var(--vp-c-divider);
        background-color: var(--vp-c-bg-elv);
        color: var(--vp-c-text-2);
        cursor: pointer;
        transition: all 0.2s;
        padding: 0;
        flex-shrink: 0;
      }
      .outline-tool-btn:hover {
        background-color: var(--vp-c-bg-soft);
        color: var(--vp-c-brand-1);
        border-color: var(--vp-c-brand-1);
      }
      .outline-tool-btn.active {
        background-color: var(--vp-c-brand-1);
        color: var(--vp-c-white);
        border-color: var(--vp-c-brand-1);
      }
      .VPDocAsideOutline li.hidden {
        display: none !important;
      }

      /* ================= 圖片燈箱 Lightbox 樣式 ================= */
      .medium-zoom-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s ease;
        cursor: zoom-out;
      }
      .medium-zoom-overlay.show {
        opacity: 1;
      }
      .medium-zoom-image-zoom {
        max-width: 95%;
        max-height: 95%;
        object-fit: contain;
        transform: scale(0.95);
        transition: transform 0.2s ease;
      }
      .medium-zoom-overlay.show .medium-zoom-image-zoom {
        transform: scale(1);
      }
      /* 主內容區的圖片 hover 時顯示 zoom-in */
      .VPDoc img {
        cursor: zoom-in;
        transition: opacity 0.2s;
      }
      .VPDoc img:hover {
        opacity: 0.9;
      }

      /* ================= 內文標題階層收合樣式 ================= */
      .header-fold-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-right: 8px;
        font-size: 0.6em;
        cursor: pointer;
        color: var(--vp-c-text-3);
        transition: transform 0.2s, color 0.2s;
        user-select: none;
        width: 1.2em;
        height: 1.2em;
        vertical-align: middle;
      }
      .header-fold-btn:hover {
        color: var(--vp-c-brand-1);
      }
      /* 被收合的內容元素隱藏 */
      .collapsed-hidden {
        display: none !important;
      }

      /* ================= 移除標題前多餘分隔線 =================
         來源常用 "---" 開新章節 → 產生 <hr>，但 VitePress 的 h2/h3/h4 本身已自帶
         border-top 上框線，兩條線會疊在一起變雙線。隱藏「緊接標題的 hr」，只留標題自己的線。 */
      .VPDoc hr:has(+ h2),
      .VPDoc hr:has(+ h3),
      .VPDoc hr:has(+ h4) {
        display: none !important;
      }
    `],
    ['script', {}, `
      (function() {
        try {
        
        function logDebug(msg) {
          if (typeof window === 'undefined') return;
          console.log('[Outline SDK]', msg);
        }

        // Obsidian 相容：三段 fallback
        // 1. 直接 getElementById（VitePress slug 格式）
        // 2. 大小寫不敏感 ID 比對（Obsidian 保留大小寫的 slug）
        // 3. 標題文字比對（Obsidian Wikilinks OFF 使用標題原文作為 anchor）
        function findByIdCI(rawId) {
          const direct = document.getElementById(rawId);
          if (direct) return direct;
          const lower = rawId.toLowerCase();
          const headings = document.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]');
          for (const h of headings) {
            if (h.id.toLowerCase() === lower) return h;
          }
          // 標題文字比對：去除摺疊按鈕與 VitePress permalink 符號後與 rawId 比對
          for (const h of headings) {
            const text = h.textContent
              .replace(/^[▼▶]\s*/, '')
              .replace(/\s*​?\s*$/, '')
              .trim();
            if (text === rawId || text.toLowerCase() === lower) return h;
          }
          return null;
        }

        function setupToggle() {
          // 處理左側 Sidebar Toggle
          const sidebar = document.querySelector('.VPSidebar');
          if (sidebar && !document.querySelector('.sidebar-toggle-btn')) {
            const sBtn = document.createElement('button');
            sBtn.className = 'sidebar-toggle-btn';
            const sCollapsed = document.body.classList.contains('sidebar-collapsed');
            sBtn.innerHTML = sCollapsed ? '❯' : '❮';
            sBtn.title = '收起/展開左側選單';
            sBtn.addEventListener('click', () => {
              document.body.classList.toggle('sidebar-collapsed');
              const nowCollapsed = document.body.classList.contains('sidebar-collapsed');
              sBtn.innerHTML = nowCollapsed ? '❯' : '❮';
            });
            document.body.appendChild(sBtn);
            logDebug('setupSidebarToggle succeeded');
          }

          // 處理右側 Aside Toggle
          const aside = document.querySelector('.aside');
          if (aside && !document.querySelector('.aside-toggle-btn')) {
            const aBtn = document.createElement('button');
            aBtn.className = 'aside-toggle-btn';
            const aCollapsed = document.body.classList.contains('aside-collapsed');
            aBtn.innerHTML = aCollapsed ? '❮' : '❯';
            aBtn.title = '收起/展開右側目錄';
            aBtn.addEventListener('click', () => {
              document.body.classList.toggle('aside-collapsed');
              const nowCollapsed = document.body.classList.contains('aside-collapsed');
              aBtn.innerHTML = nowCollapsed ? '❮' : '❯';
              syncAsidePosition();
            });
            document.body.appendChild(aBtn);
            logDebug('setupAsideToggle succeeded');
          }
        }

        // --- 右側目錄功能模組 ---
        function filterOutline(outline, keyword) {
          const rootUl = outline.querySelector('ul');
          if (!rootUl) return;
          
          function processLi(li) {
            const link = li.querySelector(':scope > a.outline-link');
            const text = link ? link.textContent.toLowerCase() : '';
            const matchSelf = text.includes(keyword);
            
            const subUl = li.querySelector(':scope > ul');
            let hasMatchChild = false;
            
            if (subUl) {
              const subLis = subUl.querySelectorAll(':scope > li');
              subLis.forEach(subLi => {
                if (processLi(subLi)) {
                  hasMatchChild = true;
                }
              });
            }
            
            const matched = matchSelf || hasMatchChild;
            
            if (!keyword) {
              li.classList.remove('hidden');
            } else {
              if (matched) {
                li.classList.remove('hidden');
                li.classList.remove('collapsed');
              } else {
                li.classList.add('hidden');
              }
            }
            return matched;
          }
          
          const topLis = rootUl.querySelectorAll(':scope > li');
          topLis.forEach(li => processLi(li));
        }

        function toggleAllOutline(outline, collapse) {
          const lis = outline.querySelectorAll('li');
          lis.forEach(li => {
            if (li.querySelector('ul')) {
              if (collapse) {
                li.classList.add('collapsed');
              } else {
                li.classList.remove('collapsed');
              }
            }
          });
        }

        // ===== 內容捲動 → TOC active 同步 =====
        function setupContentScrollTracking() {
          const content = document.querySelector('.VPDoc > .container > .content');
          const outline = document.querySelector('.VPDocAsideOutline');
          if (!content || !outline || content._scrollTracked) return;
          content._scrollTracked = true;

          function findActiveHeading() {
            const headings = Array.from(
              content.querySelectorAll('h1[id],h2[id],h3[id],h4[id],h5[id],h6[id]')
            );
            const threshold = content.getBoundingClientRect().top + 80;
            let active = null;
            for (const h of headings) {
              if (h.getBoundingClientRect().top <= threshold) active = h;
              else break;
            }
            return active;
          }

          function syncActive() {
            const active = findActiveHeading();
            outline.querySelectorAll('a.outline-link').forEach(a => a.classList.remove('active'));
            if (!active) return;
            const link = outline.querySelector('a.outline-link[href="#' + active.id + '"]');
            if (link) link.classList.add('active');
          }

          content.addEventListener('scroll', syncActive, { passive: true });
          syncActive();
          logDebug('setupContentScrollTracking succeeded');
        }

        let lastActiveLink = null;
        function handleActiveScroll() {
          const outline = document.querySelector('.VPDocAsideOutline');
          if (!outline) return;

          const activeLink = outline.querySelector('a.active');
          if (!activeLink) return;

          if (activeLink !== lastActiveLink) {
            lastActiveLink = activeLink;

            // 1. 自動展開所有父目錄
            let parent = activeLink.parentElement;
            while (parent && parent !== outline) {
              if (parent.tagName.toLowerCase() === 'li' && parent.classList.contains('collapsed')) {
                parent.classList.remove('collapsed');
              }
              parent = parent.parentElement;
            }
            
            // 2. 自動捲動到可視範圍
            const autoScrollBtn = document.getElementById('outline-auto-scroll');
            if (autoScrollBtn && autoScrollBtn.classList.contains('active')) {
              activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          }
        }

        // ===== 寬度拖拉調整 =====
        function applyAsideWidth(w) {
          document.documentElement.style.setProperty('--aside-resize-width', w + 'px');
          syncAsidePosition();
        }
        function applySidebarWidth(w) {
          document.documentElement.style.setProperty('--vp-sidebar-width', w + 'px');
          document.documentElement.style.setProperty('--sidebar-resize-width', w + 'px');
          syncSidebarPositions();
        }

        function syncSidebarPositions() {
          const sidebar = document.querySelector('.VPSidebar');
          if (!sidebar) return;
          const collapsed = document.body.classList.contains('sidebar-collapsed');
          const right = collapsed ? 0 : Math.round(sidebar.getBoundingClientRect().right);
          const handle = document.querySelector('.sidebar-resize-handle');
          if (handle) handle.style.left = right + 'px';
          const btn = document.querySelector('.sidebar-toggle-btn');
          if (btn) btn.style.left = right + 'px';
        }

        function syncAsidePosition() {
          const btn = document.querySelector('.aside-toggle-btn');
          if (!btn) return;
          if (document.body.classList.contains('aside-collapsed')) {
            btn.style.right = '0px';
            return;
          }
          const aside = document.querySelector('.VPDoc .aside');
          if (!aside) return;
          const left = Math.round(aside.getBoundingClientRect().left);
          btn.style.right = (window.innerWidth - left) + 'px';
        }
        function setupAsideResize() {
          const aside = document.querySelector('.VPDoc .aside');
          if (!aside || aside.querySelector('.aside-resize-handle')) return;
          if (document.body.classList.contains('aside-collapsed')) return;
          const savedW = parseInt(localStorage.getItem('aside-resize-width'));
          if (savedW) applyAsideWidth(savedW);
          const handle = document.createElement('div');
          handle.className = 'aside-resize-handle';
          aside.appendChild(handle);
          let dragging = false, startX = 0, startW = 0;
          handle.addEventListener('mousedown', e => {
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startW = aside.getBoundingClientRect().width || 256;
            handle.classList.add('resizing');
            aside.classList.add('resizing');
            const ac = document.querySelector('.VPDoc .aside-container');
            const cu = document.querySelector('.VPDoc .aside-curtain');
            if (ac) ac.classList.add('resizing');
            if (cu) cu.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          });
          document.addEventListener('mousemove', e => {
            if (!dragging) return;
            applyAsideWidth(Math.max(150, Math.min(600, startW + (startX - e.clientX))));
          });
          document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            handle.classList.remove('resizing');
            aside.classList.remove('resizing');
            const ac = document.querySelector('.VPDoc .aside-container');
            const cu = document.querySelector('.VPDoc .aside-curtain');
            if (ac) ac.classList.remove('resizing');
            if (cu) cu.classList.remove('resizing');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            localStorage.setItem('aside-resize-width', Math.round(aside.getBoundingClientRect().width));
          });
        }
        function setupSidebarResize() {
          // sidebar 收合時移除 handle，展開時重建
          if (document.body.classList.contains('sidebar-collapsed')) {
            const h = document.querySelector('.sidebar-resize-handle');
            if (h) h.remove();
            return;
          }
          if (document.querySelector('.sidebar-resize-handle')) return;
          const vpContent = document.querySelector('.VPContent');
          if (!vpContent) return;

          const handle = document.createElement('div');
          handle.className = 'sidebar-resize-handle';
          document.body.appendChild(handle);

          // 復原 localStorage 的寬度
          const savedW = parseInt(localStorage.getItem('sidebar-resize-width'));
          if (savedW) applySidebarWidth(savedW);
          let dragging = false, startX = 0, startW = 0;
          handle.addEventListener('mousedown', e => {
            e.preventDefault();
            dragging = true;
            startX = e.clientX;
            startW = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-sidebar-width')) || 256;
            handle.classList.add('resizing');
            document.body.classList.add('resizing-sidebar');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
          });
          document.addEventListener('mousemove', e => {
            if (!dragging) return;
            applySidebarWidth(Math.max(150, Math.min(500, startW + (e.clientX - startX))));
          });
          document.addEventListener('mouseup', () => {
            if (!dragging) return;
            dragging = false;
            handle.classList.remove('resizing');
            document.body.classList.remove('resizing-sidebar');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--vp-sidebar-width'));
            if (w) localStorage.setItem('sidebar-resize-width', Math.round(w));
          });
        }

        function setupOutlineToolbar() {
          const outline = document.querySelector('.VPDocAsideOutline');
          if (!outline) {
            logDebug('setupOutlineToolbar failed: no .VPDocAsideOutline');
            return;
          }
          
          if (outline.querySelector('.outline-sticky-header')) return;

          const title = outline.querySelector('.outline-title');
          if (!title) {
            logDebug('setupOutlineToolbar failed: no .outline-title');
            return;
          }

          // 建立 sticky wrapper，讓 title + tools 固定在 outline 頂部
          const stickyHeader = document.createElement('div');
          stickyHeader.className = 'outline-sticky-header';

          const tools = document.createElement('div');
          tools.className = 'outline-tools';

          const search = document.createElement('input');
          search.type = 'text';
          search.id = 'outline-search';
          search.placeholder = '搜尋目錄...';

          const toggleAllBtn = document.createElement('button');
          toggleAllBtn.className = 'outline-tool-btn';
          toggleAllBtn.id = 'outline-toggle-all';
          toggleAllBtn.title = '全部展開/收闔';
          toggleAllBtn.innerHTML = '↕';

          const autoScrollBtn = document.createElement('button');
          autoScrollBtn.className = 'outline-tool-btn active';
          autoScrollBtn.id = 'outline-auto-scroll';
          autoScrollBtn.title = '自動捲動到當前段落';
          autoScrollBtn.innerHTML = '🎯';

          tools.appendChild(search);
          tools.appendChild(toggleAllBtn);
          tools.appendChild(autoScrollBtn);

          // 把 title 移入 sticky wrapper，再插回 outline 頂部
          title.parentNode.insertBefore(stickyHeader, title);
          stickyHeader.appendChild(title);
          stickyHeader.appendChild(tools);
          
          search.addEventListener('input', (e) => {
            const keyword = e.target.value.trim().toLowerCase();
            filterOutline(outline, keyword);
          });
          
          let allCollapsed = false;
          toggleAllBtn.addEventListener('click', () => {
            allCollapsed = !allCollapsed;
            toggleAllOutline(outline, allCollapsed);
          });
          
          autoScrollBtn.addEventListener('click', () => {
            autoScrollBtn.classList.toggle('active');
            if (autoScrollBtn.classList.contains('active')) {
              lastActiveLink = null;
              handleActiveScroll();
            }
          });
          logDebug('setupOutlineToolbar succeeded');
        }

        // 設定標題摺疊/收合狀態，並連動更新其底下的元素
        function setHeadingCollapsedState(heading, isCollapsing) {
          const headingId = heading.id;
          const headingLevel = parseInt(heading.tagName.substring(1));
          const btn = heading.querySelector('.header-fold-btn');

          if (isCollapsing) {
            heading.classList.add('collapsed');
            if (btn) btn.innerHTML = '▶';
          } else {
            heading.classList.remove('collapsed');
            if (btn) btn.innerHTML = '▼';
          }

          let next = heading.nextElementSibling;
          while (next) {
            if (next.tagName && /^H[1-6]$/.test(next.tagName)) {
              const nextLevel = parseInt(next.tagName.substring(1));
              if (nextLevel <= headingLevel) {
                break;
              }
            }
            
            let collapsedBy = next.getAttribute('data-collapsed-by') || '';
            let sources = collapsedBy ? collapsedBy.split(' ') : [];
            
            if (isCollapsing) {
              if (!sources.includes(headingId)) {
                sources.push(headingId);
              }
            } else {
              sources = sources.filter(id => id !== headingId);
            }
            
            if (sources.length > 0) {
              next.setAttribute('data-collapsed-by', sources.join(' '));
              next.classList.add('collapsed-hidden');
            } else {
              next.removeAttribute('data-collapsed-by');
              next.classList.remove('collapsed-hidden');
            }
            
            next = next.nextElementSibling;
          }
        }

        // 確保目標元素是可見的（如果被收合則自動展開所有上層摺疊區段）
        function ensureElementVisible(el) {
          if (!el) return;
          
          // 1. 如果它是個被摺疊的標題，展開它自己
          if (el.classList.contains('collapsed')) {
            setHeadingCollapsedState(el, false);
          }
          
          // 2. 如果它被其他標題摺疊了，展開 those 標題
          const collapsedBy = el.getAttribute('data-collapsed-by');
          if (collapsedBy) {
            const parentIds = collapsedBy.split(' ');
            parentIds.forEach(id => {
              const parentHeading = document.getElementById(id);
              if (parentHeading && parentHeading.classList.contains('collapsed')) {
                setHeadingCollapsedState(parentHeading, false);
              }
            });
          }
        }

        // 全域事件委託：處理 TOC 連結點擊與左側三角形收折
        document.addEventListener('click', (e) => {
          const target = e.target;

          // 攔截所有指向當前頁面的內部錨點連結點擊（支援 #錨點 以及 當前檔名.md#錨點 等格式）
          const link = target.closest && target.closest('a');
          if (link && link.hash) {
            const normalizePath = (path) => {
              return decodeURIComponent(path || '').replace(/\\.html$/, '').replace(/\\\/$/, '');
            };
            const isSamePage = link.origin === window.location.origin && 
                               normalizePath(link.pathname) === normalizePath(window.location.pathname);
            if (isSamePage) {
              const id = link.hash.slice(1);
              const decodedId = decodeURIComponent(id);
              const el = findByIdCI(decodedId) ||
                         document.querySelector('[name="' + decodedId + '"]') ||
                         findByIdCI(id) ||
                         document.querySelector('[name="' + id + '"]');
              if (el) {
                e.preventDefault();
                
                // 自動展開目標元素及其父摺疊區
                ensureElementVisible(el);

                // 捲動到目標位置
                const contentEl = document.querySelector('.VPDoc > .container > .content');
                if (contentEl) {
                  const elTop = el.getBoundingClientRect().top + contentEl.scrollTop - contentEl.getBoundingClientRect().top - 24;
                  if (typeof contentEl.scrollTo === 'function') {
                    contentEl.scrollTo({ top: elTop, behavior: 'smooth' });
                  } else {
                    contentEl.scrollTop = elTop;
                  }
                } else {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                // 更新 hash
                history.pushState(null, null, link.hash);
              }
            }
            return;
          }

          // 左側三角形收折
          if (target && target.tagName && target.tagName.toLowerCase() === 'li') {
            const hasSub = target.querySelector('ul');
            if (hasSub) {
              const rect = target.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              if (clickX < 15) {
                e.preventDefault();
                e.stopPropagation();
                target.classList.toggle('collapsed');
              }
            }
          }
        });
        
        let observer = null;
        function initObserver() {
          if (observer) return;
          if (!document.body) return;
          observer = new MutationObserver(() => {
            const aside = document.querySelector('.aside');
            const btn = document.querySelector('.aside-toggle-btn');
            if (!aside && btn) {
              btn.remove();
              logDebug('Observer: removed toggle btn since no aside');
            } else if (aside && !btn) {
              setupToggle();
              logDebug('Observer: setup toggle btn');
            }

            const outline = document.querySelector('.VPDocAsideOutline');
            if (outline && !outline.querySelector('.outline-tools')) {
              setupOutlineToolbar();
              logDebug('Observer: setup outline toolbar');
            }
          });
          observer.observe(document.body, { childList: true, subtree: true });
          logDebug('Observer initialized');
        }

        // ===== 圖片點擊放大 Lightbox =====
        function setupImageZoom() {
          const content = document.querySelector('.VPDoc');
          if (!content) return;

          // 避免重複綁定，使用事件代理
          if (content._zoomInitialized) return;
          content._zoomInitialized = true;

          content.addEventListener('click', (e) => {
            const target = e.target;
            if (target && target.tagName && target.tagName.toLowerCase() === 'img') {
              if (target.classList.contains('medium-zoom-image-zoom')) return;

              // 建立燈箱 overlay
              const overlay = document.createElement('div');
              overlay.className = 'medium-zoom-overlay';

              const zoomedImg = document.createElement('img');
              zoomedImg.className = 'medium-zoom-image-zoom';
              zoomedImg.src = target.src;

              overlay.appendChild(zoomedImg);
              document.body.appendChild(overlay);

              // 動畫觸發
              setTimeout(() => {
                overlay.classList.add('show');
              }, 10);

              // 關閉燈箱
              const closeLightbox = () => {
                overlay.classList.remove('show');
                setTimeout(() => {
                  overlay.remove();
                }, 200);
              };

              overlay.addEventListener('click', closeLightbox);
              
              // 阻擋鍵盤 Esc 關閉
              const escHandler = (event) => {
                if (event.key === 'Escape') {
                  closeLightbox();
                  document.removeEventListener('keydown', escHandler);
                }
              };
              document.addEventListener('keydown', escHandler);
            }
          });
        }

        // ===== 內文標題階層收合 =====
        function setupHeaderFold() {
          const content = document.querySelector('.VPDoc > .container > .content');
          if (!content) return;
          
          if (content._headerFoldInitialized) return;
          content._headerFoldInitialized = true;

          // 定期掃描為所有 h1~h6 加上 toggle 按鈕（如果還沒有的話，僅在有複數 h1 時納入 h1）
          function refreshHeadingButtons() {
            const h1s = content.querySelectorAll('h1');
            const includeH1 = h1s.length > 1;
            const selector = includeH1 ? 'h1, h2, h3, h4, h5, h6' : 'h2, h3, h4, h5, h6';
            const headings = content.querySelectorAll(selector);
            headings.forEach(heading => {
              if (heading.querySelector('.header-fold-btn')) return;
              
              if (!heading.id) {
                heading.id = 'h-' + Math.random().toString(36).substr(2, 9);
              }

              const btn = document.createElement('span');
              btn.className = 'header-fold-btn';
              btn.innerHTML = '▼';
              btn.title = '收合/展開此區段';
              
              // 插在標題最前端
              heading.insertBefore(btn, heading.firstChild);
            });
          }

          // 定期掃描，因 SPA 換頁會重建 DOM
          refreshHeadingButtons();
          setInterval(refreshHeadingButtons, 500);

          content.addEventListener('click', (e) => {
            const btn = e.target.closest('.header-fold-btn');
            if (!btn) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            const heading = btn.parentElement;
            const isCollapsing = !heading.classList.contains('collapsed');
            setHeadingCollapsedState(heading, isCollapsing);
          });

          // 處理初始 URL Hash（展開摺疊並滾動）
          setTimeout(() => {
            const hash = window.location.hash;
            if (hash && hash.length > 1) {
              const id = hash.slice(1);
              const decodedId = decodeURIComponent(id);
              const el = findByIdCI(decodedId) ||
                         document.querySelector('[name="' + decodedId + '"]') ||
                         findByIdCI(id) ||
                         document.querySelector('[name="' + id + '"]');
              if (el) {
                ensureElementVisible(el);
                
                // 捲動到目標位置
                const contentEl = document.querySelector('.VPDoc > .container > .content');
                if (contentEl) {
                  const elTop = el.getBoundingClientRect().top + contentEl.scrollTop - contentEl.getBoundingClientRect().top - 24;
                  if (typeof contentEl.scrollTo === 'function') {
                    contentEl.scrollTo({ top: elTop });
                  } else {
                    contentEl.scrollTop = elTop;
                  }
                } else {
                  el.scrollIntoView({ block: 'start' });
                }
              }
            }
          }, 200);
        }

        logDebug('Script loaded');

        function initAll() {
          logDebug('initAll triggered, readyState: ' + document.readyState);
          initObserver();
          setTimeout(() => {
            logDebug('Timeout 500ms triggered, starting Interval');
            setInterval(() => {
              setupToggle();
              setupOutlineToolbar();
              handleActiveScroll();
              setupAsideResize();
              setupSidebarResize();
              setupContentScrollTracking();
              syncSidebarPositions();
              syncAsidePosition();
              setupImageZoom();
              setupHeaderFold();
            }, 500);

            setupToggle();
            setupOutlineToolbar();
            handleActiveScroll();
            setupAsideResize();
            setupSidebarResize();
            setupContentScrollTracking();
            syncAsidePosition();
            setupImageZoom();
            setupHeaderFold();
          }, 500);
        }

        if (document.readyState === 'complete' || document.readyState === 'interactive') {
          logDebug('Document already loaded/interactive, initializing immediately');
          initAll();
        } else {
          window.addEventListener('load', () => {
            logDebug('window load triggered, initializing');
            initAll();
          });
        }
        } catch (e) {
          if (typeof window !== 'undefined') {
            // 無條件將錯誤寫入隱藏的 DOM 元素以供 CLI 診斷
            try {
              const errDump = document.createElement('div');
              errDump.id = 'js-runtime-error-dump';
              errDump.style.display = 'none';
              errDump.textContent = e.message + ' | ' + e.stack;
              document.body.appendChild(errDump);
            } catch (innerErr) {}
            
            if (window.location && window.location.search && window.location.search.includes('debug')) {
              const errDiv = document.createElement('div');
              errDiv.style.position = 'fixed';
              errDiv.style.top = '0';
              errDiv.style.left = '0';
              errDiv.style.zIndex = '99999';
              errDiv.style.background = 'red';
              errDiv.style.color = 'white';
              errDiv.style.padding = '20px';
              errDiv.style.fontSize = '14px';
              errDiv.style.wordBreak = 'break-all';
              errDiv.innerHTML = 'JS ERROR: ' + e.message + '<br>' + e.stack;
              document.body.appendChild(errDiv);
            } else {
              console.error('JS ERROR: ', e);
            }
          }
        }
      })();
    `],
  ],
  ignoreDeadLinks: true,
  // 排除 assets 底下的附件 .md，避免被 VitePress 多編成無用的孤兒 .html 頁
  srcExclude: ['**/assets/**/*.md'],
  vite: {
    plugins: [obsidianPlugin]
  },
  async buildEnd(siteConfig) {
    const srcDir = path.resolve(siteConfig.srcDir || '.')
    const outDir = path.resolve(siteConfig.outDir)
    
    const wikiSrc = path.join(srcDir, 'wiki')
    const wikiDest = path.join(outDir, 'wiki')
    
    if (fs.existsSync(wikiSrc)) {
      console.log(`[buildEnd] Copying assets from ${wikiSrc} to ${wikiDest}...`)
      fs.cpSync(wikiSrc, wikiDest, {
        recursive: true,
        filter: (src) => {
          // assets 底下的 .md 是附件，要原樣複製供下載；其餘頁面 .md 不複製
          if (src.endsWith('.md')) {
            return src.includes('/assets/') || src.includes(path.sep + 'assets' + path.sep)
          }
          return true
        }
      })
      console.log(`[buildEnd] Copying completed successfully!`)
    }
  },
  themeConfig: {
    outline: {
      level: [1, 6],
      label: '本頁目錄'
    },
    nav: [
      { text: '首頁', link: '/' }
    ],
    sidebar: [],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/yaochangyu/md-to-web' }
    ]
  }
})
