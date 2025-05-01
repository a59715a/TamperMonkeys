// ==UserScript==
// @name         廣告掃地僧
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  優化多個新聞網站體驗
// @author       HLDDian
// @match        https://*.hsnews.com.tw/*
// @match        https://*.udn.com/*
// @match        https://*.ettoday.net/*
// @match        https://*.ltn.com.tw/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 獲取當前網址
    const currentURL = window.location.href;

    // 等待頁面完全載入
    window.addEventListener('load', function() {
        // 依據不同網站執行不同的優化
        if (/hsnews\.com\.tw/.test(currentURL)) {
            // 花蓮最速報的優化
            optimizeHSNews();
        } else if (/udn\.com/.test(currentURL)) {
            // 聯合新聞網的優化
            optimizeUDN();
        } else if (/ettoday\.net/.test(currentURL)) {
            // ETtoday的優化
            optimizeETtoday();
        } else if (/ltn\.com\.tw/.test(currentURL)) {
            // 自由時報的優化
            optimizeLTN();
        }
    });

    // 花蓮最速報優化函數
    function optimizeHSNews() {
        // 隱藏文章中廣告圖
        const banners = document.querySelectorAll('.mod-banners.bannergroup');
        banners.forEach(banner => {
            banner.style.display = 'none';
        });

        // 移除廣告
        const ads = document.querySelectorAll('.ad, .advertisement');
        ads.forEach(ad => ad.remove());

        // 優化閱讀體驗
        // const articleContent = document.querySelector('.article-content');
        // if (articleContent) {
        //     articleContent.style.fontSize = '18px';
        //     articleContent.style.lineHeight = '1.8';
        // }

        // 隱藏Google Adsense廣告
        const hideAds = () => {
            // 隱藏所有 Google Adsense 廣告
            const adElements = document.querySelectorAll('.adsbygoogle');
            adElements.forEach(ad => {
                ad.style.display = 'none';
            });

            // 隱藏側邊欄廣告及其相關元素
            const sideRailElements = document.querySelectorAll('.adsbygoogle-noablate, .left-side-rail-edge, .left-side-rail-dismiss-btn');
            sideRailElements.forEach(element => {
                element.style.display = 'none !important';
                element.classList.add('d-none');
            });

            // 隱藏 Google 廣告 iframe
            const adIframes = document.querySelectorAll('iframe[id^="aswift_"]');
            adIframes.forEach(iframe => {
                iframe.style.display = 'none';
            });

            // 隱藏廣告容器
            const adContainers = document.querySelectorAll('[id^="google_ads_"]');
            adContainers.forEach(container => {
                container.style.display = 'none';
            });
        };

        // 頁面載入完成後執行
        hideAds();

        // 動態內容變化時也執行
        const observer = new MutationObserver(hideAds);
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 聯合新聞網優化函數
    function optimizeUDN() {

        // 移除電商區塊
        const ecSections = document.querySelectorAll('[class*="ec-section"]');
        ecSections.forEach(section => {
            section.remove();
        });

        // 其他 UDN 特定的廣告元素
        const otherAds = document.querySelectorAll('.ads, .ad-container, [class*="ad-"]');
        otherAds.forEach(ad => {
            ad.classList.add('d-none');
        });

        console.log('UDN optimization loaded');
    }

    // ETtoday優化函數
    function optimizeETtoday() {
        // 這裡放置ETtoday的優化代碼
        console.log('ETtoday optimization loaded');
    }

    // 自由時報優化函數
    function optimizeLTN() {
        // 這裡放置自由時報的優化代碼
        console.log('LTN optimization loaded');
    }
})();