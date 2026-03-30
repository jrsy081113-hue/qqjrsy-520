/**
 * notebook-plugin.js
 * 角色记事本功能插件 (持久化存档 + 增量生成 + 真实手写涂鸦版 + 极简字体设置)
 */

(function () {
    'use strict';

    // ─── 注入 CSS ────────────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
/* ====== 记事本插件全局样式 ====== */

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
    
    /* 防止 UI 溢出 */
    transform: translateX(100%);
    visibility: hidden;
    pointer-events: none;
    
    transition: transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1), visibility 0.4s;
    font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
}

#notebookScreen.active {
    transform: translateX(0);
    visibility: visible;
    pointer-events: auto;
}

/* 顶部悬浮按钮 */
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

/* 居中标题区 (绝对定位，不挤压书本空间) */
.nb-title-area {
    position: absolute;
    top: calc(env(safe-area-inset-top, 20px) + 15px);
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    color: #fff;
    z-index: 100;
    pointer-events: none;
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

/* 内容容器 */
.nb-content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* 书本 3D 容器 (完美居中) */
.nb-book-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 15px;
    perspective: 3000px; 
}

.nb-book {
    width: 100%;
    max-width: 500px; 
    height: 65vh;     
    max-height: 600px;
    display: flex;
    position: relative;
    transform-style: preserve-3d;
}

/* ====== 纸张堆叠厚度模拟 ====== */
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
    background: #dcf1fe; 
    border-radius: 12px 0 0 12px;
    box-shadow: inset -10px 0 20px rgba(0,0,0,0.03);
}

.nb-page-right {
    background: #ffffff; 
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

/* 文本样式 (缩小字号14px、排版更舒适) */
.nb-page-text {
    font-size: 14px;
    color: #333;
    line-height: 1.8;
    white-space: pre-wrap;
    word-break: break-all;
    position: relative;
    z-index: 1;
    text-align: justify;
}

/* 划掉的文字、真实手写涂抹感 */
.nb-page-text s, .nb-page-text del {
    text-decoration: line-through;
    text-decoration-color: rgba(0, 0, 0, 0.6);
    text-decoration-thickness: 2px;
    color: rgba(0, 0, 0, 0.5); /* 被划掉的字稍微变淡 */
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
        <!-- 保持占位对称，干掉原右上角的设置按钮 -->
        <div style="width:36px; height:36px;"></div>
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
        <!-- 增加清空记事本按钮 -->
        <button class="nb-action-btn" onclick="nbClearNotebook()"><i class="ri-delete-bin-line" style="color:#ff4d4d; font-size:16px;"></i></button>
    </div>
    
    <div class="nb-bottom-line"></div>
</div>

<!-- ========== 生成日期选择弹窗 ========== -->
<div class="nb-modal-overlay" id="nbGenModal">
    <div class="nb-modal" onclick="event.stopPropagation()">
        <div class="nb-modal-title">提取记忆追加日志</div>
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

<!-- ========== 字体设置弹窗 (极简) ========== -->
<div class="nb-modal-overlay" id="nbFontModal">
    <div class="nb-modal" onclick="event.stopPropagation()">
        <div class="nb-modal-title">手账字体设定</div>
        <div class="nb-modal-body">
            <div class="nb-font-presets">
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('https://fonts.googleapis.com/css2?family=Long+Cang&display=swap')">龙藏体</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&display=swap')">马善政</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('https://fonts.googleapis.com/css2?family=Zhi+Mang+Xing&display=swap')">知芒行</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('https://fonts.googleapis.com/css2?family=Liu+Jian+Mao+Cao&display=swap')">刘建毛草</button>
                <button class="nb-font-preset-btn" onclick="nbApplyPresetFont('')">恢复默认</button>
            </div>
            <!-- 去掉了名称输入框，直接用 URL 智能解析 -->
            <input type="url" class="nb-font-input" id="nbFontUrlInput" placeholder="输入自定义字体 URL (.ttf/.woff/GoogleFonts)" style="margin-bottom: 10px;">
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

    // 按 [NEW_DIARY] 分隔日记，并严格将一页设为两篇
    function splitIntoPages(text) {
        const pages =[];
        const diaries = text.split('[NEW_DIARY]').map(d => d.trim()).filter(d => d.length > 0);
        
        let currentPageContent = '';
        let diaryCountOnPage = 0;

        for (let i = 0; i < diaries.length; i++) {
            currentPageContent += diaries[i] + '\n\n';
            diaryCountOnPage++;

            if (diaryCountOnPage === 2 || i === diaries.length - 1) {
                pages.push(currentPageContent.trim());
                currentPageContent = '';
                diaryCountOnPage = 0;
            }
        }
        
        return pages.length > 0 ? pages : ['(一片空白...)'];
    }

    /**
     * 智能加载字体核心函数
     */
    async function nbLoadFont(url) {
        if (!url) {
            nbFontFamily = '';
            if (nbFontLinkEl) { nbFontLinkEl.remove(); nbFontLinkEl = null; }
            return;
        }
        
        try {
            if (url.includes('googleapis.com/css')) {
                // Google Fonts 方式
                if (nbFontLinkEl) nbFontLinkEl.remove();
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = url;
                document.head.appendChild(link);
                nbFontLinkEl = link;
                
                const urlObj = new URL(url);
                const familyParam = urlObj.searchParams.get('family');
                if (familyParam) {
                    nbFontFamily = familyParam.split(':')[0].replace(/\+/g, ' ');
                }
            } else {
                // 原生直链加载
                const fontName = 'NbCustomFont_' + Date.now();
                const fontFace = new FontFace(fontName, `url(${url})`);
                await fontFace.load();
                document.fonts.add(fontFace);
                nbFontFamily = fontName;
            }
        } catch(e) {
            console.error("日记字体加载失败", e);
            nbFontFamily = '';
        }
    }

    /**
     * 初始渲染或无动画渲染
     */
    function nbRenderCurrentPages() {
        const leftIdx = nbCurrentPage * 2;
        const rightIdx = nbCurrentPage * 2 + 1;

        const textLeft = document.getElementById('nbTextLeft');
        const textRight = document.getElementById('nbTextRight');
        
        const fontStyle = nbFontFamily ? `font-family: '${nbFontFamily}', cursive, sans-serif;` : '';

        if (nbPages.length === 0) {
            textLeft.innerHTML = `<div style="text-align:center; color:#999; margin-top: 50%; font-size:14px; font-family: sans-serif;">空空如也...<br>点击底部的 + 号提取记忆吧</div>`;
            textLeft.style.cssText = ''; 
            textRight.innerHTML = '';
            updateIndicators();
            return;
        }

        // 左页 - 支持内部 HTML 渲染
        if (leftIdx < nbPages.length) {
            textLeft.style.cssText = fontStyle;
            textLeft.innerHTML = nbPages[leftIdx];
        } else {
            textLeft.innerHTML = '';
        }

        // 右页
        if (rightIdx < nbPages.length) {
            textRight.style.cssText = fontStyle;
            textRight.innerHTML = nbPages[rightIdx];
        } else {
            textRight.innerHTML = '';
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
        const fontStyle = nbFontFamily ? `font-family: '${nbFontFamily}', cursive, sans-serif;` : '';

        const currLeftText = nbPages[nbCurrentPage * 2] || '';
        const currRightText = nbPages[nbCurrentPage * 2 + 1] || '';
        const nextLeftText = nbPages[newPage * 2] || '';
        const nextRightText = nbPages[newPage * 2 + 1] || '';

        const flipper = document.createElement('div');
        flipper.className = 'nb-flipper';

        const front = document.createElement('div');
        front.className = 'nb-flipper-face nb-flipper-front';

        const back = document.createElement('div');
        back.className = 'nb-flipper-face nb-flipper-back';

        if (dir === 1) {
            flipper.classList.add('turn-next');
            front.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${currRightText}</div></div>`;
            back.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${nextLeftText}</div></div>`;
            flipper.appendChild(front);
            flipper.appendChild(back);
            bookArea.appendChild(flipper);

            document.getElementById('nbTextLeft').innerHTML = nextLeftText;
            document.getElementById('nbTextRight').innerHTML = nextRightText;
            document.getElementById('nbTextLeft').style.opacity = '0';

            requestAnimationFrame(() => {
                flipper.classList.add('flipped');
            });

        } else {
            flipper.classList.add('turn-prev');
            front.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${currLeftText}</div></div>`;
            back.innerHTML = `<div class="nb-page-inner"><div class="nb-page-text" style="${fontStyle}">${nextRightText}</div></div>`;
            flipper.appendChild(front);
            flipper.appendChild(back);
            bookArea.appendChild(flipper);

            document.getElementById('nbTextLeft').innerHTML = nextLeftText;
            document.getElementById('nbTextRight').innerHTML = nextRightText;
            document.getElementById('nbTextRight').style.opacity = '0';

            requestAnimationFrame(() => {
                flipper.classList.add('flipped');
            });
        }

        setTimeout(() => {
            flipper.remove();
            document.getElementById('nbTextLeft').style.opacity = '1';
            document.getElementById('nbTextRight').style.opacity = '1';
            nbCurrentPage = newPage;
            isFlipping = false;
            updateIndicators();
        }, 600); 
    };

    // ─── 公开函数与弹窗控制 ──────────────────────────────────────────────────

    window.openNotebookScreen = async function () {
        if (typeof hideFunctionMenus === 'function') hideFunctionMenus();

        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId)
            : null;

        const name = friend ? (friend.remark || friend.name || '角色') : '角色';
        document.getElementById('notebookTitle').textContent = name + ' 的日记本';

        const today = new Date();
        const weekAgo = new Date(today - 7 * 24 * 3600 * 1000);
        document.getElementById('nbEndDate').value = formatDate(today.getTime());
        document.getElementById('nbStartDate').value = formatDate(weekAgo.getTime());

        // 读取持久化的日记本数据
        if (friend) {
            if (!friend.notebookDiaries) friend.notebookDiaries = [];
            const rawContent = friend.notebookDiaries.join('\n\n[NEW_DIARY]\n\n');
            if (rawContent) {
                nbPages = splitIntoPages(rawContent);
            } else {
                nbPages =[];
            }

            // 读取持久化字体配置
            if (friend.notebookSettings && friend.notebookSettings.fontUrl) {
                await nbLoadFont(friend.notebookSettings.fontUrl);
            }
        }
        
        // 自动翻到最后一页 (因为可能想看最新的)
        if (nbPages.length > 0) {
            nbCurrentPage = Math.max(0, Math.ceil(nbPages.length / 2) - 1);
        } else {
            nbCurrentPage = 0;
        }

        // 隐藏全局手机状态栏，实现沉浸式
        const phoneDiv = document.querySelector('.phone');
        if (phoneDiv) phoneDiv.classList.add('status-bar-hidden');

        document.getElementById('notebookScreen').classList.add('active');
        nbRenderCurrentPages();
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
        // 回显字体 URL
        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId) : null;
        
        const savedUrl = (friend && friend.notebookSettings && friend.notebookSettings.fontUrl) ? friend.notebookSettings.fontUrl : '';
        document.getElementById('nbFontUrlInput').value = savedUrl;
        document.getElementById('nbFontModal').classList.add('show');
    };

    window.nbCloseModal = function (id) {
        document.getElementById(id).classList.remove('show');
    };

    document.getElementById('nbGenModal').addEventListener('click', () => nbCloseModal('nbGenModal'));
    document.getElementById('nbFontModal').addEventListener('click', () => nbCloseModal('nbFontModal'));

    window.nbApplyPresetFont = function (fontUrl) {
        document.getElementById('nbFontUrlInput').value = fontUrl;
    };

    window.nbConfirmFont = async function () {
        const url = document.getElementById('nbFontUrlInput').value.trim();
        
        await nbLoadFont(url); // 加载字体

        // 存储持久化
        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId) : null;
            
        if (friend) {
            if (!friend.notebookSettings) friend.notebookSettings = {};
            friend.notebookSettings.fontUrl = url;
            if (typeof saveData === 'function') await saveData();
        }

        nbRenderCurrentPages();
        nbCloseModal('nbFontModal');
        if (typeof showToast === 'function') showToast(url ? '字体已应用' : '已恢复默认字体');
    };

    window.nbClearNotebook = async function() {
        if (!confirm('确定要清空这本记事本的所有内容吗？操作不可逆。')) return;
        
        const friend = (typeof friends !== 'undefined' && typeof currentChatFriendId !== 'undefined')
            ? friends.find(f => f.id === currentChatFriendId)
            : null;

        if (friend) {
            friend.notebookDiaries = []; 
            if (typeof saveData === 'function') await saveData(); 
            
            nbPages =[];
            nbCurrentPage = 0;
            nbRenderCurrentPages();
            
            if (typeof showToast === 'function') showToast('记事本已清空');
        }
    };

    window.nbConfirmGenerate = async function () {
        const startStr = document.getElementById('nbStartDate').value;
        const endStr = document.getElementById('nbEndDate').value;

        if (!startStr || !endStr) {
            if (typeof showToast === 'function') showToast('请选择日期范围');
            return;
        }

        const startTs = new Date(startStr).getTime();
        const endTs = new Date(endStr).getTime() + 86399000; 

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

        document.getElementById('nbTextLeft').style.display = 'block';
        document.getElementById('nbTextLeft').innerHTML = `<div style="text-align:center; color:#999; margin-top: 50%; font-size:14px; font-family:sans-serif;"><div style="font-size:24px; margin-bottom:10px; animation: spin 1s linear infinite;">⏳</div>正在提笔写日记...</div>`;
        document.getElementById('nbTextRight').innerHTML = '';
        
        try {
            // 记录生成前的页数
            const oldPageCount = nbPages.length;
            
            const content = await nbCallAiGenerate(friend, rangeHistory, startStr, endStr);
            
            const newDiaries = content.split('[NEW_DIARY]').map(d => d.trim()).filter(d => d.length > 0);
            
            if (!friend.notebookDiaries) friend.notebookDiaries =[];
            friend.notebookDiaries.push(...newDiaries); // 增量追加
            
            if (typeof saveData === 'function') await saveData(); 
            
            // 重新切页
            const rawContent = friend.notebookDiaries.join('\n\n[NEW_DIARY]\n\n');
            nbPages = splitIntoPages(rawContent);
            
            // 核心修复：跳转到新生成内容的第一页
            if (oldPageCount === 0) {
                nbCurrentPage = 0;
            } else {
                nbCurrentPage = Math.floor(oldPageCount / 2);
            }
            
            nbRenderCurrentPages();
            if (typeof showToast === 'function') showToast('日志追加生成完成并已保存！');
        } catch (e) {
            console.error('[记事本] 生成失败', e);
            document.getElementById('nbTextLeft').innerHTML = `<div style="text-align:center; color:red; margin-top: 50%; font-size:14px; font-family:sans-serif;">生成失败: ${e.message}</div>`;
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
            const personaObj = (appSettings.userPersonas ||[]) .find(p => p.id === personaId) || {};
            userPersona = personaObj.personality || '';
        }

        const historyText = history
            .filter(m => m.contentType !== 'image' && m.contentType !== 'voice' && m.contentType !== 'system_tip')
            .map(m => {
                const time = new Date(m.timestamp);
                const timeStr = `${time.getFullYear()}年${time.getMonth()+1}月${time.getDate()}日 ${time.getHours()}:${String(time.getMinutes()).padStart(2,'0')}`;
                const sender = m.type === 'sent' ? '我' : friend.name;
                const text = typeof m.content === 'string' ? m.content.substring(0, 150) : '[非文字]';
                return `[${timeStr}] ${sender}：${text}`;
            })
            .join('\n');

        const dateDiff = (new Date(endStr) - new Date(startStr)) / 86400000;
        
        // 【核心修改】确保最少生成 6 篇，最多放宽至 40 篇，增加长周期丰富度
        const diaryCount = Math.max(6, Math.min(Math.ceil(dateDiff * 1.5) + 3, 40));

        const prompt = `【任务】：你是角色 "${friend.name}"，人设是："${friend.role || '普通人'}"。
现在请你以**第一人称**（"我"）的视角，根据以下聊天记录，写出你的手写日记内容。

【你的人设】：${friend.role || '普通人'}
${userPersona ? `【对方（你的重要之人）的人设】：${userPersona}` : ''}

【聊天记录摘要（包含真实日期和时间）】：
${historyText}

【写作要求】：
1. 深入骨髓的第一人称视角，语气高度符合你的人设性格。
2. 挖掘聊天背后的心理活动、潜台词和情绪。
3. **【篇数与日期铁律】**：请生成刚好 **${diaryCount} 篇** 独立的日记。每篇日记必须以“XX年XX月XX日”开头。**必须严格根据上方聊天记录里真实发生的日期来标注日记的日期！哪天发生的事情就写哪天的日期，绝对不能全都写成同一天。** 如果聊天记录集中在某几天，你可以将同一天的不同心情分成多篇写，或者自行脑补这段时间内符合人设的日常琐事来凑够 ${diaryCount} 篇。
4. 正文排版要求简短、多换行，像真实的随笔。格式示例：
   xx年xx月xx日
   我家太太又念叨着要养一只小狗
   说小狗可爱很黏人
   但是，她比小狗黏人
   
5. 结合日记内容，用符号模拟涂鸦（如：→、？、！、♡、✧、(๑•̀ㅂ•́)و✧、○圈注等）。
6. 每则日记控制在 50-80 字左右，不要长篇大论。
7. 【关键格式铁律】：每篇独立日记之间，必须用且仅用一个独立成行的分隔符 \`[NEW_DIARY]\` 隔开。第一篇日记前不需要加分隔符。

直接输出日记正文，不要任何前言后语。`;

        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.modelName,
                max_tokens: 4096, // 【提升上限】防止 40 篇时被截断
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

    console.log('[记事本插件 - 3D 纸张持久增量与极致手帐版] 已加载完成 ✓');
})();
