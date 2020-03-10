"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fetch_1 = __importDefault(require("node-fetch"));
const cheerio_1 = __importDefault(require("cheerio"));
const url_1 = require("url");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * 合并页面+资源URL地址
 * @param {string} pageUrl 页面URL地址
 * @param {string} resUrl 资源URL地址
 * @returns 合并后的地址
 */
function combineResUrl(pageUrl, resUrl) {
    if (/^https?:/g.test(resUrl) || resUrl.startsWith("//")) {
        return resUrl;
    }
    const parsedPageUrl = url_1.parse(pageUrl);
    const domain = `${parsedPageUrl.protocol}//${parsedPageUrl.host}`;
    if (resUrl[0] === "/") {
        return `${domain}${resUrl}`;
    }
    let combinedUrl = path_1.default.join(path_1.default.dirname(parsedPageUrl.pathname), resUrl);
    return `${domain}${combinedUrl}`;
}
exports.combineResUrl = combineResUrl;
/**
 * 获取页面上的资源URL地址(资源包括css, script, img, link)
 * @param pageUrl 页面URL地址
 * @returns 资源URL地址列表
 */
function getUrls(pageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        return node_fetch_1.default(pageUrl)
            .then(res => res.text())
            .then(html => {
            const $ = cheerio_1.default.load(html);
            const getUrls = (selector, attr) => {
                return $(selector)
                    .map((index, ele) => ele.attribs[attr])
                    .get()
                    .filter(url => typeof url === "string" && url.length > 0);
            };
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
    });
}
exports.getUrls = getUrls;
/**
 * 下载资源列表
 * @param urls URL列表
 * @param dir 保存目录
 * @param expandPath 是否展开URL路径(true 会根据URL路径创建子目录)
 * @returns
 */
function downloadResources(urls, dir, expandPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(urls.map(url => downloadResource(url, dir, expandPath)));
    });
}
exports.downloadResources = downloadResources;
/**
 * 下载资源
 * @param url URL地址
 * @param dir 保存目录
 * @param expandPath 是否展开URL路径(true 会根据URL路径创建子目录)
 */
function downloadResource(url, dir, expandPath) {
    return __awaiter(this, void 0, void 0, function* () {
        return node_fetch_1.default(url).then(res => {
            const parsedUrl = url_1.parse(url);
            let destDir = dir;
            if (expandPath) {
                destDir = path_1.default.join(dir, path_1.default.dirname(parsedUrl.path));
                fs_1.default.mkdirSync(destDir, {
                    recursive: true
                });
            }
            const fileFullPath = path_1.default.join(destDir, path_1.default.basename(parsedUrl.path));
            const destStream = fs_1.default.createWriteStream(fileFullPath);
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
            };
        });
    });
}
exports.downloadResource = downloadResource;
//# sourceMappingURL=util.js.map