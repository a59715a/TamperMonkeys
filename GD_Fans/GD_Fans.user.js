// ==UserScript==
// @name         GD Fans
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  auto select ticket 
// @author       Your name
// @match        https://kktix.com/events/58652d0a/registrations/new
// @match        https://kktix.com/events/rklrwd/registrations/new
// @grant        none
// ==/UserScript==

(function () {
    'use strict';


    // 套用自動選票網址
    const kktixSelectTicket = [
        'https://kktix.com/events/58652d0a/registrations/new', // GD Fans
        'https://kktix.com/events/rklrwd/registrations/new', // test
    ]
    // 自動選票
    if (kktixSelectTicket.includes(window.location.href)) {
        const RETRY_TIMEOUT = 300; // 重試間隔毫秒數 目前應該沒屁用 應該是改好玩的
        const CHECK_INTERVAL = 100; // 檢查票券的間隔毫秒數
        // 目標票種配置
        const targetTickets = [
            {
                name: "黃2C",
                price: "7280",
                quantity: 1,
                alternatives: [
                    { name: "黃2B", price: "7280" },
                    { name: "黃2D", price: "7280" },
                    { name: "黃2A", price: "7280" },
                    { name: "黃2E", price: "7280" }
                ]
            },
            {
                name: "黃3C",
                price: "800",
                quantity: 1,
                alternatives: [
                    { name: "黃3H", price: "800" },
                    { name: "黃3D", price: "800" },
                    { name: "黃3E", price: "800" },
                    { name: "黃3F", price: "800" },
                    { name: "黃3G", price: "800" }
                ]
            },
            // {
            //     name: "VVIP 2",
            //     price: "8,960",
            //     quantity: 1,
            //     alternatives: [
            //         { name: "黃4B", price: "8,960" },
            //         { name: "黃4D", price: "8,960" },
            //         { name: "黃4A", price: "8,960" },
            //         { name: "黃4E", price: "8,960" }
            //     ]
            // },
            // {
            //     name: "紅1A",
            //     price: "7,880",
            //     quantity: 1,
            //     alternatives: [
            //         { name: "黃4B", price: "7,880" },
            //         { name: "黃4D", price: "7,880" },
            //         { name: "黃4A", price: "7,880" },
            //         { name: "黃4E", price: "7,880" }
            //     ]
            // },
            // {
            //     name: "VIP",
            //     price: "7,960",
            //     quantity: 1,
            //     alternatives: [
            //         { name: "黃4B", price: "7,960" },
            //         { name: "黃4D", price: "7,960" },
            //         { name: "黃4A", price: "7,960" },
            //         { name: "黃4E", price: "7,960" }
            //     ]
            // },
            // {
            //     name: "黃3F",
            //     price: "5,580",
            //     quantity: 1,
            //     alternatives: [
            //         { name: "黃4B", price: "5,580" },
            //         { name: "黃4D", price: "5,580" },
            //         { name: "黃4A", price: "5,580" },
            //         { name: "黃4E", price: "5,580" }
            //     ]
            // },
            // {
            //     name: "早鳥預售單日",
            //     price: "500",
            //     quantity: 1,
            //     alternatives: [
            //         { name: "普通預售單日", price: "650", }
            //     ]
            // },
            // {
            //     name: "普通預售三日",
            //     price: "1600",
            //     quantity: 1,
            //     alternatives: [
            //     ]
            // },
        ];
        // 任務清單
        const tasks = {
            init: {
                name: '初始化腳本',
                status: 'pending',
                steps: [
                    { name: '設置 retry_timeout', status: 'pending' },
                    { name: '設置頁面監聽器', status: 'pending' }
                ]
            },
            ticket: {
                name: '票券選擇',
                status: 'pending',
                steps: [
                    { name: '檢查票券狀態', status: 'pending' },
                    { name: '選擇主要票種', status: 'pending' },
                    { name: '選擇替代票種', status: 'pending' }
                ]
            },
            agreement: {
                name: '同意條款',
                status: 'pending',
                steps: [
                    { name: '檢查同意條款狀態', status: 'pending' },
                    { name: '勾選同意條款', status: 'pending' }
                ]
            },
            submit: {
                name: '提交訂單',
                status: 'pending',
                steps: [
                    { name: '檢查提交按鈕', status: 'pending' },
                    { name: '點擊提交按鈕', status: 'pending' }
                ]
            }
        };

        // 更新任務狀態
        function updateTaskStatus(taskGroup, stepIndex, status) {
            if (tasks[taskGroup] && tasks[taskGroup].steps[stepIndex]) {
                tasks[taskGroup].steps[stepIndex].status = status;
                logTaskStatus();
            }
        }

        // 更新任務組狀態
        function updateTaskGroupStatus(taskGroup, status) {
            if (tasks[taskGroup]) {
                tasks[taskGroup].status = status;
                logTaskStatus();
            }
        }

        // 輸出任務狀態
        function logTaskStatus() {
            console.log('=== 任務狀態更新 ===');
            Object.keys(tasks).forEach(group => {
                console.log(`\n${tasks[group].name} [${tasks[group].status}]`);
                tasks[group].steps.forEach((step, index) => {
                    console.log(`  ${index + 1}. ${step.name} [${step.status}]`);
                });
            });
            console.log('\n==================');
        }

        console.log('腳本開始執行');
        updateTaskGroupStatus('init', 'running');

        // 在腳本開始時就修改 retry_timeout
        if (typeof TIXGLOBAL === 'undefined') {
            window.TIXGLOBAL = {
                queueApi: {
                    retry_timeout: RETRY_TIMEOUT.toString()
                }
            };
            updateTaskStatus('init', 0, 'completed');
        } else if (TIXGLOBAL.queueApi) {
            console.log('原始 retry_timeout:', TIXGLOBAL.queueApi.retry_timeout);
            TIXGLOBAL.queueApi.retry_timeout = RETRY_TIMEOUT.toString();
            console.log('修改後 retry_timeout:', TIXGLOBAL.queueApi.retry_timeout);
            updateTaskStatus('init', 0, 'completed');
        }

        // 監聽 TIXGLOBAL 的變化
        const observer = new MutationObserver((mutations) => {
            if (window.TIXGLOBAL && window.TIXGLOBAL.queueApi) {
                if (window.TIXGLOBAL.queueApi.retry_timeout !== RETRY_TIMEOUT.toString()) {
                    console.log(`檢測到 retry_timeout 被重置，重新設置為 ${RETRY_TIMEOUT}`);
                    window.TIXGLOBAL.queueApi.retry_timeout = RETRY_TIMEOUT.toString();
                }
            }
        });

        // 開始觀察整個文檔的變化
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        updateTaskStatus('init', 1, 'completed');
        updateTaskGroupStatus('init', 'completed');


        // 檢查票券狀態
        function checkTicketStatus(element) {
            updateTaskStatus('ticket', 0, 'running');
            const text = element.textContent;
            const isAvailable = !(text.includes("已售完") || text.includes("暫無票券"));
            console.log('檢查票券狀態:', text, '是否可選:', isAvailable);
            updateTaskStatus('ticket', 0, isAvailable ? 'completed' : 'failed');
            return isAvailable;
        }

        // 檢查票券是否可購買
        function isTicketPurchasable(element) {
            const quantityElement = element.querySelector('.ticket-quantity input[type="text"]');
            return quantityElement !== null;
        }

        // 勾選同意條款
        function checkAgreement() {
            updateTaskGroupStatus('agreement', 'running');
            updateTaskStatus('agreement', 0, 'running');
            console.log('檢查同意條款狀態...');
            const agreeCheckbox = document.getElementById('person_agree_terms');

            if (agreeCheckbox) {
                console.log('找到同意條款 checkbox');
                updateTaskStatus('agreement', 0, 'completed');
                updateTaskStatus('agreement', 1, 'running');

                if (!agreeCheckbox.checked) {
                    console.log('勾選同意條款');
                    // 使用 Angular 的 $apply 來確保在 Angular 的 digest cycle 中執行
                    const scope = angular.element(agreeCheckbox).scope();
                    if (scope) {
                        scope.$apply(() => {
                            // 設置 checkbox 的 checked 屬性
                            agreeCheckbox.checked = true;
                            // 觸發 change 事件
                            agreeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                            // 觸發 input 事件
                            agreeCheckbox.dispatchEvent(new Event('input', { bubbles: true }));
                            // 觸發 click 事件
                            agreeCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
                            // 更新 Angular 模型
                            scope.conditions.agreeTerm = true;
                        });
                    } else {
                        // 如果找不到 scope，使用基本方法
                        agreeCheckbox.checked = true;
                        agreeCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
                        agreeCheckbox.dispatchEvent(new Event('input', { bubbles: true }));
                        agreeCheckbox.dispatchEvent(new Event('click', { bubbles: true }));
                    }
                } else {
                    console.log('同意條款已經勾選');
                }
                updateTaskStatus('agreement', 1, 'completed');
                updateTaskGroupStatus('agreement', 'completed');
                return true;
            } else {
                console.log('警告：找不到同意條款 checkbox');
                updateTaskStatus('agreement', 0, 'failed');
                updateTaskGroupStatus('agreement', 'failed');
                return false;
            }
        }

        // 檢查並選擇票種，或標記尚未開賣的目標票種
        function selectTickets() {
            updateTaskGroupStatus('ticket', 'running');
            console.log('開始檢查票種...');
            const ticketElements = document.querySelectorAll('.ticket-unit');
            console.log('找到票券元素數量:', ticketElements.length);
            let allTicketsSelected = true;

            // 先勾選同意條款
            checkAgreement();

            // 重置所有票券名稱的顏色 (移除紅色標記)
            document.querySelectorAll('.ticket-name').forEach(element => {
                element.style.color = '';
            });

            targetTickets.forEach(target => {
                console.log('處理目標票種:', target.name);
                let found = false;
                let targetFound = false;

                // 首先檢查所有票券以找到目標票種，無論是否可購買
                const allPossibleTickets = Array.from(ticketElements).filter(el => {
                    // 獲取票券名稱，優先使用 .small.text-muted 中的文字
                    const ticketNameElement = el.querySelector('.small.text-muted') || el.querySelector('.ticket-name');
                    const ticketName = ticketNameElement?.textContent.trim();
                    const ticketPrice = el.querySelector('.ticket-price')?.textContent.trim();

                    // 檢查是否是目標票種
                    if (ticketName === target.name &&
                        ticketPrice.replaceAll(',', '').includes(`TWD$${target.price.replaceAll(',', '')}`)) {
                        targetFound = true;

                        // 如果找到目標票種但無法購買，將其標記為紅色
                        if (!isTicketPurchasable(el)) {
                            const nameElement = el.querySelector('.ticket-name');
                            if (nameElement) {
                                console.log('找到目標票種但尚未開賣，標記為紅色:', ticketName);
                                nameElement.style.color = 'red';
                            }
                            // 如果找到 .small.text-muted 也將其標記為紅色
                            const smallTextElement = el.querySelector('.small.text-muted');
                            if (smallTextElement) {
                                smallTextElement.style.color = 'red';
                            }
                        }
                        return true;
                    }
                    return false;
                });

                // 如果找到目標票種，無論是否可購買，記錄下來
                if (allPossibleTickets.length > 0) {
                    console.log('已找到目標票種:', target.name, '數量:', allPossibleTickets.length);
                }

                // 先嘗試選擇主要目標票種
                updateTaskStatus('ticket', 1, 'running');
                const mainTicket = Array.from(ticketElements).find(el => {
                    // 獲取票券名稱，優先使用 .small.text-muted 中的文字
                    const ticketNameElement = el.querySelector('.small.text-muted') || el.querySelector('.ticket-name');
                    const ticketName = ticketNameElement?.textContent.trim();
                    const ticketPrice = el.querySelector('.ticket-price')?.textContent.trim();
                    console.log('檢查票券:', {
                        name: ticketName,
                        price: ticketPrice,
                        targetName: target.name,
                        targetPrice: target.price
                    });
                    return ticketName === target.name &&
                        ticketPrice.replaceAll(',', '').includes(`TWD$${target.price.replaceAll(',', '')}`) &&
                        checkTicketStatus(el) &&
                        isTicketPurchasable(el);
                });

                if (mainTicket) {
                    console.log('找到主要目標票種:', target.name);
                    const quantityInput = mainTicket.querySelector('input[type="text"]');
                    if (quantityInput) {
                        console.log('設置票券數量為', target.quantity);
                        quantityInput.value = target.quantity.toString();
                        // 觸發 input 事件以更新 Angular 模型
                        quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
                        found = true;
                        updateTaskStatus('ticket', 1, 'completed');
                    }
                } else {
                    console.log('主要目標票種不可選，嘗試替代票種');
                    updateTaskStatus('ticket', 1, 'failed');
                }

                // 如果主要目標票種不可選，嘗試替代票種
                if (!found) {
                    updateTaskStatus('ticket', 2, 'running');
                    for (const alt of target.alternatives) {
                        console.log('嘗試替代票種:', alt);

                        // 檢查替代票種是否存在，無論是否可購買
                        const allAltTickets = Array.from(ticketElements).filter(el => {
                            const ticketNameElement = el.querySelector('.small.text-muted') || el.querySelector('.ticket-name');
                            const ticketName = ticketNameElement?.textContent.trim();
                            const ticketPrice = el.querySelector('.ticket-price')?.textContent.trim();

                            if (ticketName === alt.name &&
                                ticketPrice.replaceAll(',', '').includes(`TWD$${alt.price.replaceAll(',', '')}`)) {

                                // 如果找到替代票種但無法購買，將其標記為紅色
                                if (!isTicketPurchasable(el)) {
                                    const nameElement = el.querySelector('.ticket-name');
                                    if (nameElement) {
                                        console.log('找到替代票種但尚未開賣，標記為紅色:', ticketName);
                                        nameElement.style.color = 'red';
                                    }
                                    // 如果找到 .small.text-muted 也將其標記為紅色
                                    const smallTextElement = el.querySelector('.small.text-muted');
                                    if (smallTextElement) {
                                        smallTextElement.style.color = 'red';
                                    }
                                }
                                return true;
                            }
                            return false;
                        });

                        if (allAltTickets.length > 0) {
                            console.log('已找到替代票種:', alt.name, '數量:', allAltTickets.length);
                            targetFound = true;
                        }

                        // 嘗試選擇可購買的替代票種
                        const altTicket = Array.from(ticketElements).find(el => {
                            // 獲取票券名稱，優先使用 .small.text-muted 中的文字
                            const ticketNameElement = el.querySelector('.small.text-muted') || el.querySelector('.ticket-name');
                            const ticketName = ticketNameElement?.textContent.trim();
                            const ticketPrice = el.querySelector('.ticket-price')?.textContent.trim();
                            return ticketName === alt.name &&
                                ticketPrice.replaceAll(',', '').includes(`TWD$${alt.price.replaceAll(',', '')}`) &&
                                checkTicketStatus(el) &&
                                isTicketPurchasable(el);
                        });

                        if (altTicket) {
                            const quantityInput = altTicket.querySelector('input[type="text"]');
                            if (quantityInput) {
                                console.log('設置替代票券數量為', target.quantity, ':', alt.name);
                                quantityInput.value = target.quantity.toString();
                                // 觸發 input 事件以更新 Angular 模型
                                quantityInput.dispatchEvent(new Event('input', { bubbles: true }));
                                found = true;
                                updateTaskStatus('ticket', 2, 'completed');
                                break;
                            }
                        }
                    }
                    if (!found) {
                        updateTaskStatus('ticket', 2, 'failed');
                    }
                }

                if (!found) {
                    console.log('警告：無法找到可選的票種:', target.name);
                    allTicketsSelected = false;
                }
            });

            // 如果所有票種都已選擇，則點擊下一步
            if (allTicketsSelected) {
                updateTaskGroupStatus('submit', 'running');
                console.log('所有票種已選擇，準備提交');
                updateTaskStatus('submit', 0, 'running');

                // 更新按鈕選擇邏輯
                const nextButton = document.querySelector('.register-new-next-button-area button.btn-primary');
                if (nextButton) {
                    console.log('找到下一步按鈕');
                    updateTaskStatus('submit', 0, 'completed');
                    updateTaskStatus('submit', 1, 'running');

                    // 檢查按鈕是否可點擊
                    const isDisabled = nextButton.hasAttribute('disabled') ||
                        nextButton.classList.contains('btn-disabled-alt') ||
                        nextButton.classList.contains('ng-hide');

                    if (!isDisabled) {
                        console.log('點擊下一步按鈕');
                        nextButton.click();
                        updateTaskStatus('submit', 1, 'completed');
                        updateTaskGroupStatus('submit', 'completed');
                    } else {
                        console.log('下一步按鈕目前無法點擊，等待按鈕可用');
                        updateTaskStatus('submit', 1, 'pending');
                        updateTaskGroupStatus('submit', 'pending');
                    }
                } else {
                    console.log('警告：找不到下一步按鈕');
                    updateTaskStatus('submit', 0, 'failed');
                    updateTaskGroupStatus('submit', 'failed');
                }
            } else {
                console.log('等待所有票種可選...');
                updateTaskGroupStatus('ticket', 'pending');
            }
        }

        // 每秒執行一次檢查
        setInterval(selectTickets, CHECK_INTERVAL);

        // 監聽頁面變化
        console.log('設置頁面變化監聽器');
        const pageObserver = new MutationObserver(() => {
            console.log('檢測到頁面變化，重新檢查票種');
            selectTickets();
        });

        // 開始觀察整個文檔的變化
        pageObserver.observe(document.body, {
            childList: true,
            subtree: true
        });

        console.log('腳本初始化完成');
    }
})();
