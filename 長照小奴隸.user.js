    // ==UserScript==
    // @name         長照小奴隸
    // @namespace    http://tampermonkey.net/
    // @version      0.1
    // @description  努力打工的小奴隸
    // @author       DDian
    // @match        https://csms.mohw.gov.tw/lcms/*
    // @match        https://luna.compal-health.com/case/hcCaseShift/*
    // @grant        GM_xmlhttpRequest
    // @connect      api.hlddian.com
    // @updateURL    https://github.com/a59715a/ltc-slave/raw/refs/heads/main/ltc-slave.user.js
    // @downloadURL  https://github.com/a59715a/ltc-slave/raw/refs/heads/main/ltc-slave.user.js
    // ==/UserScript==

    (function () {
        'use strict';

        // 全域變數
        let retryCount = 0;
        const MAX_RETRIES = 10;
        const REFRESH_DELAY = 500; // 圖片刷新等待時間（毫秒）
        let lastProcessedSrc = ''; // 記錄最後處理的圖片來源
        let isProcessing = false; // 防止重複處理的標記
        let SYSTEM_NAME = '長照小奴隸';
        let isProcessingCalendarModal = false;

        // 主函數：初始化
        function initialize() {
            // 檢查是否在仁寶系統頁面
            if (window.location.href.includes('luna.compal-health.com')) {
                SideBar();
                if (window.location.href.includes('luna.compal-health.com/case/hcCaseShift/')) {
                    handleLunaPage();
                    return;
                }
            }

            // 檢查頁面是否包含登入區塊
            const loginDiv = document.querySelector('div.login-way-title');
            // 檢查是否包含登入區塊 csms.mohw.gov.tw/lcms/
            const isLoginPage = loginDiv && loginDiv.textContent.trim() === '帳號密碼登入' || window.location.href.includes('csms.mohw.gov.tw/lcms/');

            if (isLoginPage) {
                console.log('找到登入頁面，開始初始化...');
                setupEventListeners();
                // 初始化時不自動處理，等待頁面完全載入後的第一次刷新
                const refreshButton = document.querySelector('button[onclick*="refreshCaptcha"]');
                if (refreshButton) {
                    refreshButton.click();
                }
            } else {
                console.log('未找到登入頁面，不執行初始化');
            }
        }
        // SideBar
        function SideBar() {
            // 添加 SideBar 拖曳調整寬度功能
            const sidebar = document.querySelector('.SideBar');
            if (sidebar) {
                console.log(SYSTEM_NAME, '找到 SideBar 元素');
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
                sidebar.style.position = 'relative';
                sidebar.appendChild(resizer);

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
                    if (width >= 200 && width <= 1500) { // 限制最小和最大寬度
                        sidebar.style.width = `${width}px`;
                    }
                });

                document.addEventListener('mouseup', () => {
                    isResizing = false;
                    document.body.style.cursor = '';
                });
            } else {
                console.log(SYSTEM_NAME, '未找到 SideBar 元素');
            }
        }

        // 處理仁寶系統頁面
        function handleLunaPage() {
            console.log(SYSTEM_NAME, '開始處理仁寶系統頁面');

            // 監聽所有 CalendarCard 被點擊 執行 processCalendarModal
            document.addEventListener('click', function (e) {
                // 判斷點擊的元素或其所有父層是否有 Class 包含 "CalendarCard"
                let target = e.target;
                let searchCount = 0;
                const MAX_SEARCH_DEPTH = 3;

                while (target && target !== document && searchCount < MAX_SEARCH_DEPTH) {
                    if (target.classList) {
                        const classList = Array.from(target.classList);
                        if (classList.some(className => className.includes('CalendarCard'))) {
                            setTimeout(() => {
                                processCalendarModal();
                            }, 0);
                            break;
                        }
                    }
                    target = target.parentNode;
                    searchCount++;
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        function processCalendarModal() {
            if (isProcessingCalendarModal) return; // 再加一道保險
            isProcessingCalendarModal = true;
            const calendarModal = document.getElementById('calendarOptionModal');
            if (!calendarModal || calendarModal.hidden) {
                isProcessingCalendarModal = false;
                console.log(SYSTEM_NAME, 'calendarOptionModal 不存在或隱藏');
                return;
            }

            // 抓出calendarModal裡面所有class="shift-detail-option-modal row"的div
            const shiftDetailOptionModals = calendarModal.getElementsByClassName('shift-detail-option-modal row');

            const arrivalTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('抵達時間'));
            const leaveTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('離開時間'));

            if (arrivalTimeDiv && leaveTimeDiv) {
                let attendanceTimeStart = arrivalTimeDiv.getElementsByTagName('div')[1].textContent.replaceAll(' ', '').trim();
                const attendanceTime = arrivalTimeDiv.getElementsByTagName('div')[2].textContent.replaceAll('時數:', '').trim();
                let attendanceTimeEnd = leaveTimeDiv.getElementsByTagName('div')[1].textContent
                    .replaceAll('超出案家範圍', '')
                    .replaceAll(' ', '').trim();
                let AfterWriteText = '';
                if (attendanceTimeStart.includes('補登') || attendanceTimeEnd.includes('補登')) {
                    attendanceTimeStart = attendanceTimeStart.replaceAll('補登', '');
                    attendanceTimeEnd = attendanceTimeEnd.replaceAll('補登', '');
                    AfterWriteText = '<span class="label label-default" style="font-size: 8px; padding: 0.2em; background-color: rgb(220, 110, 32); margin-right: 5px;">補登</span>';
                }

                const newDiv = document.createElement('div');
                newDiv.className = 'shift-detail-option-modal row my-custom-attendance-time';
                newDiv.innerHTML = `
                        <div class="col-xs-3">打卡時間</div>
                        <div class="col-xs-4"> [${attendanceTimeStart} - ${attendanceTimeEnd}]${AfterWriteText}</div>
                        <div class="column-right col-xs-4">時數: ${attendanceTime}</div>
                    `;
                const serviceTimeDivIndex = Array.from(shiftDetailOptionModals).findIndex(div => div.textContent.includes('服務時段'));
                if (serviceTimeDivIndex !== -1) {
                    // 先檢查自訂的打卡時間div是否已存在
                    if (!calendarModal.querySelector('.my-custom-attendance-time')) {
                        const existingAttendanceTimeDiv = Array.from(shiftDetailOptionModals).find(div => div.textContent.includes('打卡時間'));
                        if (existingAttendanceTimeDiv) {
                            existingAttendanceTimeDiv.remove();
                        }
                        shiftDetailOptionModals[serviceTimeDivIndex].parentNode.insertBefore(
                            newDiv,
                            shiftDetailOptionModals[serviceTimeDivIndex].nextSibling
                        );
                    } else {
                        // 替換
                        const existingAttendanceTimeDiv = calendarModal.querySelector('.my-custom-attendance-time');
                        existingAttendanceTimeDiv.replaceWith(newDiv);
                    }
                }
            }
            isProcessingCalendarModal = false;
        }

        // 設置事件監聽器
        function setupEventListeners() {
            // 監聽圖片變化
            const captchaDiv = document.getElementById('captchaDiv');
            if (captchaDiv) {
                const observer = new MutationObserver((mutations) => {
                    for (const mutation of mutations) {
                        if (mutation.type === 'childList' || mutation.type === 'attributes') {
                            const captchaImage = document.querySelector('img[src*="captcha"]');
                            if (captchaImage && captchaImage.src !== lastProcessedSrc && !isProcessing) {
                                setTimeout(() => processCaptcha(), REFRESH_DELAY);
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

        // 處理驗證碼
        function processCaptcha() {
            if (isProcessing) return; // 如果正在處理中，直接返回

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
                console.log('OCR 響應:', result);

                if (result.success && result.result) {
                    if (result.result.length === 6) {
                        fillCaptchaInput(result.result, result.probability);
                    } else {
                        handleInvalidCaptchaLength(result.result.length);
                    }
                } else {
                    console.error('OCR 辨識失敗:', result.message);
                    isProcessing = false;
                }
            } catch (e) {
                console.error('解析 OCR 響應失敗:', e);
                isProcessing = false;
            }
        }

        // 處理 OCR 錯誤
        function handleOCRError(error) {
            console.error('OCR API 調用失敗:', error);
            isProcessing = false;
        }

        // 填寫驗證碼輸入框
        function fillCaptchaInput(captchaText, probability) {
            const captchaInput = document.querySelector('input[name="captcha"]');
            if (captchaInput) {
                captchaInput.value = captchaText;
                console.log('驗證碼已自動填寫:', captchaText);
                if (probability) {
                    console.log('辨識可信度:', probability);
                }
                retryCount = 0; // 重置重試計數
            }
            isProcessing = false;
        }

        // 處理無效的驗證碼長度
        function handleInvalidCaptchaLength(length) {
            console.log('驗證碼長度不正確:', length, '碼');

            if (retryCount < MAX_RETRIES) {
                retryCount++;
                console.log('正在重試，第', retryCount, '次');
                const refreshButton = document.querySelector('button[onclick*="refreshCaptcha"]');
                if (refreshButton) {
                    refreshButton.click();
                }
            } else {
                console.error('已達到最大重試次數');
                retryCount = 0; // 重置重試計數
                isProcessing = false;
            }
        }

        // 等待頁面加載完成後初始化
        window.addEventListener('load', initialize);
    })(); 