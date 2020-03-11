
import fetch from "node-fetch";
import cheerio from "cheerio";
import { parse } from "url";
import path from "path";
import fs from "fs";

/**
 * 合并页面+资源URL地址
 * @param {string} pageUrl 页面URL地址
 * @param {string} resUrl 资源URL地址
 * @returns 合并后的地址
 */
export function combineResUrl(pageUrl: string, resUrl: string): string {
    if (/^https?:/g.test(resUrl) || resUrl.startsWith("//")) {
        return resUrl;
    }
    const parsedPageUrl = parse(pageUrl);
    const domain = `${parsedPageUrl.protocol}//${parsedPageUrl.host}`;
    if (resUrl[0] === "/") {
        return `${domain}${resUrl}`;
    }
    let combinedUrl = path.join(path.dirname(parsedPageUrl.pathname), resUrl);
    return `${domain}${combinedUrl}`;
}

/**
 * 获取页面上的资源URL地址(资源包括css, script, img, link)
 * @param pageUrl 页面URL地址
 * @returns 资源URL地址列表
 */
export async function getUrls(pageUrl: string): Promise<Array<{ type: string, url: string }>> {
    return fetch(pageUrl)
        .then(res => res.text())
        .then(html => {
            const $ = cheerio.load(html);
            const getUrls = (selector: string, attr: string): string[] => {
                return $(selector)
                    .map((index, ele) => ele.attribs[attr])
                    .get()
                    .filter(url => typeof url === "string" && url.length > 0);
            }
            const scriptUrls = getUrls("script", "src").map(url => ({
                type: "script",
                url: combineResUrl(pageUrl, url)
            }));
            const cssUrls = getUrls("link[rel=stylesheet]", "href").map(url => ({
                type: "css",
                url: combineResUrl(pageUrl, url)
            }));
            const imgUrls = getUrls("img", "src").map(url => ({
                type: "img",
                url: combineResUrl(pageUrl, url)
            }));
            const anchorUrls = getUrls("a", "href")
                .filter(url => !(url.toLowerCase().startsWith("javascript:") || url.toLowerCase().startsWith("#")))
                .map(url => ({
                    type: "link",
                    url: combineResUrl(pageUrl, url)
                }));

            return [...scriptUrls, ...cssUrls, ...imgUrls, ...anchorUrls];
        });
}

/**
 * 下载资源列表
 * @param urls URL列表
 * @param dir 保存目录
 * @param expandPath 是否展开URL路径(true 会根据URL路径创建子目录)
 * @returns
 */
export async function downloadResources(urls: string[], dir: string, expandPath: boolean): Promise<Array<{ success: boolean, url: string, error?: any, file?: string }>> {
    return Promise.all(urls.map(url => downloadResource(url, dir, expandPath)));
}

/**
 * 下载资源
 * @param url URL地址
 * @param dir 保存目录
 * @param expandPath 是否展开URL路径(true 会根据URL路径创建子目录)
 */
export async function downloadResource(url: string, dir: string, expandPath: boolean): Promise<{ success: boolean, url: string, error?: any, file?: string }> {
    return fetch(url).then(res => {
        const parsedUrl = parse(url);
        let destDir = dir;
        if (expandPath) {
            destDir = path.join(dir, path.dirname(parsedUrl.path));
        }
        fs.mkdirSync(destDir, {
            recursive: true
        });
        const fileFullPath = path.join(destDir, path.basename(parsedUrl.path));
        const destStream = fs.createWriteStream(fileFullPath);
        res.body.pipe(destStream);

        return {
            success: true,
            url: url,
            file: fileFullPath
        };
    }).catch(err => {
        return {
            success: false,
            url: url,
            error: err
        }
    });
}