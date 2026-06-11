# 取捨決策紀錄

## 靜態 App，而不是後端

決策：將所有清潔箱資料放在 `public/data/` 底下作為靜態 JSON。

原因：此資料集是公開、相對小、且此產品目前只需要讀取。靜態 hosting 可降低維運成本，不需要 API key，也更容易部署到 Vercel 或 GitHub Pages。

拒絕方案：後端 API 或 CMS。它會增加 hosting、驗證與維護負擔，但沒有解決目前的使用者問題。

## OpenStreetMap + Leaflet，而不是 Google Maps API

決策：使用 Leaflet 搭配 OpenStreetMap 圖磚。

原因：不需要 API key，對公共清潔箱查找已足夠，也讓任何人都能部署此專案。

拒絕方案：以 Google Maps embed/API 作為主地圖。App 仍提供 Google Maps 開啟連結，但若主地圖使用 Google Maps，會引入 key 管理與計費風險。

## 前端定位與距離計算

決策：在瀏覽器端用 Haversine 公式計算距離。

原因：使用者位置不需要離開裝置，而且目前資料量足以在本機排序。

拒絕方案：後端最近清潔箱查詢。這會增加隱私與基礎設施成本，但目前沒有明確收益。

## Lazy-Loaded Map Chunk

決策：將 Leaflet 地圖程式碼 lazy-load。

原因：Lighthouse 顯示如果 app shell 與完整地圖 bundle 一起載入，初始 main-thread cost 會偏高。拆出地圖 chunk 可以讓標題、控制列與警示更早可用。

取捨：地圖會有短暫 loading state。這可以接受，因為搜尋、列表與警示仍會先顯示。

## 限制預設列表渲染

決策：預設列表只渲染前 80 筆，並顯示提示讓使用者用搜尋或行政區縮小範圍。

原因：一次渲染 1,197 筆列表對掃描不實用，也會影響效能。需要特定位置的使用者更適合使用搜尋、行政區篩選或附近清潔箱。

取捨：使用者不會在列表一次看到所有資料，但地圖仍顯示符合條件的 marker，總筆數也仍可見。

## Service Worker 策略

決策：navigation/app shell 使用 network-first，穩定的靜態資源與資料使用 cache-first。

原因：如果 app shell 使用 cache-first，使用者可能在部署後仍被舊版 `index.html` 卡住。Network-first 能維持部署更新，同時保留離線 fallback。

取捨：第一次 navigation 會優先使用網路，因此完整離線能力需要使用者先開過此 app。
