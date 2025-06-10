// ==UserScript==
// @name         長照小奴隸
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  努力打工的小奴隸
// @author       DDian
// @match        https://csms.mohw.gov.tw/lcms/*
// @match        https://luna.compal-health.com/*
// @grant        GM_xmlhttpRequest
// @connect      api.hlddian.com
// @updateURL    https://github.com/a59715a/ltc-slave/raw/refs/heads/main/ltc-slave.user.js
// @downloadURL  https://github.com/a59715a/ltc-slave/raw/refs/heads/main/ltc-slave.user.js
// ==/UserScript==

(function () {
    'use strict';

    // 常數定義
    const SYSTEM_NAME = '長照小奴隸';
    const MAX_RETRIES = 10;
    const REFRESH_DELAY = 500; // 圖片刷新等待時間（毫秒）
    const MIN_SIDEBAR_WIDTH = 200;
    const MAX_SIDEBAR_WIDTH = 1500;
    const SIDEBAR_INIT_DELAY = 1000;

    // 系統類型標識
    const SYSTEM_TYPES = {
        CSMS: 'CSMS照管系統',
        LUNA: 'LUNA仁寶i照護'
    };

    // 全域變數
    let retryCount = 0;
    let lastProcessedSrc = ''; // 記錄最後處理的圖片來源
    let isProcessing = false; // 防止重複處理的標記
    let isProcessingCalendarModal = false;
    let currentSystem = null; // 當前處理的系統類型

    // 主函數：初始化
    function initialize() {
        const currentURL = window.location.href;

        // 依據不同頁面執行對應功能
        if (currentURL.includes('luna.compal-health.com')) {
            currentSystem = SYSTEM_TYPES.LUNA;
            handleLunaSystem(currentURL);
        } else if (currentURL.includes('csms.mohw.gov.tw/lcms/')) {
            currentSystem = SYSTEM_TYPES.CSMS;
            handleCSMSSystem();
        }

        console.log(`${SYSTEM_NAME}: 當前系統 - ${currentSystem}`);
    }

    // ==================== LUNA 系統處理 ====================

    // 處理 LUNA 仁寶系統
    function handleLunaSystem(currentURL) {
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 檢測到仁寶系統頁面`);

        // 檢查是否為登入頁面
        if (currentURL.includes('/login')) {
            handleLunaLogin();
            return;
        }

        // 初始化側邊欄
        setTimeout(initializeLunaSideBar, SIDEBAR_INIT_DELAY);

        // 設置日曆卡片點擊監聽
        setupCalendarCardListener();

        // 設置DOM變化觀察器
        setupLunaDOMObserver();
    }

    // 處理 LUNA 登入頁面
    function handleLunaLogin() {
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 檢測到 LUNA 登入頁面 https://luna.compal-health.com/login`);

        // 設置驗證碼處理
        setupLunaCaptchaHandling();

        // 監聽登入表單
        setupLunaLoginFormHandler();

        console.log(`${SYSTEM_NAME} [${currentSystem}]: LUNA 登入頁面處理已初始化`);
    }

    // 設置 LUNA 驗證碼處理
    function setupLunaCaptchaHandling() {
        // 等待驗證碼元素加載
        const checkCaptchaElement = setInterval(() => {
            const captchaContainer = document.querySelector('.index-module_captchaContainer__10X9-');
            const refreshButton = document.querySelector('.index-module_refreshButton__REKEZ');

            if (captchaContainer && refreshButton) {
                clearInterval(checkCaptchaElement);
                console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到 LUNA 驗證碼容器`);

                // 檢查是否存在驗證碼 SVG 元素
                const allSVGs = document.querySelectorAll('.index-module_captchaContainer__10X9- svg');
                let foundCaptchaSVG = false;

                for (const svg of allSVGs) {
                    if (svg.getAttribute('width') === '120' && svg.getAttribute('height') === '50') {
                        foundCaptchaSVG = true;
                        console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到 LUNA 驗證碼 SVG 元素 (width=120, height=50)`);
                        break;
                    }
                }

                if (!foundCaptchaSVG) {
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到符合條件的 SVG 驗證碼元素，將持續監聽容器變化`);
                }

                // 處理當前驗證碼
                processLunaCaptcha();

                // 監聽刷新按鈕點擊
                refreshButton.addEventListener('click', () => {
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 驗證碼刷新按鈕被點擊`);
                    setTimeout(() => processLunaCaptcha(), REFRESH_DELAY);
                });

                // 找到驗證碼SVG元素
                let captchaSVG = null;
                for (const svg of allSVGs) {
                    if (svg.getAttribute('width') === '120' && svg.getAttribute('height') === '50') {
                        captchaSVG = svg;
                        break;
                    }
                }

                // 設置 DOM 變化觀察器，只監聽驗證碼SVG元素
                if (captchaSVG) {
                    const observer = new MutationObserver((mutations) => {
                        console.log(`${SYSTEM_NAME} [${currentSystem}]: 驗證碼SVG元素發生變化，重新處理驗證碼`);
                        setTimeout(() => processLunaCaptcha(), REFRESH_DELAY);
                    });

                    observer.observe(captchaSVG, {
                        attributes: true,
                        childList: true,
                        subtree: true
                    });
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 已設置驗證碼SVG元素監聽器`);
                } else {
                    // 如果找不到SVG元素，則監聽容器以等待SVG元素出現
                    const containerObserver = new MutationObserver((mutations) => {
                        // 檢查是否有SVG元素出現
                        const svgs = captchaContainer.querySelectorAll('svg');
                        for (const svg of svgs) {
                            if (svg.getAttribute('width') === '120' && svg.getAttribute('height') === '50') {
                                console.log(`${SYSTEM_NAME} [${currentSystem}]: 發現驗證碼SVG元素，開始處理`);
                                setTimeout(() => processLunaCaptcha(), REFRESH_DELAY);
                                break;
                            }
                        }
                    });

                    containerObserver.observe(captchaContainer, {
                        childList: true,
                        subtree: true
                    });
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到SVG元素，已設置容器監聽器等待SVG出現`);
                }
            }
        }, 500);
    }

    // 處理 LUNA 驗證碼
    function processLunaCaptcha() {
        if (isProcessing) return;

        // 正確抓取 SVG 驗證碼元素 - 篩選寬度為120、高度為50的SVG元素
        const allSVGs = document.querySelectorAll('.index-module_captchaContainer__10X9- svg');
        let captchaSVG = null;

        for (const svg of allSVGs) {
            if (svg.getAttribute('width') === '120' && svg.getAttribute('height') === '50') {
                captchaSVG = svg;
                break;
            }
        }

        if (!captchaSVG) {
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到驗證碼 SVG 元素 (width=120, height=50)`);
            return;
        }

        // 將 SVG 轉換為 Canvas 再轉為圖片
        isProcessing = true;

        try {
            const svgData = new XMLSerializer().serializeToString(captchaSVG);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const DOMURL = window.URL || window.webkitURL || window;
            const svgUrl = DOMURL.createObjectURL(svgBlob);

            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);

                const imgData = canvas.toDataURL('image/png');
                DOMURL.revokeObjectURL(svgUrl);

                console.log(`${SYSTEM_NAME} [${currentSystem}]: 驗證碼圖片已轉換，大小: ${Math.round((imgData.length - 22) / 4 * 3 / 1024)}KB`);

                // 調用 OCR API
                callOCRAPI(imgData);
            };

            img.onerror = function (error) {
                console.error(`${SYSTEM_NAME} [${currentSystem}]: SVG 轉換為圖片時發生錯誤:`, error);
                isProcessing = false;
            };

            img.src = svgUrl;
        } catch (error) {
            console.error(`${SYSTEM_NAME} [${currentSystem}]: 處理驗證碼時發生錯誤:`, error);
            isProcessing = false;
        }
    }

    // 填寫 LUNA 驗證碼輸入框
    function fillLunaCaptchaInput(captchaText, probability) {
        const captchaInput = document.querySelector('#verificationCode');
        if (captchaInput) {
            // 模擬人工打字效果
            captchaInput.focus();

            // 清空當前輸入
            captchaInput.value = '';
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            nativeInputValueSetter.call(captchaInput, '');
            captchaInput.dispatchEvent(new Event('input', { bubbles: true }));

            // 逐個字符輸入，模擬人工打字
            const typeCharacter = (index) => {
                if (index >= captchaText.length) {
                    // 打字完成後觸發事件
                    const changeEvent = new Event('change', { bubbles: true });
                    captchaInput.dispatchEvent(changeEvent);

                    console.log(`${SYSTEM_NAME} [${currentSystem}]: LUNA 驗證碼已模擬打字填寫:`, captchaText);
                    if (probability) {
                        console.log(`${SYSTEM_NAME} [${currentSystem}]: 辨識可信度:`, probability);
                    }

                    setTimeout(() => captchaInput.blur(), 150);
                    retryCount = 0; // 重置重試計數
                    return;
                }

                // 獲取當前值並添加新字符
                const currentValue = captchaInput.value;
                const newValue = currentValue + captchaText.charAt(index);

                // 設置新值
                nativeInputValueSetter.call(captchaInput, newValue);

                // 觸發輸入事件
                const inputEvent = new Event('input', { bubbles: true });
                captchaInput.dispatchEvent(inputEvent);

                // 設置隨機延遲，模擬人類打字速度
                const delay = 50 + Math.floor(Math.random() * 150);
                setTimeout(() => typeCharacter(index + 1), delay);
            };

            // 開始模擬打字
            setTimeout(() => typeCharacter(0), 100);
        } else {
            console.error(`${SYSTEM_NAME} [${currentSystem}]: 未找到驗證碼輸入框元素`);
        }
        isProcessing = false;
    }

    // 處理 LUNA 無效的驗證碼長度
    function handleLunaInvalidCaptchaLength(length) {
        console.log(`${SYSTEM_NAME} [${currentSystem}]: LUNA 驗證碼長度不正確:`, length, '碼');

        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 正在重試，第`, retryCount, '次');
            const refreshButton = document.querySelector('.index-module_refreshButton__REKEZ');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            console.error(`${SYSTEM_NAME} [${currentSystem}]: 已達到最大重試次數`);
            retryCount = 0; // 重置重試計數
            isProcessing = false;
        }
    }

    // 初始化 LUNA 側邊欄
    function initializeLunaSideBar() {
        const sidebar = document.querySelector('.SideBar');
        if (!sidebar) {
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到 SideBar 元素`);
            return;
        }

        console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到 SideBar 元素，添加調整功能`);

        // 創建調整器
        const resizer = createSidebarResizer();
        sidebar.style.position = 'relative';
        sidebar.appendChild(resizer);

        // 設置拖曳事件
        setupResizerEvents(sidebar, resizer);
    }

    // 創建側邊欄調整器
    function createSidebarResizer() {
        const resizer = document.createElement('div');
        resizer.className = 'sidebar-resizer';
        resizer.style.cssText = `
            width: 5px;
            height: 100%;
            background: #ccc;
            cursor: col-resize;
            position: absolute;
            right: 0;
            top: 0;
            z-index: 1000;
        `;
        return resizer;
    }

    // 設置調整器事件
    function setupResizerEvents(sidebar, resizer) {
        let isResizing = false;
        let startX = 0;
        let startWidth = 0;

        resizer.addEventListener('mousedown', (e) => {
            isResizing = true;
            startX = e.clientX;
            startWidth = sidebar.offsetWidth;
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;

            const width = startWidth + (e.clientX - startX);
            if (width >= MIN_SIDEBAR_WIDTH && width <= MAX_SIDEBAR_WIDTH) {
                sidebar.style.width = `${width}px`;
            }
        });

        document.addEventListener('mouseup', () => {
            isResizing = false;
            document.body.style.cursor = '';
        });
    }

    // 設置日曆卡片點擊監聽
    function setupCalendarCardListener() {
        document.addEventListener('click', function (e) {
            // 判斷點擊的元素或其所有父層是否有 Class 包含 "CalendarCard"
            let target = e.target;
            let searchCount = 0;
            const MAX_SEARCH_DEPTH = 3;

            while (target && target !== document && searchCount < MAX_SEARCH_DEPTH) {
                if (target.classList && Array.from(target.classList).some(className => className.includes('CalendarCard'))) {
                    setTimeout(processCalendarModal, 0);
                    break;
                }
                target = target.parentNode;
                searchCount++;
            }
        });
    }

    // 設置 LUNA DOM 變化觀察器
    function setupLunaDOMObserver() {
        const observer = new MutationObserver((mutations) => {
            // 這裡可以添加對 LUNA 系統 DOM 變化的處理邏輯
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 處理日曆模態框
    function processCalendarModal() {
        if (isProcessingCalendarModal) return;
        isProcessingCalendarModal = true;

        const calendarModal = document.getElementById('calendarOptionModal');
        if (!calendarModal || calendarModal.hidden) {
            isProcessingCalendarModal = false;
            console.log(`${SYSTEM_NAME} [${currentSystem}]: calendarOptionModal 不存在或隱藏`);
            return;
        }

        try {
            // 更新出勤時間顯示
            updateAttendanceTimeDisplay(calendarModal);

            // 添加關閉按鈕
            addCloseButtonToModal(calendarModal);

        } finally {
            isProcessingCalendarModal = false;
        }
    }

    // 添加關閉按鈕到模態框
    function addCloseButtonToModal(modal) {
        // 檢查是否已經存在關閉按鈕
        if (document.getElementById('ltc-tool-close-button')) {
            return;
        }

        // 查找modal-content元素
        const modalContent = modal.querySelector('.modal-content');
        if (!modalContent) {
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到modal-content元素，無法添加關閉按鈕`);
            return;
        }

        // 創建關閉按鈕
        const closeButton = document.createElement('button');
        closeButton.className = 'modal-close-btn';
        closeButton.id = 'ltc-tool-close-button';
        closeButton.innerHTML = '✖';
        closeButton.style.cssText = `
            position: absolute;
            top: 2rem;
            right: 2rem;
            width: 40px;
            height: 40px;
            background-color: #f44336;
            color: white;
            border: none;
            border-radius: 50%;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            z-index: 2000;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
            display: flex;
            justify-content: center;
            align-items: center;
            position: sticky;
            float: right;
        `;

        // 懸停效果
        closeButton.onmouseover = function () {
            this.style.backgroundColor = '#d32f2f';
        };
        closeButton.onmouseout = function () {
            this.style.backgroundColor = '#f44336';
        };

        // 點擊事件 - 模擬點擊原本的關閉按鈕
        closeButton.onclick = function () {
            // 查找原本的關閉按鈕
            const originalCloseButton = modal.querySelector('button.close[aria-label="Close"]');
            if (originalCloseButton) {
                console.log(`${SYSTEM_NAME} [${currentSystem}]: 模擬點擊原本的關閉按鈕`);
                originalCloseButton.click();
            } else {
                // 如果找不到原本的按鈕，嘗試其他可能的選擇器
                const alternativeCloseButton = modal.querySelector('.close') ||
                    modal.querySelector('[aria-label="Close"]') ||
                    modal.querySelector('[data-dismiss="modal"]');

                if (alternativeCloseButton) {
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 模擬點擊替代的關閉按鈕`);
                    alternativeCloseButton.click();
                } else {
                    // 如果仍然找不到，則使用原來的方法
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到原始關閉按鈕，使用hidden屬性關閉`);
                    modal.setAttribute('hidden', '');
                }
            }
        };

        // 創建一個包裝容器，用於固定位置
        const buttonWrapper = document.createElement('div');
        buttonWrapper.style.cssText = `
            position: sticky;
            top: 0;
            right: 0;
            float: right;
            width: 0;
            height: 0;
            overflow: visible;
            z-index: 2000;
        `;

        buttonWrapper.appendChild(closeButton);

        // 將包裝容器添加到modal-content的最前面
        if (modalContent.firstChild) {
            modalContent.insertBefore(buttonWrapper, modalContent.firstChild);
        } else {
            modalContent.appendChild(buttonWrapper);
        }

        console.log(`${SYSTEM_NAME} [${currentSystem}]: 已添加懸停式模態框關閉按鈕，ID: ltc-tool-close-button`);
    }

    // 更新出勤時間顯示
    function updateAttendanceTimeDisplay(calendarModal) {
        // 抓出calendarModal裡面所有class="shift-detail-option-modal row"的div
        const shiftDetailOptionModals = calendarModal.getElementsByClassName('shift-detail-option-modal row');

        const arrivalTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('抵達時間'));
        const leaveTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('離開時間'));

        if (!arrivalTimeDiv || !leaveTimeDiv) return;

        // 處理時間資料
        let attendanceTimeStart = arrivalTimeDiv.getElementsByTagName('div')[1].textContent.replaceAll(' ', '').trim();
        const attendanceTime = arrivalTimeDiv.getElementsByTagName('div')[2].textContent.replaceAll('時數:', '').trim();
        let attendanceTimeEnd = leaveTimeDiv.getElementsByTagName('div')[1].textContent
            .replaceAll('超出案家範圍', '')
            .replaceAll(' ', '').trim();
        // 如果開頭是0 就取代掉  例如  08:30 => 8:30
        attendanceTimeStart = attendanceTimeStart.replace(/^0/, '');
        attendanceTimeEnd = attendanceTimeEnd.replace(/^0/, '');
        // 檢查是否為補登
        let AfterWriteText = '';
        if (attendanceTimeStart.includes('補登') || attendanceTimeEnd.includes('補登')) {
            attendanceTimeStart = attendanceTimeStart.replaceAll('補登', '');
            attendanceTimeEnd = attendanceTimeEnd.replaceAll('補登', '');
            AfterWriteText = '<span class="label label-default" style="font-size: 8px; padding: 0.2em; background-color: rgb(220, 110, 32); margin-right: 5px;">補登</span>';
        }

        // 創建新的顯示元素
        const newDiv = createAttendanceTimeDiv(attendanceTimeStart, attendanceTimeEnd, attendanceTime, AfterWriteText);

        // 插入或更新元素
        insertOrUpdateAttendanceTimeDiv(calendarModal, shiftDetailOptionModals, newDiv);
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 打卡時間呈現時間已更新`);
    }

    // 創建出勤時間顯示元素
    function createAttendanceTimeDiv(start, end, duration, additionalText) {
        const div = document.createElement('div');
        div.className = 'shift-detail-option-modal row my-custom-attendance-time';
        div.innerHTML = `
            <div class="col-xs-3">打卡時間</div>
            <div class="col-xs-4"> [${start} - ${end}]${additionalText}</div>
            <div class="column-right col-xs-4">時數: ${duration}</div>
        `;
        return div;
    }

    // 插入或更新出勤時間顯示元素
    function insertOrUpdateAttendanceTimeDiv(modal, shiftDetailOptionModals, newDiv) {
        const serviceTimeDivIndex = Array.from(shiftDetailOptionModals).findIndex(div => div.textContent.includes('服務時段'));
        if (serviceTimeDivIndex === -1) return;

        // 檢查自訂的打卡時間div是否已存在
        const existingAttendanceTimeDiv = modal.querySelector('.my-custom-attendance-time');
        if (existingAttendanceTimeDiv) {
            existingAttendanceTimeDiv.replaceWith(newDiv);
        } else {
            // 先移除原有的打卡時間div（如果存在）
            const originalAttendanceTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('打卡時間'));
            if (originalAttendanceTimeDiv) {
                originalAttendanceTimeDiv.remove();
            }

            // 插入新的div
            shiftDetailOptionModals[serviceTimeDivIndex].parentNode.insertBefore(
                newDiv,
                shiftDetailOptionModals[serviceTimeDivIndex].nextSibling
            );
        }
    }

    // 設置 LUNA 登入表單處理
    function setupLunaLoginFormHandler() {
        // 等待表單元素加載
        const checkLoginForm = setInterval(() => {
            const loginForm = document.querySelector('form');
            const accountInput = document.querySelector('#account');
            const passwordInput = document.querySelector('#password');
            const captchaInput = document.querySelector('#verificationCode');

            if (loginForm && accountInput && passwordInput && captchaInput) {
                clearInterval(checkLoginForm);
                console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到 LUNA 登入表單`);

                // 監聽登入按鈕點擊
                const loginButton = document.querySelector('button[type="submit"]');
                if (loginButton) {
                    console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到 LUNA 登入按鈕，準備就緒`);

                    // 這裡預留自動填寫帳號密碼的功能
                    // TODO: 實現自動填寫帳號密碼功能
                }
            }
        }, 500);
    }

    // ==================== CSMS 系統處理 ====================

    // 處理 CSMS 照管系統
    function handleCSMSSystem() {
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 檢測到照管系統頁面`);

        // 檢查是否為登入頁面
        const loginDiv = document.querySelector('div.login-way-title');
        const isLoginPage = loginDiv && loginDiv.textContent.trim() === '帳號密碼登入';

        if (isLoginPage) {
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 找到登入頁面，開始初始化...`);
            setupCSMSCaptchaHandling();

            // 初始化時刷新驗證碼
            const refreshButton = document.querySelector('button[onclick*="refreshCaptcha"]');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 未找到登入頁面，不執行登入處理`);
        }
    }

    // 設置 CSMS 驗證碼處理
    function setupCSMSCaptchaHandling() {
        // 監聽驗證碼圖片變化
        const captchaDiv = document.getElementById('captchaDiv');
        if (captchaDiv) {
            const observer = new MutationObserver((mutations) => {
                for (const mutation of mutations) {
                    if (mutation.type === 'childList' || mutation.type === 'attributes') {
                        const captchaImage = document.querySelector('img[src*="captcha"]');
                        if (captchaImage && captchaImage.src !== lastProcessedSrc && !isProcessing) {
                            setTimeout(() => processCSMSCaptcha(), REFRESH_DELAY);
                            break;
                        }
                    }
                }
            });

            observer.observe(captchaDiv, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src']
            });
        }

        // 監聽換圖按鈕點擊
        const refreshButton = document.querySelector('button[onclick*="refreshCaptcha"]');
        if (refreshButton) {
            refreshButton.addEventListener('click', () => {
                // 按鈕點擊時不需要做任何事，因為圖片變化會觸發 MutationObserver
            });
        }
    }

    // 處理 CSMS 驗證碼
    function processCSMSCaptcha() {
        if (isProcessing) return;

        const captchaImage = document.querySelector('img[src*="captcha"]');
        if (!captchaImage || captchaImage.src === lastProcessedSrc) {
            return;
        }

        isProcessing = true;
        lastProcessedSrc = captchaImage.src;

        if (!captchaImage.complete) {
            captchaImage.onload = () => {
                captureAndProcessImage(captchaImage);
                isProcessing = false;
            };
        } else {
            captureAndProcessImage(captchaImage);
            isProcessing = false;
        }
    }

    // ==================== 通用 OCR 處理 ====================

    // 捕獲並處理圖片
    function captureAndProcessImage(captchaImage) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = captchaImage.width;
        canvas.height = captchaImage.height;
        context.drawImage(captchaImage, 0, 0, captchaImage.width, captchaImage.height);
        const base64Image = canvas.toDataURL('image/png');
        callOCRAPI(base64Image);
    }

    // 調用 OCR API
    function callOCRAPI(base64Image) {
        const base64Data = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 正在調用 OCR API，圖片大小: ${Math.round(base64Data.length / 1024)}KB`);
        // 調用 API 進行 OCR 辨識
        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://api.hlddian.com/ddocr/ocr/base64',
            data: JSON.stringify({ image: base64Data }),
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            onload: handleOCRResponse,
            onerror: handleOCRError
        });
    }

    // 處理 OCR 響應
    function handleOCRResponse(response) {
        try {
            const result = JSON.parse(response.responseText);
            console.log(`${SYSTEM_NAME} [${currentSystem}]: OCR 響應:`, result);

            if (result.success && result.result) {
                if (currentSystem === SYSTEM_TYPES.CSMS) {
                    if (result.result.length === 6) {
                        fillCaptchaInput(result.result, result.probability);
                    } else {
                        handleInvalidCaptchaLength(result.result.length);
                    }
                } else if (currentSystem === SYSTEM_TYPES.LUNA) {
                    // LUNA 系統驗證碼處理
                    if (result.result.length === 4) {
                        fillLunaCaptchaInput(result.result, result.probability);
                    } else {
                        handleLunaInvalidCaptchaLength(result.result.length);
                    }
                }
            } else {
                console.error(`${SYSTEM_NAME} [${currentSystem}]: OCR 辨識失敗:`, result.message);
                isProcessing = false;
            }
        } catch (e) {
            console.error(`${SYSTEM_NAME} [${currentSystem}]: 解析 OCR 響應失敗:`, e);
            isProcessing = false;
        }
    }

    // 處理 OCR 錯誤
    function handleOCRError(error) {
        console.error(`${SYSTEM_NAME} [${currentSystem}]: OCR API 調用失敗:`, error);
        isProcessing = false;
    }

    // 填寫驗證碼輸入框
    function fillCaptchaInput(captchaText, probability) {
        const captchaInput = document.querySelector('input[name="captcha"]');
        if (captchaInput) {
            captchaInput.value = captchaText;
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 驗證碼已自動填寫:`, captchaText);
            if (probability) {
                console.log(`${SYSTEM_NAME} [${currentSystem}]: 辨識可信度:`, probability);
            }
            retryCount = 0; // 重置重試計數
        }
        isProcessing = false;
    }

    // 處理無效的驗證碼長度
    function handleInvalidCaptchaLength(length) {
        console.log(`${SYSTEM_NAME} [${currentSystem}]: 驗證碼長度不正確:`, length, '碼');

        if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`${SYSTEM_NAME} [${currentSystem}]: 正在重試，第`, retryCount, '次');
            const refreshButton = document.querySelector('button[onclick*="refreshCaptcha"]');
            if (refreshButton) {
                refreshButton.click();
            }
        } else {
            console.error(`${SYSTEM_NAME} [${currentSystem}]: 已達到最大重試次數`);
            retryCount = 0; // 重置重試計數
            isProcessing = false;
        }
    }

    // 等待頁面加載完成後初始化
    window.addEventListener('load', initialize);
})();