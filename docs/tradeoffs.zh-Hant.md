# 取捨決策紀錄

## 靜態 App，而不是後端

決策：將所有設施資料放在 `public/data/` 底下作為靜態 JSON。

原因：兩份資料集都是公開、相對小、且此產品目前只需要讀取。靜態 hosting 可降低維運成本，不需要 API key，也更容易部署到 Vercel 或 GitHub Pages。

拒絕方案：後端 API 或 CMS。它會增加 hosting、驗證與維護負擔，但沒有解決目前的使用者問題。

## 通用 Facility 模型

決策：從只支援清潔箱的資料模型改為含有明確 `type` 的 `Facility`。

原因：行人專用清潔箱與狗便袋箱的意義和來源欄位不同。帶型別的模型可以讓標籤、提醒、篩選與 popup 保持正確，而不需要複製整個 app。

拒絕方案：把狗便袋箱硬塞進舊的 bin model。這會增加將狗便袋箱誤稱為垃圾桶的風險。

## 保留座標疑似異常列

決策：超出台北市寬鬆 bounding box 的座標會保留，標記 `isCoordinateOutlier: true`，並記錄在 `conversion-report.json`。

原因：可疑座標仍可能有人工查核價值，而且靜默刪除會隱藏資料品質問題。

拒絕方案：刪除所有超出範圍的列。這會讓資料看起來更乾淨，但可稽核性較差。

## OpenStreetMap + Leaflet，而不是 Google Maps API

決策：使用 Leaflet 搭配 OpenStreetMap 圖磚。

原因：不需要 API key，對公共設施查找已足夠，也讓任何人都能部署此專案。

拒絕方案：以 Google Maps embed/API 作為主地圖。App 仍提供 Google Maps 開啟連結，但若主地圖使用 Google Maps，會引入 key 管理與計費風險。

## 前端定位與距離計算

決策：在瀏覽器端用 Haversine 公式計算距離。

原因：使用者位置不需要離開裝置，而且目前資料量足以在本機排序。

拒絕方案：後端最近設施查詢。這會增加隱私與基礎設施成本，但目前沒有明確收益。

## Canvas Markers，而不是 Marker Clustering

決策：保留 Leaflet `CircleMarker` 與 `preferCanvas`，用不同顏色與圖例區分設施類型。

原因：約 1,700 個點仍可處理，canvas marker 也避免新增 clustering dependency。

取捨：密集區域仍可能重疊。若資料量增加或實測顯示地圖太擁擠，下一步再加入 marker clustering。

## 限制預設列表渲染

決策：預設列表只渲染前 80 筆，並顯示提示讓使用者用搜尋或篩選縮小範圍。

原因：一次渲染 1,707 筆列表對掃描不實用。需要特定位置的使用者更適合使用搜尋、行政區篩選、設施類型篩選或附近設施。

取捨：使用者不會在列表一次看到所有資料，但地圖仍顯示符合條件的 marker，總筆數也仍可見。

## Service Worker 策略

決策：navigation/app shell 使用 network-first，穩定的靜態資源與資料使用 cache-first。

原因：如果 app shell 使用 cache-first，使用者可能在部署後仍被舊版 `index.html` 卡住。Network-first 能維持部署更新，同時保留離線 fallback。

取捨：第一次 navigation 會優先使用網路，因此完整離線能力需要使用者先開過此 app。
