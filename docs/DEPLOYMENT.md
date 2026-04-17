---
created: 2026-04-10
updated: 2026-04-17
tags:
  - deployment
---

# 部署文件：知識大亂鬥 - 貓狗大戰

## 部署環境總覽

| 環境 | 說明 | 網址 | 狀態 |
|------|------|------|------|
| 課堂使用 | 直接開啟 index.html | - | 🟢 可用 |
| GitHub Pages | 靜態網頁部署 | https://uplilt31311227.github.io/knowledge-battle-game/ | 🟢 可用 |

## 前端網址

**正式網址**：https://uplilt31311227.github.io/knowledge-battle-game/

**GitHub Repo**：https://github.com/uplilt31311227/knowledge-battle-game

## 部署方式

### 直接使用

本專案為純前端應用，無需後端伺服器：

1. 開啟 `index.html`
2. 上傳 Excel/CSV 題庫
3. 開始遊戲

### GitHub Pages

1. 推送至 `master` 分支
2. GitHub Pages 自動部署

### 本地伺服器（可選）

```bash
# 使用 Python
python -m http.server 8000

# 瀏覽器開啟
# http://localhost:8000
```

## 技術棧

- 純前端：HTML + CSS + JavaScript
- Canvas 2D 遊戲渲染
- SheetJS (CDN) - Excel 讀取

## 檔案說明

| 檔案 | 說明 |
|------|------|
| `index.html` | 主頁面 |
| `style.css` | 樣式 |
| `main.js` | 遊戲邏輯 |
| `assets/` | 角色與道具素材 |
| `generate_assets.py` | 素材生成腳本 |

## 題庫格式

Excel (.xlsx) 或 CSV 格式，欄位：
- 題目
- 選項 A ~ D
- 正確解答
