/**
 * notebook-plugin.js
 * 角色记事本功能插件 (1:1 还原 Paper App 3D 纸张堆叠版)
 */

(function () {
    'use strict';

    // ─── 注入 CSS ────────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
/* ====== 记事本插件全局样式 ====== */

/* 沉浸式深蓝背景 + 飘雪/星点纹理 */
#notebookScreen {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background-color: #4b5873;
    background-image: 
        radial-gradient(circle at 10% 20%, rgba(255,255,255,0.4) 1px, transparent 1px),
        radial-gradient(circle at 30% 60%, rgba(255,255,255,0.6) 2px, transparent 2px),
        radial-gradient(circle at 80% 40%, rgba(255,255,255,0.3) 1px, transparent 1px),
        radial-gradient(circle at 70% 85%, rgba(255,255,255,0.5) 1.5px, transparent 1.5px),
        radial-gradient(circle at 50% 10%, rgba(255,255,255,0.2) 2px, transparent 2px);
    background-size: 200px 200px;
    display: flex;
    flex-direction: column;
    transform: translateX(100%);
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
    font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
}

#notebookScreen.active {
    transform: translateX(0);
}

/* 顶部悬浮按钮 (左右角落) */
.nb-nav-top {
    position: absolute;
    top: env(safe-area-inset-top, 20px);
    left: 20px;
    right: 20px;
    display: flex;
    justify-content: space-between;
    z-index: 200;
}

.nb-nav-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    transition: all 0.2s;
}
.nb-nav-btn:active { background: rgba(255,255,255,0.2); transform: scale(0.9); }

/* 居中标题区 */
.nb-title-area {
    margin-top: calc(env(safe-area-inset-top, 20px) + 20px);
    text-align: center;
    color: #fff;
    z-index: 100;
}
.nb-title-area h2 {
    font-size: 18px;
    font-weight: 500;
    margin: 0 0 5px 0;
    letter-spacing: 1px;
}
.nb-title-area p {
    font-size: 10px;
    margin: 0;
    opacity: 0.7;
    font-family: monospace;
}

/* 书本 3D 容器 */
.nb-book-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 20px 80px;
    perspective: 3000px; /* 3D 透视视距 */
}

.nb-book {
    width: 100%;
    max-width: 600px;
    height: 60vh;
    max-height: 480px;
    display: flex;
    position: relative;
    transform-style: preserve-3d;
}

/* ====== 纸张堆叠厚度模拟 (核心) ====== */
/* 左侧纸张堆叠 (浅蓝色) */
.nb-stack-left {
    position: absolute;
    top: 2%; bottom: 2%; left: -12px; right: 50%;
    background: #e6f4fc;
    border-radius: 12px 0 0 12px;
    box-shadow: 
        -6px 0 0 -2px #f4faff,
        -12px 0 0 -4px #ffffff,
        -18px 0 0 -6px rgba(255,255,255,0.8),
        -25px 15px 30px rgba(0,0,0,0.15);
    z-index: 0;
}

/* 右侧纸张堆叠 (纯白色) */
.nb-stack-right {
    position: absolute;
    top: 2%; bottom: 2%; left: 50%; right: -12px;
    background: #f5f5f5;
    border-radius: 0 12px 12px 0;
    box-shadow: 
        6px 0 0 -2px #fafafa,
        12px 0 0 -4px #ffffff,
        18px 0 0 -6px rgba(255,255,255,0.8),
        25px 15px 30px rgba(0,0,0,0.15);
    z-index: 0;
}

/* 真实的当前阅读页 */
.nb-page {
    flex: 1;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    z-index: 2;
}

.nb-page-left {
    background: #dcf1fe; /* 浅蓝页 */
    border-radius: 12px 0 0 12px;
    /* 中缝阴影 */
    box-shadow: inset -10px 0 20px rgba(0,0,0,0.03);
}

.nb-page-right {
    background: #ffffff; /* 纯白页 */
    border-radius: 0 12px 12px 0;
    box-shadow: inset 10px 0 20px rgba(0,0,0,0.02);
}

/* 书缝 */
.nb-center-fold {
    position: absolute;
    left: 50%; top: 0; bottom: 0;
    width: 2px;
    background: linear-gradient(to right, rgba(0,0,0,0.05), rgba(0,0,0,0.1), rgba(0,0,0,0.05));
    transform: translateX(-50%);
    z-index: 10;
}

/* 书页内容区 */
.nb-page-inner {
    flex: 1;
    padding: 30px 20px;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    position: relative;
}
.nb-page-inner::-webkit-scrollbar { display: none; }

/* 文本样式 */
.nb-page-text {
    font-size: 16px;
    color: #444;
    line-height: 2.0;
    white-space: pre-wrap;
    word-break: break-all;
    position: relative;
    z-index: 1;
    text-align: justify;
}

/* 占位图案 (图中的兔子) */
.nb-watermark {
    position: absolute;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    width: 60px; height: 60px;
    opacity: 0.15;
    pointer-events: none;
    background-image: url('data:image/svg+xml;utf8,<svg viewBox="0 0 24 24" fill="%23666" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>');
    background-size: contain;
}

/* ================= 3D 翻页核心动画 ================= */
.nb-flipper {
    position: absolute;
    top: 0; bottom: 0;
    width: 50%;
    transform-style: preserve-3d;
    z-index: 50;
    transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
}

.nb-flipper.turn-next {
    right: 0;
    transform-origin: left center;
}
.nb-flipper.turn-prev {
    left: 0;
    transform-origin: right center;
}
.nb-flipper.turn-next.flipped { transform: rotateY(-180deg); }
.nb-flipper.turn-prev.flipped { transform: rotateY(180deg); }

.nb-flipper-face {
    position: absolute;
    inset: 0;
    backface-visibility: hidden;
    overflow: hidden;
}

/* 翻向下一页时，正面是白色，背面是浅蓝色 */
.nb-flipper.turn-next .nb-flipper-front { 
    background: #ffffff;
    border-radius: 0 12px 12px 0; 
    box-shadow: inset 10px 0 20px rgba(0,0,0,0.05);
}
.nb-flipper.turn-next .nb-flipper-back { 
    background: #dcf1fe;
    transform: rotateY(180deg); 
    border-radius: 12px 0 0 12px; 
    box-shadow: inset -10px 0 20px rgba(0,0,0,0.05);
}

/* 翻向上一页时，正面是浅蓝色，背面是白色 */
.nb-flipper.turn-prev .nb-flipper-front { 
    background: #dcf1fe;
    border-radius: 12px 0 0 12px; 
    box-shadow: inset -10px 0 20px rgba(0,0,0,0.05);
}
.nb-flipper.turn-prev .nb-flipper-back { 
    background: #ffffff;
    transform: rotateY(180deg); 
    border-radius: 0 12px 12px 0; 
    box-shadow: inset 10px 0 20px rgba(0,0,0,0.05);
}


/* ====== 底部圆形按钮操作栏 ====== */
.nb-bottom-bar {
    position: absolute;
    bottom: calc(env(safe-area-inset-bottom, 20px) + 30px);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 15px;
    z-index: 100;
}

.nb-action-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #ffffff;
    color: #333;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    border: none;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    cursor: pointer;
    transition: transform 0.2s, opacity 0.2s;
}
.nb-action-btn:active { transform: scale(0.9); }
.nb-action-btn.disabled { opacity: 0.5; pointer-events: none; }

/* 装饰性白线 */
.nb-bottom-line {
    position: absolute;
    bottom: env(safe-area-inset-bottom, 10px);
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 4px;
    background: rgba(255,255,255,0.5);
    border-radius: 2px;
}


/* ====== 居中圆角卡片弹窗 ====== */
.nb-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    backdrop-filter: blur(3px);
    z-index: 4000;
    display: none;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.3s;
}

.nb-modal-overlay.show {
    display: flex;
    opacity: 1;
}

.nb-modal {
    width: 85%;
    max-width: 320px;
    background: #fff;
    border-radius: 24px;
    padding: 25px;
    transform: scale(0.9);
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    box-shadow: 0 15px 35px rgba(0,0,0,0.2);
}

.nb-modal-overlay.show .nb-modal {
    transform: scale(1);
}

.nb-modal-title {
    font-size: 18px;
    font-weight: 800;
    color: #000;
    text-align: center;
    margin-bottom: 20px;
}

.nb-date-row {
    margin-bottom: 15px;
}
.nb-date-row label {
    display: block;
    font-size: 13px;
    color: #666;
    margin-bottom: 6px;
    font-weight: bold;
}
.nb-date-input, .nb-font-input {
    width: 100%;
    padding: 12px 15px;
    border: 1px solid #e0e0e0;
    border-radius: 12px;
    font-size: 15px;
    background: #f9f9f9;
    color: #333;
    outline: none;
    box-sizing: border-box;
}

.nb-font-presets {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 15px;
}
.nb-font-preset-btn {
    padding: 6px 14px;
    border-radius: 20px;
    border: 1px solid #eee;
    background: #f7f7f7;
    font-size: 13px;
    color: #555;
    cursor: pointer;
}
.nb-font-preset-btn:active { background: #000; color: #fff; }

.nb-modal-actions {
    display: flex;
    gap: 12px;
    margin-top: 25px;
}
.nb-modal-btn {
    flex: 1;
    padding: 12px;
    border-radius: 24px;
    font-size: 15px;
    font-weight: bold;
    border: none;
    cursor: pointer;
}
.nb-modal-btn-cancel { background: #f0f0f0; color: #666; }
.nb-modal-btn-confirm { background: #000; color: #fff; }

/* 暗色模式适配 */
.wechat-dark-mode #notebookScreen { background-color: #1a1a24; }
.wechat-dark-mode .nb-stack-left { background: #2a3545; box-shadow: -6px 0 0 -2px #2f3a4b, -12px 0 0 -4px #344052; }
.wechat-dark-mode .nb-stack-right { background: #2f3a4b; box-shadow: 6px 0 0 -2px #344052, 12px 0 0 -4px #394658; }
.wechat-dark-mode .nb-page-left { background: #232c3b; }
.wechat-dark-mode .nb-page-right { background: #2a3545; }
.wechat-dark-mode .nb-page-text { color: #d0d0d0; }
.wechat-dark-mode .nb-flipper.turn-next .nb-flipper-front { background: #2a3545; }
.wechat-dark-mode .nb-flipper.turn-next .nb-flipper-back { background: #232c3b; }
.wechat-dark-mode .nb-flipper.turn-prev .nb-flipper-front { background: #232c3b; }
.wechat-dark-mode .nb-flipper.turn-prev .nb-flipper-back { background: #2a3545; }
.wechat-dark-mode .nb-modal { background: #1c1c1e; }
.wechat-dark-mode .nb-modal-title { color: #fff; }
.wechat-dark-mode .nb-date-input, .wechat-dark-mode .nb-font-input { background: #2c2c2e; border-color: #3a3a3c; color: #fff; }
`;
    document.head.appendChild(style);

    // ─── 注入 HTML ────────────────────────────────────────────────────────────────
    const html = `
<div id="notebookScreen">
    
    <!-- 顶部透明按钮 -->
    <div class="nb-nav-top">
        <button class="nb-nav-btn" onclick="closeNotebookScreen()">
            <i class="ri-arrow-left-s-line"></i>
        </button>
        <button class="nb-nav-btn" onclick="openNotebookFontModal()">
            <i class="ri-settings-3-line" style="font-size: 16px;"></i>
        </button>
    </div>

    <!-- 标题区 -->
    <div class="nb-title-area">
        <h2 id="notebookTitle">日志</h2>
        <p id="nbPageIndicator">∅ 0 页</p>
    </div>

    <div class="nb-content-area">
        <div class="nb-book-area">
            <div class="nb-book">
                <!-- 底部阴影纸张层 -->
                <div class="nb-stack-left"></div>
                <div class="nb-stack-right"></div>

                <!-- 左侧固定页 -->
                <div class="nb-page nb-page-left">
                    <div class="nb-page-inner" id="nbPageLeft">
                        <div class="nb-watermark"></div>
                        <div class="nb-page-text" id="nbTextLeft"></div>
                    </div>
                </div>

                <!-- 中缝 -->
                <div class="nb-center-fold"></div>

                <!-- 右侧固定页 -->
                <div class="nb-page nb-page-right">
                    <div class="nb-page-inner" id="nbPageRight">
                        <div class="nb-page-text" id="nbTextRight"></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 底部操作圈 -->
    <div class="nb-bottom-bar">
        <button class="nb-action-btn" onclick="openNotebookFontModal()"><i class="ri-font-size-2" style="font-size:16px;"></i></button>
        <button class="nb-action-btn disabled" id="nbPrevBtn" onclick="nbTurnPage(-1)"><i class="ri-arrow-left-line"></i></button>
        <button class="nb-action-btn disabled" id="nbNextBtn" onclick="nbTurnPage(1)"><i class="ri-arrow-right-line"></i></button>
        <button class="nb-action-btn" onclick="openNotebookGenModal()"><i class="ri-add-line"></i></button>
    </div>
    
    <div class="nb-bottom-line"></div>
</div>

<!-- ========== 生成日期选择弹窗 ========== -->
<div class="nb-modal-overlay" id="nbGenModal">
    <div class="nb-modal" onclick="event.stopPropagation()">
        <div class="nb-modal-title">提取记忆生成日志</div>
        <div class="nb-modal-body">
            <div class="nb-date-row">
                <label>开始日期</label>
                <input type="date" class="nb-date-input" id="nbStartDate">
            </div>
            <div class="nb-date-row">
                <label>结束日期</label>
                <input type="date" class="nb-date-input" id="nbEndDate">
            </div>
        </div>
        <div class="nb-modal-actions">
            <button class="nb-modal-btn nb-modal-btn-cancel" onclick="nbCloseModal('nbGenModal')">取消</button>
            <button class="nb-modal-btn nb-modal-btn-confirm" id="nbGenConfirmBtn" onclick="nbConfirmGenerate()">开始生成</button>
        </div>
    </div>
</div>

<!-- ========== 字体设置弹窗 ========== -->
<div class="nb-modal-overlay" id="nbFontModal">
    <div class="nb-modal" onclick="event.stopPropagation()">
        <div class="nb-modal-title">手账字体设定</div>
        <div class="nb-modal-body">
            <div class="nb-font-presets">
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('Long Cang','https://fonts.googleapis.com/css2?family=Long+Cang&display=swap')">龙藏体</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('Ma Shan Zheng','https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap')">马善政</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('Zhi Mang Xing','https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap')">知芒行</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('Liu Jian Mao Cao','https://fonts.googleapis.com/css2?family=Liu+Jian+Mao+Cao&display=swap')">刘建毛草</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('','')">恢复默认</button>
            </div>
            <input type="url" class="nb-font-input" id="nbFontUrlInput" placeholder="自定义字体 URL" style="margin-bottom: 10px;">
            <input type="text" class="nb-font-input" id="nbFontNameInput" placeholder="自定义字体名称">
        </div>
        <div class="nb-modal-actions">
            <button class="nb-modal-btn nb-modal-btn-cancel" onclick="nbCloseModal('nbFontModal')">取消</button>
            <button class="nb-modal-btn nb-modal-btn-confirm" onclick="nbConfirmFont()">保存</button>
        </div>
    </div>
</div>
`;

    document.body.insertAdjacentHTML('beforeend', html);

    // ─── 状态变量 ────────────────────────────────────────────────────────────────
    let nbPages =[];         
    let nbCurrentPage = 0;    
    let nbFontFamily = '';    
    let nbFontLinkEl = null;  
    let isFlipping = false;   

    // ─── 工具函数 ────────────────────────────────────────────────────────────────

    function formatDate(ts) {
        const d = new Date(ts);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    }

    // 按大致字符数分页
    function splitIntoPages(text, charsPerPage = 220) {
        const pages =[];
        const paragraphs = text.split('\n\n').filter(p => p.trim());
        let current = '';

        for (const para of paragraphs) {
            if ((current + para).length > charsPerPage && current.length > 0) {
                pages.push(current.trim());
                current = para + '\n\n';
            } else {
                current += para + '\n\n';
            }
        }
        if (current.trim()) pages.push(current.trim());
        return pages.length > 0 ? pages : ['(一片空白...)'];
    }

    /**
     * 初始渲染或无动画渲染
     */
    function nbRenderCurrentPages() {
        const leftIdx = nbCurrentPage * 2;
        const rightIdx = nbCurrentPage * 2 + 1;

        const textLeft = document.getElementById('nbTextLeft');
        const textRight = document.getElementById('nbTextRight');
        
        const fontStyle = nbFontFamily ? `font-family: '${nbFontFamily}', cursive;` : '';

        // 默认显示第一页为空白提示
        if (nbPages.length === 0) {
            textLeft.innerHTML = `<div style="text-align:center; color:#999; margin-top: 50%; font-size:14px;">空空如也...<br>点击底部的 + 号提取记忆吧</div>`;
            textLeft.style.cssText = fontStyle;
            textRight.textContent = '';
            updateIndicators(0);
            return;
        }

        // 左页
        if (leftIdx < nbPages.length) {
            textLeft.style.cssText = fontStyle;
            textLeft.textContent = nbPages[leftIdx];
        } else {
            textLeft.textContent = '';
        }

        // 右页
        if (rightIdx < nbPages.length) {
            textRight.style.cssText = fontStyle;
            textRight.textContent = nbPages[rightIdx];
        } else {
            textRight.textContent = '';
        }

        updateIndicators();
    }

    function updateIndicators() {
        const totalSpreads = Math.ceil(nbPages.length / 2);
        
        if (totalSpreads > 0) {
            document.getElementById('nbPageIndicator').innerHTML = `∅ ${nbCurrentPage + 1} / ${totalSpreads} 页`;
            const prevBtn = document.getElementById('nbPrevBtn');
            const nextBtn = document.getElementById('nbNextBtn');
            
            if(nbCurrentPage === 0) prevBtn.classList.add('disabled'); else prevBtn.classList.remove('disabled');
            if(nbCurrentPage >= totalSpreads - 1) nextBtn.classList.add('disabled'); else nextBtn.classList.remove('disabled');
            
        } else {
            document.getElementById('nbPageIndicator').textContent = `∅ 0 页`;
            document.getElementById('nbPrevBtn').classList.add('disabled');
            document.getElementById('nbNextBtn').classList.add('disabled');
        }
    }

    // ─── 3D 翻页核心逻辑 ───────────────────────────────────────────────────────
    window.nbTurnPage = function (dir) {
        if (isFlipping) return;
        const totalSpreads = Math.ceil(nbPages.length / 2);
        const newPage = nbCurrentPage + dir;
        if (newPage < 0 || newPage >= totalSpreads) return;

        isFlipping = true;

        const bookArea = document.querySelector('.nb-book');
        const fontStyle = nbFontFamily ? `font-family: '${nbFontFamily}', cursive;` : '';

        // 当前和目标文本
        const currLeftText = nbPages[nbCurrentPage * 2] || '';
        const currRightText = nbPages[nbCurrentPage * 2 + 1] || '';
        const nextLeftText = nbPages[newPage * 2] || '';
        const nextRightText = nbPages[newPage * 2 + 1] || '';

        // 创建临时 3D 翻页DOM
        const flipper = document.createElement('div');
        flipper.className = 'nb-flipper';

        const front = document.createElement('div');
        front.className = 'nb-flipper-face nb-flipper-front';

        const back = document.createElement('div');
        back.className = 'nb-flipper-face nb-flipper-back';

        if (dir === 1) {
            // 向下一页 (右半边向左翻转)
            flipper.classList.add('turn-next');
            front.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${currRightText}</div></div>`;
            back.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${nextLeftText}</div></div>`;
            flipper.appendChild(front);
            flipper.appendChild(back);
            bookArea.appendChild(flipper);

            // 提前更新底层真实 DOM，但把刚露出的左边隐藏
            document.getElementById('nbTextLeft').textContent = nextLeftText;
            document.getElementById('nbTextRight').textContent = nextRightText;
            document.getElementById('nbTextLeft').style.opacity = '0';

            // 触发翻转
            requestAnimationFrame(() => {
                flipper.classList.add('flipped');
            });

        } else {
            // 向上一页 (左半边向右翻转)
            flipper.classList.add('turn-prev');
            front.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${currLeftText}</div></div>`;
            back.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${nextRightText}</div></div>`;
            flipper.appendChild(front);
            flipper.appendChild(back);
            bookArea.appendChild(flipper);

            document.getElementById('nbTextLeft').textContent = nextLeftText;
            document.getElementById('nbTextRight').textContent = nextRightText;
            document.getElementById('nbTextRight').style.opacity = '0';

            requestAnimationFrame(() => {
                flipper.classList.add('flipped');
            });
        }

        // 动画结束清理
        setTimeout(() => {
            flipper.remove();
            document.getElementById('nbTextLeft').style.opacity = '1';
            document.getElementById('nbTextRight').style.opacity = '1';
            nbCurrentPage = newPage;
            isFlipping = false;
            updateIndicators();
        }, 600); // 对应 CSS 动画 0.6s
    };

    // ─── 公开函数与弹窗控制 ──────────────────────────────────────────────────

    window.openNotebookScreen = function () {
        if (typeof hideFunctionMenus === 'function') hideFunctionMenus();

        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId)
            : null;

        const name = friend ? (friend.remark || friend.name || '角色') : '角色';
        document.getElementById('notebookTitle').textContent = name + ' 的日志';

        const today = new Date();
        const weekAgo = new Date(today - 7 * 24 * 3600 * 1000);
        document.getElementById('nbEndDate').value = formatDate(today.getTime());
        document.getElementById('nbStartDate').value = formatDate(weekAgo.getTime());

        // 隐藏全局手机状态栏，实现沉浸式
        const phoneDiv = document.querySelector('.phone');
        if (phoneDiv) phoneDiv.classList.add('status-bar-hidden');

        document.getElementById('notebookScreen').classList.add('active');
        
        if (nbPages.length === 0) {
            nbRenderCurrentPages();
        }
    };

    window.closeNotebookScreen = function () {
        document.getElementById('notebookScreen').classList.remove('active');
        const phoneDiv = document.querySelector('.phone');
        if (phoneDiv) phoneDiv.classList.remove('status-bar-hidden');
    };

    window.openNotebookGenModal = function () {
        document.getElementById('nbGenModal').classList.add('show');
    };

    window.openNotebookFontModal = function () {
        document.getElementById('nbFontUrlInput').value = '';
        document.getElementById('nbFontNameInput').value = nbFontFamily || '';
        document.getElementById('nbFontModal').classList.add('show');
    };

    window.nbCloseModal = function (id) {
        document.getElementById(id).classList.remove('show');
    };

    // 绑定模态框背景点击关闭
    document.getElementById('nbGenModal').addEventListener('click', () => nbCloseModal('nbGenModal'));
    document.getElementById('nbFontModal').addEventListener('click', () => nbCloseModal('nbFontModal'));


    window.nbApplyPresetFont = function (fontName, fontUrl) {
        document.getElementById('nbFontUrlInput').value = fontUrl;
        document.getElementById('nbFontNameInput').value = fontName;
    };

    window.nbConfirmFont = function () {
        const url = document.getElementById('nbFontUrlInput').value.trim();
        const name = document.getElementById('nbFontNameInput').value.trim();

        if (nbFontLinkEl) { nbFontLinkEl.remove(); nbFontLinkEl = null; }

        if (url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = url;
            document.head.appendChild(link);
            nbFontLinkEl = link;
        }

        nbFontFamily = name;
        nbRenderCurrentPages();
        nbCloseModal('nbFontModal');
        if (typeof showToast === 'function') showToast(name ? `已应用字体：${name}` : '已恢复默认字体');
    };

    window.nbConfirmGenerate = async function () {
        const startStr = document.getElementById('nbStartDate').value;
        const endStr = document.getElementById('nbEndDate').value;

        if (!startStr || !endStr) {
            if (typeof showToast === 'function') showToast('请选择日期范围');
            return;
        }

        // 【【【核心修复】】】: 确保时间戳的正确获取，防止由于格式导致查询不到记录
        const startTs = new Date(startStr).getTime();
        const endTs = new Date(endStr).getTime() + 86399000; // 包含到当天的 23:59:59

        if (startTs > endTs) {
            if (typeof showToast === 'function') showToast('开始日期不能晚于结束日期');
            return;
        }

        nbCloseModal('nbGenModal');

        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId)
            : null;

        if (!friend) {
            if (typeof showToast === 'function') showToast('请先打开一个聊天');
            return;
        }

        // 【【【核心修复】】】: 比较记录本身的时间戳 (转化为毫秒再比对)
        const allHistory = (typeof chatHistories !== 'undefined' ? chatHistories[friend.id] : []) ||[];
        const rangeHistory = allHistory.filter(msg => {
            if (!msg.timestamp) return false;
            const msgTs = new Date(msg.timestamp).getTime();
            return msgTs >= startTs && msgTs <= endTs;
        });

        if (rangeHistory.length === 0) {
            if (typeof showToast === 'function') showToast('该日期范围内没有聊天记录');
            return;
        }

        // 显示加载文字
        document.getElementById('nbTextLeft').style.display = 'block';
        document.getElementById('nbTextLeft').innerHTML = `<div style="text-align:center; color:#999; margin-top: 50%; font-size:14px;"><div style="font-size:24px; margin-bottom:10px; animation: spin 1s linear infinite;">⏳</div>正在执笔回忆中...</div>`;
        document.getElementById('nbTextRight').textContent = '';
        
        try {
            const content = await nbCallAiGenerate(friend, rangeHistory, startStr, endStr);
            nbPages = splitIntoPages(content, 220); // 单页容纳字数调整
            nbCurrentPage = 0;
            nbRenderCurrentPages();
            if (typeof showToast === 'function') showToast('日志生成完成！');
        } catch (e) {
            console.error('[记事本] 生成失败', e);
            document.getElementById('nbTextLeft').innerHTML = `<div style="text-align:center; color:red; margin-top: 50%; font-size:14px;">生成失败: ${e.message}</div>`;
        }
    };

    async function nbCallAiGenerate(friend, history, startStr, endStr) {
        let settings = {};
        if (typeof dbManager !== 'undefined') {
            settings = await dbManager.get('apiSettings', 'settings') || {};
        }

        if (!settings.apiUrl || !settings.apiKey || !settings.modelName) {
            throw new Error('API设置不完整');
        }

        let userPersona = '';
        if (typeof dbManager !== 'undefined') {
            const appSettings = await dbManager.get('appSettings', 'settings') || {};
            const personaId = friend.activeUserPersonaId || 'default_user';
            const personaObj = (appSettings.userPersonas ||[]).find(p => p.id === personaId) || {};
            userPersona = personaObj.personality || '';
        }

        const historyText = history
            .filter(m => m.contentType !== 'image' && m.contentType !== 'voice' && m.contentType !== 'system_tip')
            .slice(-80)
            .map(m => {
                const time = new Date(m.timestamp);
                const timeStr = `${time.getMonth()+1}月${time.getDate()}日 ${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;
                const sender = m.type === 'sent' ? '我' : friend.name;
                const text = typeof m.content === 'string' ? m.content.substring(0, 150) : '[非文字]';
                return `[${timeStr}] ${sender}：${text}`;
            })
            .join('\n');

        const dateDiff = (new Date(endStr) - new Date(startStr)) / 86400000;
        const dayCount = Math.min(Math.max(Math.ceil(dateDiff) + 1, 1), 7);

        const prompt = `【任务】：你是角色 "${friend.name}"，人设是："${friend.role || '普通人'}"。
现在请你以**第一人称**（"我"）的视角，根据以下聊天记录，写出你的手写日记内容。

【你的人设】：${friend.role || '普通人'}
${userPersona ? `【对方（你的重要之人）的人设】：${userPersona}` : ''}

【聊天记录摘要】：
${historyText}

【写作要求】：
1. 深入骨髓的第一人称视角，语气高度符合你的人设性格。
2. 挖掘聊天背后的心理活动、潜台词和情绪。
3. 写 ${dayCount} 则日记，每则以"xx年xx月xx日"开头。
4. 就像真实在写日记本一样，随意、感性，可以夹杂碎碎念，绝对不要像机器人在死板总结。
5. 每则日记 60-120 字，两则之间【必须空两行】。
6. 直接输出日记正文，不要任何前言后语。`;

        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.modelName,
                max_tokens: 1500,
                temperature: 0.9,
                messages: [{ role: 'user', content: prompt }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API错误: ${response.status}`);
        }

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        if (!text) throw new Error('内容为空');

        return text.trim();
    }

    // ─── ESC 关闭 ─────────────────────────────────────────────────────────────
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const genModal = document.getElementById('nbGenModal');
            const fontModal = document.getElementById('nbFontModal');
            if (genModal && genModal.classList.contains('show')) { genModal.classList.remove('show'); return; }
            if (fontModal && fontModal.classList.contains('show')) { fontModal.classList.remove('show'); return; }
            const screen = document.getElementById('notebookScreen');
            if (screen && screen.classList.contains('active')) {
                closeNotebookScreen();
            }
        }
    });

    console.log('[记事本插件 - 3D 纸张堆叠翻页版] 已加载完成 ✓');
})();