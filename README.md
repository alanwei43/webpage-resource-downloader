# Web页面资源下载

使用 `npm install webpage-resource-downloader` 安装.

```javascript
import { getUrls, downloadResources } from "./util"

getUrls("https://hot.cnbeta.com/articles/movie/953697.htm")
    .then(resources => resources.filter(res => res.type === "img").map(res => res.url))
    .then(urls => downloadResources(urls, "out", true))
```