/* ====================================================
   直播 App 插件  live-plugin.js
   包含：直播样式注入 / 直播全局变量 / HTML注入 / 所有直播逻辑
   修改此文件即可更新直播功能，不影响主文件
   ================================================== */

/* ── 直播专属全局变量 ── */
let currentLiveRecommendations = []; // 用于存储直播推荐数据
let currentPreviewLiveId = null; // 当前正在预览的直播ID

let currentLiveFollowingList = []; 
// --- 直播App 专用全局变量 ---
let liveWorldviews = []; // 存储直播世界观
let livePrompts = [];    // 存储直播全局提示词
let liveSettings = {
    worldviewId: null,   // 当前选中的世界观ID
    promptId: null       // 当前选中的提示词ID
};

// 全局变量：直播播放速度 (默认为 1.0)
let currentLiveSpeed = 1.0;

let currentEditingLiveItemId = null; // 临时存储正在编辑的ID

let currentEditingLiveWorldviewTarget = 'recommend'; 

let liveRoomInterval = null;
let currentLiveScript = null;
let livePlaybackIndex = 0; // 当前播放到剧本的第几秒

// --- 直播App 独立个人资料 ---
let liveUserProfile = {
    name: "直播萌新",
    avatarImage: "", // 独立头像
    id: "9527888",   // 独立ID
    following: 0,
    fans: 0,
    likes: 0
};

// --- [新增] 养娃功能全局变量 ---
let babies = []; // 存储孩子信息数组
let babyChats = {}; // 存储独立的家庭聊天记录 { babyId: { baby: [], partner: [], group: [] } }

// --- [新增] “我开直播” 专属全局变量 ---
let myLiveState = {
    isActive: false,
    category: '',
    description: '',
    rules: '',
    viewers: [], // 存放假观众及贡献值 {name, avatar, score}
    chatHistory: [], // 记录直播间发生的事情
    viewerCount: 0
};

/* ── 注入直播样式 ── */
function _injectLiveCSS() {
    const style = document.createElement('style');
    style.id = 'live-plugin-style';
    style.textContent = `/* ====================================================
   直播 App 插件样式  live-plugin.css
   修改此文件即可更新直播相关所有样式，不影响主文件
   ================================================== */

/* --- 直播 App 样式 (更新版) --- */

/* 激活直播App时隐藏系统状态栏 */
.phone.live-app-active .status-bar {
    display: none !important;
}

/* 顶部标签栏：改为纯色背景，位于最顶层 */
.live-top-tabs {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 20px;
    z-index: 100;
    background-color: #121212; /* 改为纯黑背景，不再透明悬浮 */
    border-bottom: 1px solid #222;
}

.live-tab-item {
    font-size: 16px;
    color: rgba(255, 255, 255, 0.6);
    font-weight: 600;
    position: relative;
    cursor: pointer;
    transition: all 0.3s;
    height: 100%;
    display: flex;
    align-items: center;
}

.live-tab-item.active {
    color: #fff;
    font-size: 17px;
}

.live-tab-item.active::after {
    content: '';
    position: absolute;
    bottom: 5px; /* 下划线位置微调 */
    left: 50%;
    transform: translateX(-50%);
    width: 16px;
    height: 3px;
    background: #ff4d4d;
    border-radius: 2px;
}

/* 直播列表网格 */
.live-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    padding: 4px; /* 给网格一点外边距 */
    align-items: start; 
}

/* 单个直播卡片 */
.live-card {
    position: relative;
    background-color: #1a1a1a;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    aspect-ratio: 3/4;
}

/* 直播中标签 */
.live-tag-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    padding: 2px 5px;
    font-size: 10px;
    color: #fff;
    display: flex;
    align-items: center;
    gap: 4px;
    backdrop-filter: blur(2px);
    z-index: 2;
}

.live-pulse-dot {
    width: 5px;
    height: 5px;
    background-color: #ff4d4d;
    border-radius: 50%;
    animation: livePulse 1.5s infinite;
}

/* 底部信息区 */
.live-info-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    padding: 10px 8px;
    background: linear-gradient(to top, rgba(0,0,0,0.9), transparent);
    color: #fff;
}

.live-title {
    font-size: 13px;
    margin-bottom: 6px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.4;
}

.live-author-row {
    display: flex;
    align-items: center;
    font-size: 11px;
    color: #ccc;
}

.live-author-avatar {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    margin-right: 5px;
    border: 1px solid rgba(255,255,255,0.2);
}

/* 观看人数统计 */
.live-viewer-count {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 3px;
}

/* 底部导航栏：修复文字超出问题 */
.live-bottom-bar {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    /* 增加高度，确保文字垂直居中不被切 */
    height: 55px; 
    background: #0d0d0d;
    border-top: 1px solid #222;
    display: flex;
    align-items: center; /* 垂直居中 */
    justify-content: center;
    z-index: 100;
    /* 适配底部安全区 */
    padding-bottom: env(safe-area-inset-bottom);
    box-sizing: content-box; /* 确保 padding 不吃掉 height */
}

.live-nav-item {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    cursor: pointer;
    opacity: 0.5;
    transition: opacity 0.2s;
}

.live-nav-item.active {
    opacity: 1;
}

.live-nav-text {
    font-size: 16px;
    font-weight: bold;
    color: #fff;
    /* 确保文字垂直对齐 */
    line-height: 1; 
    display: block;
}

/* --- 直播顶部导航栏样式修正 --- */

/* 1. 顶部栏容器 */
.live-top-tabs {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 50px;
    display: flex;
    justify-content: center; /* 让中间的“关注/推荐”居中 */
    align-items: center;
    z-index: 100;
    background-color: #121212;
    border-bottom: 1px solid #222;
}

/* 2. 左侧按钮 (设置) */
.live-header-btn-left {
    position: absolute;
    left: 15px;
    font-size: 22px;
    color: #fff;
    cursor: pointer;
    z-index: 101;
    padding: 5px; /* 增加点击区域 */
}

/* 3. 【核心修改】右侧按钮组容器 (刷新 + 返回) */
.live-header-right-group {
    position: absolute;
    right: 15px;
    display: flex;
    align-items: center;
    gap: 15px; /* 两个按钮之间的间距 */
    z-index: 101;
}

/* 4. 右侧单个按钮的通用样式 */
.live-header-btn {
    font-size: 22px;
    color: #fff;
    cursor: pointer;
    padding: 5px; /* 增加点击区域 */
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 5. 刷新旋转动画 (保持不变) */
.rotate-anim {
    animation: spin 1s linear infinite;
}

/* =========================================
   直播间完整样式 (V4 - 切页描述 + 紧凑顶部版)
   ========================================= */

#liveRoomScreen {
    background-color: #000;
    color: #fff;
    z-index: 3000; /* 确保层级最高，覆盖在所有页面之上 */
}

/* 1. 背景层 (全屏模糊) */
.live-room-bg {
    position: absolute;
    top: 0; 
    left: 0; 
    width: 100%; 
    height: 100%;
    background-size: cover;
    background-position: center;
    /* 强模糊 + 压暗，确保文字清晰 */
    filter: blur(25px) brightness(0.5); 
    z-index: 1;
}

/* 2. 顶部信息栏 (主播 + 观众) */
.live-room-header {
    position: absolute;
    /* 适配刘海屏，距离顶部有一点距离 */
    top: calc(8px + env(safe-area-inset-top)); 
    left: 10px;
    right: 10px;
    z-index: 20;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

/* 左侧：主播胶囊 */
.live-host-pill {
    background: rgba(0, 0, 0, 0.4);
    border-radius: 30px;
    padding: 3px;
    padding-right: 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    backdrop-filter: blur(5px);
    flex-shrink: 0; /* 防止被挤压 */
}

.live-room-avatar {
    width: 34px; 
    height: 34px; 
    border-radius: 50%;
    background-size: cover; 
    background-position: center;
    border: 1px solid rgba(255,255,255,0.8);
}

.live-host-text { 
    display: flex; 
    flex-direction: column; 
}
.live-host-name { 
    font-size: 13px; 
    font-weight: bold; 
    max-width: 90px; 
    overflow: hidden; 
    white-space: nowrap; 
    text-overflow: ellipsis; 
}
.live-host-sub { 
    font-size: 10px; 
    color: #eee; 
}

.live-follow-btn { 
    background: #ff4d4d; 
    color: white; 
    border: none; 
    border-radius: 20px; 
    padding: 4px 10px; 
    font-size: 12px; 
    font-weight: bold; 
    margin-left: 5px; 
}

/* 右侧：观众列表 + 关闭按钮容器 */
.live-header-right-part {
    display: flex;
    align-items: center;
    /* 【修改】极小的间距，让头像和人数靠得更近 */
    gap: 0px; 
}

/* 观众头像组 */
.live-viewer-avatars {
    display: flex;
    align-items: center;
    margin-right: 0; 
}
.viewer-avatar {
    width: 28px; 
    height: 28px; 
    border-radius: 50%; 
    border: 1px solid rgba(255,255,255,0.6);
    background-size: cover; 
    background-position: center; 
    background-color: #555;
    /* 负边距实现头像重叠效果 */
    margin-left: -10px; 
}
.viewer-avatar:first-child { 
    margin-left: 0; 
}

.live-viewer-count {
    font-size: 12px;
    background: rgba(0,0,0,0.4);
    padding: 5px 10px;
    border-radius: 20px;
    color: #eee;
    backdrop-filter: blur(5px);
    /* 【修改】微调左边距 */
    margin-left: 2px; 
}

.live-close-btn {
    background: transparent; 
    border: none; 
    color: #fff;
    font-size: 26px; 
    opacity: 0.9; 
    padding: 5px;
    margin-left: 5px;
}

.live-visual-scroll-area {
    position: absolute;
    top: 180px; 
    left: 15px;
    right: 15px;
    height: 180px; /* 区域高度 */
    z-index: 5;
    
    /* 滚动设置 */
    overflow-y: auto;
    scroll-snap-type: y mandatory;
    scroll-behavior: smooth;
    
    /* 隐藏滚动条 */
    scrollbar-width: none; 
    -ms-overflow-style: none;
    
    /* 布局 */
    display: flex;
    flex-direction: column;
    /* 【修改】内容水平居中 */
    align-items: center; 
    
    /* 【修改】巨大的间距，确保一次只显示一条 */
    gap: 180px; 
    
    /* 【核心修改】给容器上下增加填充，让第一条和最后一条也能滚到正中间 */
    padding: 80px 0;
    
   
}
.live-visual-scroll-area::-webkit-scrollbar { display: none; }

/* 单条画面描述气泡 */
.live-visual-bubble {
    font-size: 16px;
    line-height: 1.6;
    color: #fff;
    
    /* 【修改】完全透明背景 */
    background: transparent;
    padding: 0 10px;
    
    /* 【修改】文字水平居中 */
    text-align: center;
    
    /* 加强阴影，保证在任何背景下可见 */
    text-shadow: 0 1px 4px rgba(0,0,0,1);
    
    white-space: pre-wrap;
    
    /* 【核心修改】吸附对齐方式改为：居中 */
    scroll-snap-align: center; 
    
    flex-shrink: 0; 
    width: 100%;
    
    /* 动画 */
    animation: fadeInUp 0.5s ease-out;
}

/* 4. 底部区域 (弹幕 + 操作栏) */
.live-room-footer {
    position: absolute;
    bottom: 0; 
    left: 0; 
    right: 0; 
    z-index: 20;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    /* 背景渐变加深，保证弹幕清晰 */
    background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);
}

/* 弹幕滚动区 */
.live-danmu-area {
    height: 220px;
    overflow-y: auto;
    padding: 0 15px;
    margin-bottom: 10px;
    scrollbar-width: none;
    -ms-overflow-style: none;
    mask-image: linear-gradient(to bottom, transparent, black 15%);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%);
}
.live-danmu-area::-webkit-scrollbar { display: none; }

/* 单条弹幕 */
.live-danmu-item {
    margin-bottom: 6px;
    font-size: 14px;
    text-shadow: 0 1px 2px rgba(0,0,0,0.8);
    background: rgba(0,0,0,0.25); /* 稍微加深一点背景 */
    display: inline-block;
    padding: 4px 12px;
    border-radius: 15px;
    clear: both;
    float: left;
    max-width: 90%;
    word-wrap: break-word;
    animation: slideInLeft 0.3s ease-out;
}

.danmu-user { 
    color: #aaddff; /* 浅蓝名 */
    font-weight: 500; 
    /* 冒号会在JS中添加，这里只需要管样式 */
    margin-right: 4px; 
}
.danmu-content { 
    color: #fff; 
}

/* 5. 底部操作栏 */
.live-action-bar { 
    display: flex; 
    align-items: center; 
    padding: 5px 15px; 
    gap: 15px; 
}

.live-chat-input-box { 
    flex: 1; 
    background: rgba(0,0,0,0.4); 
    border-radius: 20px; 
    padding: 8px 15px; 
    color: rgba(255,255,255,0.7); 
    font-size: 14px; 
    display: flex;
    align-items: center;
    gap: 5px;
}

.live-icon-btn { 
    width: 38px; 
    height: 38px; 
    background: rgba(255,255,255,0.1); 
    border-radius: 50%; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    font-size: 22px; 
    transition: transform 0.2s; 
}
.live-icon-btn:active { 
    transform: scale(0.9); 
    background: rgba(255,255,255,0.2);
}

/* 动画定义 */
@keyframes fadeInUp { 
    from { opacity: 0; transform: translateY(20px); } 
    to { opacity: 1; transform: translateY(0); } 
}
@keyframes slideInLeft { 
    from { opacity: 0; transform: translateX(-20px); } 
    to { opacity: 1; transform: translateX(0); } 
}

/* --- 直播设置弹窗专属样式 --- */

/* 1. 让弹窗更宽 */
#liveSettingsModal .modal-content {
    width: 92% !important;        /* 占据屏幕宽度的 92% */
    max-width: 450px !important;  /* 最大宽度增加到 450px (原来通常是 300-320px) */
    padding: 30px 25px !important; /* 增加内边距，让布局更舒展 */
    border-radius: 20px !important;
}

/* 2. 黑白风格滑动条 (覆盖默认样式) */
#liveDurationSlider {
    -webkit-appearance: none;  /* 清除默认样式 */
    width: 100%;
    height: 4px;
    background: #e0e0e0;       /* 轨道颜色：浅灰 */
    border-radius: 2px;
    outline: none;
    margin-top: 10px;
}

/* 滑块头 (拖动的小圆球) */
#liveDurationSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;               /* 圆球变大一点，更好拖动 */
    height: 24px;
    background: #000000;       /* 圆球颜色：纯黑 */
    border: 3px solid #ffffff; /* 加一个白色边框，更有质感 */
    border-radius: 50%;        /* 圆形 */
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3); /* 加一点阴影 */
    margin-top: -10px;         /* 垂直居中对齐轨道 */
}

/* --- 直播间底部更多菜单 --- */
.live-menu-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: 150;
    display: none; /* 默认隐藏 */
}
.live-menu-overlay.show { display: block; }

.live-action-menu {
    position: absolute;
    bottom: 70px; /* 在底部操作栏上方 */
    left: 10px;   /* 靠左对齐或者居中，这里选靠左对应按钮位置 */
    background: rgba(30, 30, 30, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 10px;
    display: flex;
    gap: 15px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    animation: slideUpFade 0.2s ease-out;
}

.live-menu-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 12px;
    cursor: pointer;
    min-width: 50px;
    background: none;
    border: none;
    opacity: 0.8;
    transition: opacity 0.2s;
}
.live-menu-btn:active { opacity: 1; transform: scale(0.95); }

.live-menu-icon {
    font-size: 24px;
    margin-bottom: 4px;
    color: #fff;
}

.live-menu-desc {
    font-size: 10px;
    color: #888;
    transform: scale(0.9);
}

@keyframes slideUpFade {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
}

/* --- 直播倍速弹窗专属修复 --- */

/* 1. 修复层级问题：必须高于直播间的 3000 */
#liveVisualSettingsModal {
    z-index: 3005 !important;
}

/* 2. 滑动条轨道：浅灰色 */
#liveSpeedSlider {
    -webkit-appearance: none;
    width: 100%;
    height: 4px;
    background: #e0e0e0 !important;
    border-radius: 2px;
    outline: none;
}

/* 3. 滑动条滑块：纯黑 + 白边 (黑白极简风) */
#liveSpeedSlider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 24px;
    height: 24px;
    background: #000000 !important; /* 黑色圆球 */
    border: 3px solid #ffffff;      /* 白色边框增加层次感 */
    border-radius: 50%;
    cursor: pointer;
    box-shadow: 0 2px 6px rgba(0,0,0,0.2); /* 淡淡的阴影 */
    margin-top: -10px; /* 垂直居中对齐轨道 */
}

/* 4. 数字显示颜色：由蓝变黑 */
#liveSpeedDisplay {
    color: #000000 !important;
}

/* 5. 确认按钮：黑底白字 */
#liveVisualSettingsModal .modal-btn-confirm {
    background-color: #000000 !important;
    color: #ffffff !important;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2) !important;
}

/* 6. 取消按钮：浅灰底 */
#liveVisualSettingsModal .modal-btn-cancel {
    background-color: #f5f5f5 !important;
    color: #666666 !important;
}

/* 直播App 个人中心头像样式 */
.live-me-avatar {
    width: 80px; 
    height: 80px;
    border-radius: 50%;
    margin: 0 auto 15px; /* 居中并与下方留出间距 */
    border: 2px solid rgba(255, 255, 255, 0.2); /* 淡淡的边框 */
    overflow: hidden; /* 裁剪超出部分 */
    background-color: #333; /* 默认深色背景 */
    background-repeat: no-repeat;
    /* 关键：确保这几行存在，图片才能正常显示 */
    background-size: cover;
    background-position: center;
}

/* --- 直播贡献榜弹窗样式 --- */
.live-rank-overlay {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0, 0, 0, 0.4);
    z-index: 3500; /* 高于直播间层级 */
    display: none;
    flex-direction: column;
    justify-content: flex-end;
    opacity: 0;
    transition: opacity 0.2s ease;
}
.live-rank-overlay.show {
    display: flex;
    opacity: 1;
}

.live-rank-content {
    background: #ffffff;
    width: 100%;
    height: 70vh;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    color: #333;
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
    position: relative;
    overflow: hidden;
}
.live-rank-overlay.show .live-rank-content {
    transform: translateY(0);
}

.live-rank-header {
    padding: 15px 15px 5px;
    border-bottom: 1px solid #f0f0f0;
}
.live-rank-title-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
}
.live-rank-title-row span {
    font-size: 16px;
    font-weight: bold;
    color: #000;
}
.live-rank-close {
    font-size: 20px;
    color: #999;
    cursor: pointer;
}

/* 仿抖音的子标签栏 */
.live-rank-tabs {
    display: flex;
    gap: 15px;
    font-size: 14px;
    color: #666;
    margin-bottom: 10px;
}
.live-rank-tab {
    position: relative;
    padding-bottom: 5px;
}
.live-rank-tab.active {
    color: #8a2be2; /* 紫色字 */
    font-weight: bold;
}
.live-rank-tab.active::after {
    content: '';
    position: absolute;
    bottom: 0; left: 20%; width: 60%; height: 3px;
    background: #8a2be2;
    border-radius: 2px;
}

/* 列表区域 */
#liveRankListArea {
    flex: 1;
    overflow-y: auto;
    padding: 0 15px 70px 15px; /* 底部留出空间给我的排名 */
}

.live-rank-item {
    display: flex;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #fafafa;
}

.rank-num {
    width: 30px;
    font-size: 16px;
    font-weight: 900;
    font-style: italic;
    color: #ccc;
    text-align: center;
    margin-right: 10px;
}
.rank-num.rank-1 { color: #ff3b30; font-size: 18px; } /* 第一名红 */
.rank-num.rank-2 { color: #ff9500; font-size: 17px; } /* 第二名橙 */
.rank-num.rank-3 { color: #ffcc00; font-size: 16px; } /* 第三名黄 */

.rank-avatar {
    width: 42px; height: 42px;
    border-radius: 50%;
    background-size: cover;
    background-position: center;
    background-color: #eee;
    margin-right: 12px;
    border: 1px solid #f0f0f0;
}

.rank-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
}
.rank-name {
    font-size: 14px;
    font-weight: bold;
    color: #333;
    margin-bottom: 4px;
}
.rank-badges {
    display: flex;
    gap: 4px;
}
.rank-badge {
    background: linear-gradient(90deg, #b388ff, #ff9a9e);
    color: #fff;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 8px;
    font-weight: bold;
}

.rank-score {
    font-size: 14px;
    font-family: Arial, sans-serif;
    color: #ff9500;
    font-weight: bold;
}

/* 固定在底部的“我的排名” */
.live-my-rank-bar {
    position: absolute;
    bottom: 0; left: 0; width: 100%;
    height: 60px;
    background: #fff;
    border-top: 1px solid #eee;
    display: flex;
    align-items: center;
    padding: 0 15px;
    padding-bottom: env(safe-area-inset-bottom);
    box-shadow: 0 -2px 10px rgba(0,0,0,0.02);
}

/* --- 连麦悬浮窗样式 --- */
.live-mic-window {
    position: absolute;
    bottom: 75px; /* 在底部操作栏的上方 */
    right: 15px;  /* 靠右对齐 */
    width: 90px;
    height: 110px;
    background: rgba(0, 0, 0, 0.65);
    border: 2px solid #ff4d4d; /* 红色边框表示正在连麦 */
    border-radius: 12px;
    display: none; /* 默认隐藏 */
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 120;
    backdrop-filter: blur(5px);
    animation: popIn 0.3s ease-out;
    box-shadow: 0 4px 15px rgba(255, 77, 77, 0.3);
}
.live-mic-window.show { display: flex; }

.live-mic-avatar {
    width: 45px; height: 45px; 
    border-radius: 50%;
    background-color: #333; 
    background-size: cover; 
    background-position: center;
    margin-bottom: 6px; 
    border: 2px solid #fff;
}
.live-mic-name { 
    font-size: 11px; color: #fff; 
    white-space: nowrap; overflow: hidden; 
    text-overflow: ellipsis; max-width: 90%; 
}

/* 麦克风发言按钮 */
.live-mic-btn {
    position: absolute; bottom: -10px; right: -10px;
    width: 32px; height: 32px; 
    border-radius: 50%;
    background: linear-gradient(135deg, #ff4d4d, #ff7a8a);
    color: white; border: 2px solid #fff;
    display: flex; align-items: center; justify-content: center;
    font-size: 16px; cursor: pointer;
    box-shadow: 0 2px 5px rgba(0,0,0,0.5);
    transition: transform 0.1s;
}
.live-mic-btn:active { transform: scale(0.9); }

/* 挂断连麦按钮 */
.live-mic-close {
    position: absolute; top: 4px; left: 4px;
    color: #ccc; font-size: 16px; cursor: pointer;
}
.live-mic-close:hover { color: #fff; }

/* --- [新增] 我开直播的专属界面样式 --- */
#myLiveRoomScreen {
    background-color: #000;
    color: #fff;
    z-index: 3100; /* 比普通直播间层级更高 */
}

/* 模糊头像背景 */
.my-live-bg {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    background-size: cover; background-position: center;
    filter: blur(30px) brightness(0.4); /* 强模糊且压暗 */
    z-index: 1;
}

/* 主播画面中央提示区（记录我说的话/做的动作） */
.my-live-action-log {
    position: absolute; top: 150px; left: 20px; right: 20px;
    height: 180px; overflow-y: auto; z-index: 10;
    display: flex; flex-direction: column; gap: 10px;
    scrollbar-width: none; -ms-overflow-style: none;
    mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
    -webkit-mask-image: linear-gradient(to bottom, transparent, black 15%, black 85%, transparent);
}
.my-live-action-log::-webkit-scrollbar { display: none; }
.my-action-bubble {
    align-self: center; background: rgba(255, 255, 255, 0.15); backdrop-filter: blur(5px);
    padding: 8px 16px; border-radius: 20px; font-size: 14px; color: #fff; text-align: center;
    border: 1px solid rgba(255,255,255,0.2); animation: fadeInUp 0.3s ease-out;
}

/* 礼物弹幕特殊样式 */
.live-danmu-item.gift {
    background: linear-gradient(90deg, rgba(255,77,77,0.8), rgba(255,105,180,0.8));
    border: 1px solid #fff; font-weight: bold;
}

`;
    document.head.appendChild(style);
}

/* ── 注入直播 HTML 到主页面 ── */
function _injectLiveHTML() {
    const container = document.getElementById('live-plugin-mount');
    if (!container) { console.error('[LivePlugin] 找不到 #live-plugin-mount'); return; }
    container.innerHTML = `<!-- 直播App主页面 -->

<div id="liveApp" class="page">
    
    <!-- ▼▼▼ 修改后的顶部导航 ▼▼▼ -->
    <div class="live-top-tabs">
        <!-- 左侧：设置菜单 -->
        <i class="ri-menu-line live-header-btn-left" onclick="openLiveSettingsModal()"></i>

        <!-- 中间：标签页 -->
        <div class="live-tab-item" onclick="switchLiveSubTab('following', this)">关注</div>
        <div class="live-tab-item active" onclick="switchLiveSubTab('recommend', this)">推荐</div>
        
        <!-- 右侧：按钮组 (刷新 + 返回) -->
        <div class="live-header-right-group">
            <i class="ri-refresh-line live-header-btn" id="liveRefreshBtn" onclick="refreshLiveContent()"></i>
            
            <!-- 【新增】返回桌面按钮 -->
            <i class="ri-close-line live-header-btn" onclick="goHome()"></i>
        </div>
    </div>
    <!-- ▲▲▲ 修改结束 ▲▲▲ -->

    <!-- 中间内容区域 -->
    <div class="wechat-content" style="padding-top: 50px; background: #121212; padding-bottom: calc(70px + env(safe-area-inset-bottom)); overflow-y: auto;">
        
        <!-- 首页视图 -->
        <div id="liveHomeView">
            <div id="liveListContainer" class="live-grid">
                <!-- JS 动态生成直播卡片 -->
            </div>
        </div>

        <!-- “我的”视图 -->
<div id="liveMeView" style="display: none; padding-top: 60px; color: white; text-align: center;">
    
    <!-- 隐藏的文件上传控件 -->
    <input type="file" id="liveAvatarInput" accept="image/*" style="display: none;" onchange="handleLiveAvatarUpload(event)">

    <div class="live-me-header">
        <!-- 头像：点击触发上传 -->
        <div class="live-me-avatar" id="liveMeAvatar" onclick="document.getElementById('liveAvatarInput').click()" style="cursor: pointer; position: relative;">
            <!-- 可以加一个小相机图标提示可修改 -->
            <i class="ri-camera-line" style="position: absolute; bottom: 0; right: 0; background: rgba(0,0,0,0.6); border-radius: 50%; padding: 4px; font-size: 12px;"></i>
        </div>
        
        <!-- 名字：点击修改 -->
        <h2 id="liveMeName" style="margin-top: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;" onclick="editLiveName()">
            <span>用户名</span> <i class="ri-edit-2-line" style="font-size: 14px; opacity: 0.7;"></i>
        </h2>
        
        <!-- ID：点击修改 -->
        <p id="liveMeId" style="color: #888; font-size: 12px; margin-top: 5px; cursor: pointer;" onclick="editLiveId()">
            ID: 9527888 <i class="ri-edit-box-line"></i>
        </p>
    </div>

    <div style="display: flex; justify-content: space-around; margin-top: 30px; padding: 0 20px;">
        <div><strong style="display:block; font-size:18px;" id="liveMeFollowing">0</strong><span style="font-size:12px; color:#888;">关注</span></div>
        <div><strong style="display:block; font-size:18px;" id="liveMeFans">0</strong><span style="font-size:12px; color:#888;">粉丝</span></div>
        <div><strong style="display:block; font-size:18px;" id="liveMeLikes">0</strong><span style="font-size:12px; color:#888;">获赞</span></div>
    </div>
    
    <button style="margin-top: 50px; background: #ff4d4d; color: white; border: none; padding: 10px 40px; border-radius: 25px; font-size: 16px;" onclick="openMyLiveSetupModal()">开启直播</button>
</div>
    </div>

    <!-- 底部导航栏 -->
    <div class="live-bottom-bar">
        <div class="live-nav-item active" onclick="switchLiveMainTab('home', this)">
            <span class="live-nav-text">首页</span>
        </div>
        <div class="live-nav-item" style="opacity: 0.5;" onclick="switchLiveMainTab('me', this)">
            <span class="live-nav-text">我的</span>
        </div>
    </div>
</div>

<!-- 直播间预览/入口弹窗 -->
<div id="livePreviewModal" class="modal" style="z-index: 10000;">
    <div class="modal-content" style="background-color: #1f1f1f; color: #fff; border: 1px solid #333; text-align: left; max-height: 80vh; overflow-y: auto;">
        <div class="modal-title" style="color: #fff; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 15px;">
            直播间预览
        </div>
        
        <!-- 主播信息 -->
        <div style="display: flex; align-items: center; margin-bottom: 15px;">
            <div id="previewLiveAvatar" style="width: 40px; height: 40px; border-radius: 50%; background-size: cover; background-position: center; margin-right: 10px; border: 1px solid #555;"></div>
            <div>
                <div id="previewLiveName" style="font-weight: bold; font-size: 16px;">主播名</div>
                <div style="font-size: 12px; color: #888;">
                    <i class="ri-user-3-line"></i> <span id="previewLiveViewers">0</span> 在线
                </div>
            </div>
        </div>

        <!-- 【新增】直播完整标题/简介 -->
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12px; color: #888; margin-bottom: 5px;">直播主题</div>
            <div id="previewLiveTitleFull" style="font-size: 16px; font-weight: bold; line-height: 1.5; color: #fff;">
                <!-- 这里显示完整的标题 -->
            </div>
        </div>

        <!-- 画面描述 -->
        <div style="background: #2c2c2c; padding: 15px; border-radius: 8px; font-size: 14px; line-height: 1.6; color: #ccc; margin-bottom: 20px; max-height: 200px; overflow-y: auto;">
            <strong style="color: #ff4d4d; display: block; margin-bottom: 5px;">[当前画面]</strong>
            <span id="previewLiveDescription">...</span>
        </div>

        <div class="modal-buttons">
            <button class="modal-btn" onclick="closeLivePreviewModal()" style="background: #333; color: #ccc;">取消</button>
            <button class="modal-btn" onclick="enterLiveRoom(currentPreviewLiveId)" style="background: #ff4d4d; color: #fff;">进入直播间</button>
        </div>
    </div>
</div>

<!-- 直播设置弹窗 (升级版 - 宽屏黑白风) -->
<div id="liveSettingsModal" class="modal">
    <div class="modal-content">
        <div class="modal-title" style="font-size: 18px; font-weight: 800; margin-bottom: 20px;">直播内容设置</div>
        
        <!-- 分割线：推荐板块 -->
        <div style="font-size: 12px; color: #999; margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">推荐板块 (路人主播)</div>

        <div class="form-group">
            <label class="form-label" style="font-weight: 600;">推荐世界观</label>
            <div id="currentLiveRecommendWorldview" class="form-input" style="line-height: 2.5; cursor: pointer; background: #f9f9f9; border: none;" onclick="openLiveWorldviewList('recommend')">
                默认 (现代日常)
            </div>
        </div>

        <div class="form-group">
            <label class="form-label" style="font-weight: 600;">全局提示词</label>
            <div id="currentLivePrompt" class="form-input" style="line-height: 2.5; cursor: pointer; background: #f9f9f9; border: none;" onclick="openLivePromptList()">
                无
            </div>
        </div>

        <!-- 分割线：关注板块 -->
        <div style="font-size: 12px; color: #999; margin-top: 25px; margin-bottom: 15px; border-bottom: 1px solid #f0f0f0; padding-bottom: 5px;">关注板块 (好友主播)</div>

        <div class="form-group">
            <label class="form-label" style="font-weight: 600;">关注世界观</label>
            <div id="currentLiveFollowingWorldview" class="form-input" style="line-height: 2.5; cursor: pointer; background: #f9f9f9; border: none;" onclick="openLiveWorldviewList('following')">
                默认 (现代日常)
            </div>
        </div>

        <div class="form-group">
            <label class="form-label" style="font-weight: 600;">选择关注的角色</label>
            <div id="currentLiveCharacters" class="form-input" style="line-height: 2.5; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; background: #f9f9f9; border: none;" onclick="openLiveCharacterSelect()">
                点击选择角色...
            </div>
        </div>

        <!-- 时长滑块 (黑白风) -->
        <div class="form-group" style="margin-top: 25px;">
            <label class="form-label" style="display:flex; justify-content:space-between; font-weight: 600;">
                <span>生成直播时长</span>
                <!-- 数字显示为黑色 -->
                <span style="color:#000; font-weight:bold;"><span id="liveDurationDisplay">60</span>秒</span>
            </label>
            <!-- 注意：去掉了 class="doujin-slider"，完全由 CSS id 控制样式 -->
            <input type="range" id="liveDurationSlider" min="30" max="1000" step="10" value="60" oninput="document.getElementById('liveDurationDisplay').textContent = this.value">
            <div class="form-hint" style="margin-top: 8px;">时长越长，生成时间越久，消耗Token越多。</div>
        </div>

        <!-- 弹幕密度 -->
        <div class="form-group">
            <label class="form-label" style="font-weight: 600;">弹幕生成密度</label>
            <select id="liveDanmuDensitySelect" class="form-select arrow-select" style="background:#f9f9f9; border:none;">
                <option value="low">稀疏 (0-1条/秒)</option>
                <option value="normal">正常 (1-3条/秒)</option>
                <option value="high">火爆 (3-8条/秒)</option>
            </select>
        </div>

        <div class="modal-buttons" style="margin-top: 30px; gap: 15px;">
            <button class="modal-btn modal-btn-cancel" onclick="closeLiveSettingsModal()" style="background: #f5f5f5; color: #666;">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="saveLiveSettings()" style="background: #000; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">保存</button>
        </div>
    </div>
</div>

<!-- 新增：直播角色选择弹窗 -->
<div id="liveCharacterSelectModal" class="modal">
    <div class="modal-content">
        <div class="modal-title">选择关注的主播</div>
        <div id="liveCharacterSelectList" class="multi-select-list" style="max-height: 50vh; overflow-y: auto;">
            <!-- JS 生成 -->
        </div>
        <div class="modal-buttons" style="margin-top: 15px;">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('liveCharacterSelectModal').classList.remove('show')">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="saveLiveCharacterSelect()">保存</button>
        </div>
    </div>
</div>

<!-- 直播世界观选择列表 -->
<div id="liveWorldviewListModal" class="modal">
    <div class="modal-content">
        <div class="modal-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>选择世界观</span>
            <button class="nav-btn" style="padding: 4px 8px;" onclick="openEditLiveWorldviewModal(null)">+</button>
        </div>
        <div id="liveWorldviewList" class="friend-list" style="max-height: 50vh; overflow-y: auto;"></div>
        <div class="modal-buttons" style="margin-top: 15px;">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('liveWorldviewListModal').classList.remove('show')">关闭</button>
        </div>
    </div>
</div>

<!-- 直播提示词选择列表 -->
<div id="livePromptListModal" class="modal">
    <div class="modal-content">
        <div class="modal-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>选择提示词</span>
            <button class="nav-btn" style="padding: 4px 8px;" onclick="openEditLivePromptModal(null)">+</button>
        </div>
        <div id="livePromptList" class="friend-list" style="max-height: 50vh; overflow-y: auto;"></div>
        <div class="modal-buttons" style="margin-top: 15px;">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('livePromptListModal').classList.remove('show')">关闭</button>
        </div>
    </div>
</div>

<!-- 编辑/新建世界观 -->
<div id="editLiveWorldviewModal" class="modal">
    <div class="modal-content">
        <div class="modal-title" id="editLiveWorldviewTitle">新建世界观</div>
        <input type="text" class="modal-input" id="liveWorldviewNameInput" placeholder="名称 (如: 赛博朋克)">
        <textarea class="modal-textarea" id="liveWorldviewContentInput" placeholder="描述这个直播世界的背景、科技水平、热门话题等..." style="min-height: 200px;"></textarea>
        <div class="modal-buttons">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('editLiveWorldviewModal').classList.remove('show')">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="saveLiveWorldview()">保存</button>
        </div>
    </div>
</div>

<!-- 编辑/新建提示词 -->
<div id="editLivePromptModal" class="modal">
    <div class="modal-content">
        <div class="modal-title" id="editLivePromptTitle">新建提示词</div>
        <input type="text" class="modal-input" id="livePromptNameInput" placeholder="名称 (如: 搞怪风格)">
        <textarea class="modal-textarea" id="livePromptContentInput" placeholder="输入具体的AI指令，例如：直播标题要夸张，主播风格要搞笑..." style="min-height: 200px;"></textarea>
        <div class="modal-buttons">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('editLivePromptModal').classList.remove('show')">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="saveLivePrompt()">保存</button>
        </div>
    </div>
</div>

<!-- 全屏直播间页面 (V3) -->
<div id="liveRoomScreen" class="page">
    <!-- 1. 直播间背景 -->
    <div id="liveRoomBg" class="live-room-bg"></div>

    <!-- 2. 画面描述滚动区 (中间偏上，不再有小标签) -->
    <div id="liveVisualList" class="live-visual-scroll-area">
        <!-- 动态生成的描述气泡会放在这里 -->
    </div>

    <!-- 3. 顶部信息栏 -->
    <div class="live-room-header">
        <!-- 左侧：主播 -->
        <div class="live-host-pill">
            <div id="liveRoomAvatar" class="live-room-avatar"></div>
            <div class="live-host-text">
                <div id="liveRoomName" class="live-host-name">主播名</div>
                <div class="live-host-sub">6.8w 本场点赞</div>
            </div>
            <button class="live-follow-btn">关注</button>
        </div>
        
        <!-- 右侧：观众 + 关闭 -->
        <div class="live-header-right-part" onclick="openLiveRankModal()" style="cursor:pointer;" title="点击查看贡献榜">
            <!-- 观众头像组 -->
            <div class="live-viewer-avatars" id="liveViewerAvatars">
                <!-- JS 填充 -->
                <div class="viewer-avatar"></div>
                <div class="viewer-avatar"></div>
                <div class="viewer-avatar"></div>
            </div>
            <div class="live-viewer-count" id="liveRoomViewerCount">1.2w</div>
            
            <!-- 关闭按钮 -->
            <!-- 关闭按钮 -->
            <button class="live-close-btn" onclick="event.stopPropagation(); quitLiveRoom()">
                <i class="ri-close-line"></i>
            </button>
        </div>
    </div>

    <!-- 4. 底部弹幕与操作 -->
    <div class="live-room-footer">
    <!-- 连麦悬浮方块 -->
        <div id="liveMicWindow" class="live-mic-window">
            <i class="ri-close-line live-mic-close" onclick="closeLiveMicCall()"></i>
            <div id="liveMicAvatar" class="live-mic-avatar"></div>
            <div id="liveMicName" class="live-mic-name">我</div>
            <!-- 右下角的说话按钮 -->
            <button class="live-mic-btn" onclick="openLiveMicInput()"><i class="ri-mic-fill"></i></button>
        </div>
        <div id="liveDanmuContainer" class="live-danmu-area"></div>

        <!-- 新增：功能菜单弹出层 (纯白图标版) -->
<div id="liveMoreMenu" class="live-menu-overlay" onclick="toggleLiveMoreMenu()">
    <div class="live-action-menu" onclick="event.stopPropagation()">
        
        <!-- 按钮1：重播 -->
        <button class="live-menu-btn" onclick="replayLiveStream()">
            <!-- 删除了 style="color:..."，图标会自动变白 -->
            <i class="ri-replay-10-line live-menu-icon"></i>
            <span>重播</span>
            <span class="live-menu-desc">从头播放</span>
        </button>

        <!-- 按钮2：续写 -->
        <button class="live-menu-btn" onclick="continueLiveStream()">
            <i class="ri-play-list-add-line live-menu-icon"></i>
            <span>续写</span>
            <span class="live-menu-desc">生成后续</span>
        </button>

        <!-- 按钮3：重新生成 -->
        <button class="live-menu-btn" onclick="regenerateLiveStream()">
            <i class="ri-refresh-line live-menu-icon"></i>
            <span>重随</span>
            <span class="live-menu-desc">重做上一段</span>
        </button>

        <!-- 按钮4：倍速 (刚才添加的功能) -->
        <button class="live-menu-btn" onclick="openLiveVisualSettings()">
            <i class="ri-speed-line live-menu-icon"></i>
            <span>倍速</span>
            <span class="live-menu-desc">调节速度</span>
        </button>

<!-- 按钮5：连麦 -->
        <button class="live-menu-btn" onclick="requestLiveMic()">
            <i class="ri-mic-line live-menu-icon"></i>
            <span>连麦</span>
            <span class="live-menu-desc">请求上麦</span>
        </button>

    </div>
</div>

        <div class="live-action-bar">
        <div class="live-chat-input-box" style="padding: 0 10px; background: rgba(0,0,0,0.6);">
            <!-- 真实的输入框 -->
            <input type="text" id="liveUserDanmuInput" placeholder="说点什么..." 
                   style="flex: 1; background: transparent; border: none; color: white; font-size: 14px; outline: none; height: 36px;"
                   onkeydown="if(event.key === 'Enter') sendLiveDanmu()">
        </div>
        
        <!-- 发送按钮 -->
        <div class="live-icon-btn" onclick="sendLiveDanmu()" style="background: #ff4d4d; color: white;">
            <i class="ri-send-plane-fill" style="font-size: 18px;"></i>
        </div>
        
        <div class="live-icon-btn" onclick="toggleLiveMoreMenu()"><i class="ri-more-fill"></i></div>
        <div class="live-icon-btn" onclick="openLiveGiftModal()"><i class="ri-gift-2-fill" style="color: #ff4d4d;"></i></div>
    </div>
    
</div>
</div>

<!-- 直播画面设置弹窗 -->
<div id="liveVisualSettingsModal" class="modal">
    <div class="modal-content">
        <div class="modal-title">直播播放设置</div>
        
        <div class="form-group" style="margin-bottom: 25px;">
            <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                <span>播放速度</span>
                <span id="liveSpeedDisplay" style="font-weight:bold;">1.0x</span>
            </label>
            <div style="font-size:12px; color:#999; margin-bottom:15px;">影响画面气泡和弹幕的滚动快慢</div>
            
            <!-- 使用 range 滑块，从 0.5x 到 3.0x -->
            <input type="range" id="liveSpeedSlider" class="font-size-slider" 
                   min="0.5" max="3.0" step="0.25" value="1.0" 
                   oninput="updateLiveSpeedPreview(this.value)">
                   
            <div style="display:flex; justify-content:space-between; margin-top:5px; font-size:10px; color:#ccc;">
                <span>0.5x(慢)</span>
                <span>1.0x(正常)</span>
                <span>2.0x(快)</span>
                <span>3.0x(极速)</span>
            </div>
        </div>

        <div class="modal-buttons">
            <button class="modal-btn modal-btn-cancel" onclick="closeLiveVisualSettings()">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="saveLiveVisualSettings()">确认生效</button>
        </div>
    </div>
</div>

<!-- 直播送礼弹窗 -->
<div id="liveGiftModal" class="modal" style="z-index: 10005;">
    <div class="modal-content" style="width: 95%; max-width: 450px; background: #1e1e1e; border: 1px solid #333;">
        <div class="modal-title" style="color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px;">送出礼物</div>
        <div style="text-align: center; font-size: 12px; color: #888; margin-bottom: 15px;">
            当前余额: <span id="liveGiftBalanceDisplay" style="color: #f2c353; font-weight: bold;">0.00</span>
        </div>
        <div id="liveGiftListContainer" class="gift-grid-container" style="max-height: 350px; overflow-y: auto;">
            <!-- JS 动态生成 -->
        </div>
        <div class="modal-buttons" style="margin-top: 20px;">
            <button class="modal-btn modal-btn-cancel" onclick="closeLiveGiftModal()" style="background: #333; color: #ccc;">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="confirmLiveGiftSend()" style="background: #ff4d4d; color: #fff;">确认赠送</button>
        </div>
    </div>
</div>

<!-- 直播在线观众/贡献榜弹窗 -->
<div id="liveRankModal" class="live-rank-overlay" onclick="closeLiveRankModal()">
    <div class="live-rank-content" onclick="event.stopPropagation()">
        <!-- 头部 -->
        <div class="live-rank-header">
            <div class="live-rank-title-row">
                <span>在线观众</span>
                <i class="ri-close-line live-rank-close" onclick="closeLiveRankModal()"></i>
            </div>
            <div class="live-rank-tabs">
                <div class="live-rank-tab active">贡献榜</div>
                <div class="live-rank-tab">高等级 (30)</div>
                <div class="live-rank-tab">贵族 (5)</div>
            </div>
        </div>
        
        <!-- 列表区 -->
        <div id="liveRankListArea">
            <!-- JS 动态生成排名 -->
        </div>

        <!-- 底部我的排名 -->
        <div class="live-my-rank-bar">
            <div class="rank-num" id="myRankNum" style="color:#999; font-size:14px;">-</div>
            <div class="rank-avatar" id="myRankAvatar"></div>
            <div class="rank-info">
                <div class="rank-name" id="myRankName" style="color:#999;">我</div>
            </div>
            <div class="rank-score" id="myRankScore" style="color:#333;">0</div>
        </div>
    </div>
</div>

<!-- 连麦发言输入弹窗 -->
<div id="liveMicInputModal" class="modal" style="z-index: 3505;">
    <div class="modal-content" style="background: #1e1e1e; color: #fff; border: 1px solid #333; width: 90%; max-width: 400px;">
        <div class="modal-title" style="color: #fff; border-bottom: 1px solid #333; padding-bottom: 10px;">麦上发言</div>
        <textarea id="liveMicVoiceText" class="modal-textarea" placeholder="输入你想在麦上对大家说的话..." style="background: #2c2c2c; color: #fff; border: 1px solid #444; min-height: 80px;"></textarea>
        <div class="modal-buttons" style="margin-top: 15px;">
            <button class="modal-btn modal-btn-cancel" onclick="closeLiveMicInput()" style="background: #333; color: #ccc;">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="sendLiveMicVoice()" style="background: #ff4d4d; color: #fff;">开麦说话</button>
        </div>
    </div>
</div>

<!-- [新增] 开播设置弹窗 -->
<div id="myLiveSetupModal" class="modal" style="z-index: 10005;">
    <div class="modal-content" style="background: #1e1e1e; color: #fff; border: 1px solid #333;">
        <div class="modal-title" style="color: #fff;">开播设置</div>
        
        <div class="form-group">
            <label class="form-label" style="color: #ccc;">直播分类</label>
            <select id="myLiveCategory" class="form-select arrow-select" style="background: #2c2c2e; border: none; color: #fff;">
                <option value="聊天日常">聊天日常</option>
                <option value="才艺表演">才艺表演</option>
                <option value="游戏实况">游戏实况</option>
                <option value="吃播助眠">吃播助眠</option>
            </select>
        </div>

        <div class="form-group">
            <label class="form-label" style="color: #ccc;">直播简介/标题</label>
            <input type="text" id="myLiveTitle" class="modal-input" placeholder="起个吸引人的标题..." style="background: #2c2c2e; border: none; color: #fff;">
        </div>

        <div class="form-group">
            <label class="form-label" style="color: #ccc;">直播间规则/人设提示词</label>
            <textarea id="myLiveRules" class="modal-textarea" placeholder="例如：我是个傲娇主播，观众喜欢互怼；或者，不许提某某话题..." style="background: #2c2c2e; border: none; color: #fff; min-height: 80px;"></textarea>
        </div>

        <div class="modal-buttons" style="margin-top: 20px;">
            <button class="modal-btn modal-btn-cancel" onclick="closeMyLiveSetupModal()" style="background: #333; color: #ccc;">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="startMyLiveRoom()" style="background: #ff4d4d; color: #fff;">开始直播</button>
        </div>
    </div>
</div>

<!-- [新增] 我开直播的专属界面 -->
<div id="myLiveRoomScreen" class="page">
    <!-- 背景 (头像模糊) -->
    <div id="myLiveBg" class="my-live-bg"></div>

    <!-- 主播的动作/语言显示区 -->
    <div id="myLiveActionLog" class="my-live-action-log"></div>

    <!-- 顶部信息栏 -->
    <div class="live-room-header">
        <div class="live-host-pill">
            <div id="myLiveRoomAvatar" class="live-room-avatar"></div>
            <div class="live-host-text">
                <div id="myLiveRoomName" class="live-host-name">我</div>
                <div class="live-host-sub">直播中</div>
            </div>
        </div>
        
        <!-- 右侧容器：观众人数 + 退出按钮 -->
        <div class="live-header-right-part" style="display: flex; align-items: center; gap: 8px;">
            <!-- 1. 人数小胶囊 (去掉了在线两字，高度与左边主播框对齐) -->
            <div onclick="openMyLiveRankModal()" style="cursor:pointer; background: rgba(0, 0, 0, 0.4); height: 38px; padding: 0 12px; border-radius: 30px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                <i class="ri-user-3-line" style="margin-right: 5px; font-size: 15px;"></i> 
                <span id="myLiveViewerCountText" style="font-size: 14px; font-weight: bold;">0</span>
            </div>
            
            <!-- 2. 独立的退出按钮 (变成一个半透明小圆圈) -->
            <button class="live-close-btn" onclick="event.stopPropagation(); quitMyLiveRoom()" style="background: rgba(0, 0, 0, 0.4); height: 38px; width: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: none; padding: 0; margin: 0; backdrop-filter: blur(5px);">
                <i class="ri-close-line" style="color:#fff; font-size:22px; font-weight:bold;"></i>
            </button>
        </div>
    </div>

    <!-- 底部操作区 -->
    <div class="live-room-footer">
        <!-- 弹幕滚动区 -->
        <div id="myLiveDanmuContainer" class="live-danmu-area"></div>

        <!-- 推进操作栏 -->
        <div class="live-action-bar">
            <div class="live-chat-input-box" style="padding: 0 10px; background: rgba(0,0,0,0.6);">
                <input type="text" id="myLiveHostInput" placeholder="输入你在此刻说的话或做的动作..." 
                       style="flex: 1; background: transparent; border: none; color: white; font-size: 14px; outline: none; height: 36px;"
                       onkeydown="if(event.key === 'Enter') advanceMyLive()">
            </div>
            <div id="myLiveAdvanceBtn" class="live-icon-btn" onclick="advanceMyLive()" style="background: #ff4d4d; color: white; width: 60px; border-radius: 20px; font-size: 14px; font-weight: bold;">
                推进
            </div>
        </div>
    </div>
</div>

`;
}

/* ── 直播 App 全部逻辑 ── */
// --- 直播 App 逻辑 ---

// 1. 初始化直播App
function initLiveApp() {
    // 强制设置页面状态，隐藏系统状态栏
    const phoneDiv = document.querySelector('.phone');
    phoneDiv.classList.add('live-app-active');
    
    // 初始化时加载推荐列表
    switchLiveSubTab('recommend', document.querySelector('.live-tab-item.active'));
    
    // 初始化“我的”页面数据
    updateLiveProfile();
}

// 2. 切换底部主Tab (首页/我的)
function switchLiveMainTab(tab, element) {
    currentLiveMainTab = tab;
    
    // 更新底部样式
    document.querySelectorAll('.live-nav-item').forEach(el => {
        el.style.opacity = '0.5';
        el.classList.remove('active');
    });
    if (element) {
        element.style.opacity = '1';
        element.classList.add('active');
    }

    // 切换视图
    if (tab === 'home') {
        document.getElementById('liveHomeView').style.display = 'block';
        document.getElementById('liveMeView').style.display = 'none';
        document.querySelector('.live-top-tabs').style.display = 'flex'; // 显示顶部标签
    } else {
        document.getElementById('liveHomeView').style.display = 'none';
        document.getElementById('liveMeView').style.display = 'block';
        document.querySelector('.live-top-tabs').style.display = 'none'; // 隐藏顶部标签
        updateLiveProfile();
    }
}

// 3. 切换顶部子Tab (推荐/关注)
function switchLiveSubTab(tab, element) {
    currentLiveSubTab = tab;
    
    // 更新顶部样式
    if (element) {
        document.querySelectorAll('.live-top-tabs .live-tab-item').forEach(el => el.classList.remove('active'));
        element.classList.add('active');
    }
    
    // 生成数据并渲染
    const list = generateLiveList(tab);
    renderLiveGrid(list);
}

// [修改] 生成/获取直播数据
function generateLiveList(type) {
    if (type === 'following') {
        // 如果有缓存的关注列表数据，直接返回
        if (currentLiveFollowingList && currentLiveFollowingList.length > 0) {
            return currentLiveFollowingList;
        }
        
       
        return [];
    } else {
        // 推荐板块
        return currentLiveRecommendations || [];
    }
}

/**
 * [修改版] 渲染直播网格列表
 * 修复：支持 Base64 头像显示
 */
function renderLiveGrid(data) {
    const container = document.getElementById('liveListContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    // --- 1. 处理空数据状态 ---
    if (!data || data.length === 0) {
        if (currentLiveSubTab === 'following') {
             // 情况A: 关注列表为空
             if (!liveSettings.activeAiIds || liveSettings.activeAiIds.length === 0) {
                 container.innerHTML = `
                 <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
                    <i class="ri-user-add-line" style="font-size: 40px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                    <p>还没有关注的主播</p>
                    <span onclick="openLiveSettingsModal()" style="color:#ff4d4d; text-decoration:underline; cursor:pointer; font-size:14px; margin-top:5px; display:inline-block;">去左上角设置添加</span>
                 </div>`;
             } else {
                 container.innerHTML = `
                 <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">
                    <i class="ri-signal-tower-line" style="font-size: 40px; margin-bottom: 10px; display: block; opacity: 0.5;"></i>
                    <p>正在连接好友信号...</p>
                    <p style="font-size:12px; margin-top:5px;">(请点击右上角刷新按钮)</p>
                 </div>`;
             }
        } else {
             // 情况B: 推荐列表为空
             container.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #666;">暂无推荐内容，请刷新</div>`;
        }
        return;
    }
    
    // --- 2. 遍历渲染卡片 ---
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'live-card';
        
        // 绑定点击事件：打开预览
        card.onclick = () => {
            openLivePreviewModal(item.id);
        };
        
        // --- 【核心修复】头像样式处理 (兼容 Base64 和 HTTP) ---
        let avatarStyle = "";
        let avatarContent = "";
        
        // 只要有 avatar 且不为空字符串，就认为是图片
        if (item.avatar && item.avatar.length > 5) {
            avatarStyle = `background-image: url('${item.avatar}');`;
            avatarContent = "";
        } else {
            // 是文字 (例如好友的名字首字)
            avatarStyle = `background-color: #333; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;`;
            avatarContent = item.name ? item.name[0] : "?";
        }
        
        const viewerStr = formatViewerCount(item.viewers);

        card.innerHTML = `
            <!-- 背景 (深色渐变) -->
            <div style="width:100%; height:100%; background: linear-gradient(45deg, #1a1a1a, #2c2c2c);"></div>

            <!-- 直播中标签 -->
            <div class="live-tag-badge">
                <div class="live-pulse-dot"></div>
                <span>直播中</span>
            </div>
            
            <!-- 底部信息浮层 -->
            <div class="live-info-overlay">
                <div class="live-title">${item.title}</div>
                <div class="live-author-row">
                    <div class="live-author-avatar" style="${avatarStyle}">${avatarContent}</div>
                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width: 80px;">${item.name}</span>
                    
                    <span class="live-viewer-count">
                        <i class="ri-user-3-line" style="font-size: 12px;"></i> ${viewerStr}
                    </span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// [修改版] 更新直播App“我的”页面信息 (带默认占位图)
function updateLiveProfile() {
    const avatarEl = document.getElementById('liveMeAvatar');
    const nameEl = document.getElementById('liveMeName').querySelector('span');
    const idEl = document.getElementById('liveMeId');
    const followEl = document.getElementById('liveMeFollowing');
    const fansEl = document.getElementById('liveMeFans');
    const likesEl = document.getElementById('liveMeLikes');

    // 1. 定义一个默认占位图 (你可以换成任何你喜欢的图片链接)
    // 这里使用一个通用的灰色用户头像
    const defaultPlaceholder = "https://img.icons8.com/ios-filled/200/cccccc/user.png";

    // 2. 设置头像逻辑
    // 无论是有自定义头像，还是没有，我们都统一用 backgroundImage 来显示
    const imgToShow = liveUserProfile.avatarImage || defaultPlaceholder;

    avatarEl.style.backgroundImage = `url('${imgToShow}')`;
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
    avatarEl.style.backgroundColor = '#f0f0f0'; // 给一个浅灰底色，防止透明图看不清
    avatarEl.innerText = ''; // 清空文字，确保不显示名字首字母

    // 3. 设置其他文本
    nameEl.textContent = liveUserProfile.name || "点击修改昵称";
    idEl.innerHTML = `ID: ${liveUserProfile.id} <i class="ri-edit-box-line"></i>`;
    
    // 4. 设置数据
    followEl.textContent = liveUserProfile.following || 0;
    fansEl.textContent = liveUserProfile.fans || 0;
    likesEl.textContent = liveUserProfile.likes || 0;
}

/**
 * [核心] 初始化直播App
 * 修改逻辑：如果是第一次进入（列表为空），则自动触发生成
 */
function initLiveApp() {
    // 1. 设置状态栏
    const phoneDiv = document.querySelector('.phone');
    phoneDiv.classList.add('live-app-active');
    
    // 2. 检查是否有数据
    if (!currentLiveRecommendations || currentLiveRecommendations.length === 0) {
        // 如果没有数据，切换到推荐页并生成
        switchLiveSubTab('recommend', document.querySelector('.live-tab-item.active'));
        generateLiveRecommendations(); // <--- 触发生成
    } else {
        // 如果有数据，直接渲染
        switchLiveSubTab('recommend', document.querySelector('.live-tab-item.active'));
    }
    
    updateLiveProfile();
}

/**
 * [修改版] 调用 API 生成 20 个直播间数据
 * 支持自定义世界观和全局提示词 (isForceRefresh参数用于按钮强制刷新)
 */
async function generateLiveRecommendations(isForceRefresh = false) {
    const container = document.getElementById('liveListContainer');
    const refreshBtn = document.getElementById('liveRefreshBtn');

    // 1. 检查 API
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl || !settings.apiKey) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:red;">请先配置API</div>';
        return;
    }

    // 2. UI 状态
    if (isForceRefresh) {
        if (refreshBtn) refreshBtn.classList.add('rotate-anim');
        showToast("正在搜索直播信号...");
    }
    
    if (container.innerHTML.trim() === '' || isForceRefresh) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px; color: #888;">
            <div class="loading-spinner" style="width:30px;height:30px;border-width:3px;margin:0 auto 10px;"></div>
            正在搜索直播信号...
        </div>`;
    }

    // 3. 【核心】构建上下文
    let contextPrompt = "";
    
    // --- 【核心修复开始】 ---
    // 之前写的是 liveSettings.worldviewId，这会导致读不到数据。
    // 必须改为 liveSettings.recommendWorldviewId
    if (liveSettings.recommendWorldviewId) {
        const wv = liveWorldviews.find(i => i.id === liveSettings.recommendWorldviewId);
        if (wv) {
            contextPrompt += `\n【当前直播世界观】: ${wv.content}\n请确保生成的直播内容（标题、描述、主播风格）完全符合这个世界观的设定。\n`;
        }
    } else {
        contextPrompt += `\n【当前直播世界观】: 默认现代互联网直播环境（抖音/TikTok风格）。\n`;
    }
    // --- 【核心修复结束】 ---

    // 注入全局提示词
    if (liveSettings.promptId) {
        const pmt = livePrompts.find(i => i.id === liveSettings.promptId);
        if (pmt) {
            contextPrompt += `\n【额外全局指令】: ${pmt.content}\n`;
        }
    }

    const temp = parseFloat(settings.apiTemperature) || 1.0;

    const prompt = `
【任务】: 请生成 **20个** 不同类型的直播间数据。

${contextPrompt}

【要求】:
1.  **多样性**: 涵盖 该世界观下的各种可能性。例如如果是修仙世界，可以是“直播炼丹”、“御剑飞行教学”；如果是现代，可以是“颜值”、“游戏”、“带货”等。
2.  **网感**: 标题要吸引眼球，符合直播平台的调性。
3.  **画面描述**: \`description\` 字段是对直播间当前画面的**详细文字描述**（30-60字）。包含主播动作、背景、氛围。
4.  **观看人数**: \`viewers\` 是一个纯数字，随机分布。

【输出格式】:
必须返回一个纯净的 JSON 数组 \`[]\`，包含 20 个对象。格式如下：
{
  "name": "主播网名",
  "title": "直播间标题",
  "viewers": 12345,
  "description": "详细的画面描述..."
}
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: parseFloat(settings.apiTemperature) || 1.0 // <--- 修改这一行
            })
        });

        if (!response.ok) throw new Error("API请求失败");

        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) throw new Error("JSON解析失败");
        
        const generatedList = JSON.parse(jsonMatch[0]);

        // 数据后处理：添加头像和ID
        currentLiveRecommendations = generatedList.map((item, index) => {
            return {
                id: `live_rec_${Date.now()}_${index}`,
                name: item.name,
                title: item.title,
                viewers: item.viewers,
                description: item.description,
                // 随机分配一个头像
                avatar: passerbyAvatarUrls[Math.floor(Math.random() * passerbyAvatarUrls.length)],
                isFriend: false
            };
        });

        await saveData(); // 保存
        
        // 渲染
        renderLiveGrid(currentLiveRecommendations);
        if (isForceRefresh) showToast("直播列表已更新");

    } catch (e) {
        console.error("生成直播失败", e);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">
            加载失败: ${e.message}<br><span onclick="generateLiveRecommendations(true)" style="color:#ff4d4d;cursor:pointer;">点击重试</span>
        </div>`;
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('rotate-anim');
    }
}

/**
 * [修改] 打开直播预览弹窗
 */
function openLivePreviewModal(liveId) {
    // 1. 先在推荐里找
    let liveData = (currentLiveRecommendations || []).find(l => l.id === liveId);
    
    // 2. 没找到，去关注列表里找
    if (!liveData) {
        liveData = (currentLiveFollowingList || []).find(l => l.id === liveId);
    }
    
    if (!liveData) {
        console.warn("未找到直播数据，ID:", liveId);
        return; 
    }

    currentPreviewLiveId = liveId;

    // 2. 填充弹窗数据
    document.getElementById('previewLiveAvatar').style.backgroundImage = `url('${liveData.avatar}')`;
    document.getElementById('previewLiveName').textContent = liveData.name;
    document.getElementById('previewLiveViewers').textContent = formatViewerCount(liveData.viewers);
    
    // 【新增】填充完整的标题/简介
    document.getElementById('previewLiveTitleFull').textContent = liveData.title || "无标题";

    // 填充画面描述
    document.getElementById('previewLiveDescription').textContent = liveData.description || "主播正在激情直播中，快进去看看吧！";

    // 3. 显示弹窗
    document.getElementById('livePreviewModal').classList.add('show');
}

/**
 * 关闭预览弹窗
 */
function closeLivePreviewModal() {
    document.getElementById('livePreviewModal').classList.remove('show');
}

// [修改版 V7] 进入直播间 - 支持分流生成
async function enterLiveRoom(liveId) {
    closeLivePreviewModal();

    // 1. 查找数据
    let liveData = currentLiveRecommendations.find(l => l.id === liveId);
    let isFriendRoom = false;

    // 如果推荐列表里没有，去关注列表里找
    if (!liveData) {
        liveData = (currentLiveFollowingList || []).find(l => l.id === liveId);
        if (liveData) {
            isFriendRoom = true; // 标记为好友房间
        }
    }
    
    if (!liveData) return showAlert("无法加载直播数据。");

    // --- UI 初始化 (背景/头像) ---
    const bgEl = document.getElementById('liveRoomBg');
    const avatarEl = document.getElementById('liveRoomAvatar');
    const visualList = document.getElementById('liveVisualList'); 
    const danmuContainer = document.getElementById('liveDanmuContainer');
    const viewerAvatarsContainer = document.getElementById('liveViewerAvatars');

    // 设置背景和头像
    if (liveData.avatar && liveData.avatar.length > 5) {
        bgEl.style.backgroundImage = `url('${liveData.avatar}')`;
        avatarEl.style.backgroundImage = `url('${liveData.avatar}')`;
        avatarEl.innerText = '';
    } else {
        bgEl.style.backgroundColor = '#333';
        bgEl.style.backgroundImage = 'none';
        avatarEl.style.backgroundColor = '#555';
        avatarEl.style.backgroundImage = 'none';
        avatarEl.innerText = liveData.name[0];
    }

    document.getElementById('liveRoomName').textContent = liveData.name;
    document.getElementById('liveRoomViewerCount').textContent = formatViewerCount(liveData.viewers);
    
    // 清空旧内容
    visualList.innerHTML = '';
    danmuContainer.innerHTML = '';
    viewerAvatarsContainer.innerHTML = ''; 
    
    // 模拟观众头像
    for (let i = 0; i < 3; i++) {
        const div = document.createElement('div');
        div.className = 'viewer-avatar';
        const randomUrl = passerbyAvatarUrls[Math.floor(Math.random() * passerbyAvatarUrls.length)];
        div.style.backgroundImage = `url('${randomUrl}')`;
        viewerAvatarsContainer.appendChild(div);
    }
    
    document.getElementById('liveMoreMenu').classList.remove('show');
    setActivePage('liveRoomScreen');
    document.querySelector('.phone').classList.add('status-bar-hidden');

    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }

    // --- 【核心分流逻辑】 ---
    if (liveData.savedScript && liveData.savedScript.length > 0) {
        console.log("加载存档，瞬间渲染...");
        currentLiveScript = liveData.savedScript;
        renderFullLiveScript(currentLiveScript);
        const maxTime = Math.max(...currentLiveScript.map(e => e.time));
        livePlaybackIndex = maxTime + 1;
    } else {
        // 无存档，生成新脚本
        const loadingBubble = document.createElement('div');
        loadingBubble.className = 'live-visual-bubble';
        loadingBubble.id = 'liveLoadingBubble';
        loadingBubble.textContent = isFriendRoom 
            ? `正在连接 ${liveData.name} 的直播间...\n(好友直播生成中)` 
            : "正在连接直播信号...\n(AI 正在生成实时画面)";
        visualList.appendChild(loadingBubble);

        try {
            if (isFriendRoom) {
                // 如果是好友/关注板块 -> 调用新函数
                await generateFriendLiveScript(liveData);
            } else {
                // 如果是路人/推荐板块 -> 调用旧函数
                await generateLiveStreamScript(liveData);
            }
        } catch (e) {
            if(loadingBubble) loadingBubble.textContent = "信号中断，请退出重试。";
            console.error(e);
        }
    }
}

/**
 * 辅助：格式化人数
 */
function formatViewerCount(num) {
    return num > 10000 ? (num / 10000).toFixed(1) + 'w' : num;
}

// =========================================
// START: 直播设置逻辑
// =========================================

// 打开设置主弹窗
function openLiveSettingsModal() {
    updateLiveSettingsDisplay();
    
    // --- 新增：回显时长设置 ---
    const duration = liveSettings.duration || 60;
    const durSlider = document.getElementById('liveDurationSlider');
    const durDisplay = document.getElementById('liveDurationDisplay');
    if (durSlider) {
        durSlider.value = duration;
        durDisplay.textContent = duration;
    }

    // --- 新增：回显密度设置 ---
    const densitySelect = document.getElementById('liveDanmuDensitySelect');
    if (densitySelect) {
        densitySelect.value = liveSettings.danmuDensity || 'normal';
    }

    document.getElementById('liveSettingsModal').classList.add('show');
}

// 更新设置弹窗显示
function updateLiveSettingsDisplay() {
    // 1. 推荐世界观
    const recWvDisplay = document.getElementById('currentLiveRecommendWorldview');
    if (liveSettings.recommendWorldviewId) {
        const wv = liveWorldviews.find(i => i.id === liveSettings.recommendWorldviewId);
        recWvDisplay.textContent = wv ? wv.name : '默认 (现代日常)';
    } else {
        recWvDisplay.textContent = '默认 (现代日常)';
    }

    // 2. 关注世界观
    const folWvDisplay = document.getElementById('currentLiveFollowingWorldview');
    if (liveSettings.followingWorldviewId) {
        const wv = liveWorldviews.find(i => i.id === liveSettings.followingWorldviewId);
        folWvDisplay.textContent = wv ? wv.name : '默认 (现代日常)';
    } else {
        folWvDisplay.textContent = '默认 (现代日常)';
    }

    // 3. 全局提示词
    const pDisplay = document.getElementById('currentLivePrompt');
    if (liveSettings.promptId) {
        const p = livePrompts.find(i => i.id === liveSettings.promptId);
        pDisplay.textContent = p ? p.name : '无';
    } else {
        pDisplay.textContent = '无';
    }
    
    // 4. 关注的角色
    const charDisplay = document.getElementById('currentLiveCharacters');
    const selectedCount = liveSettings.activeAiIds ? liveSettings.activeAiIds.length : 0;
    if (selectedCount > 0) {
        const names = liveSettings.activeAiIds.map(id => {
            const f = friends.find(friend => friend.id === id);
            return f ? (f.remark || f.name) : '';
        }).filter(Boolean).slice(0, 3).join('、');
        charDisplay.textContent = `已选 ${selectedCount} 人: ${names}${selectedCount > 3 ? '...' : ''}`;
    } else {
        charDisplay.textContent = "点击选择角色...";
    }
}

// 打开世界观列表 (带参数)
function openLiveWorldviewList(target) {
    currentEditingLiveWorldviewTarget = target;
    renderLiveItemList('worldview'); // 复用原本的渲染逻辑，它会读取 currentEditingLiveWorldviewTarget 来高亮
    document.getElementById('liveWorldviewListModal').classList.add('show');
}

function openEditLiveWorldviewModal(id) {
    currentEditingLiveItemId = id;
    const title = document.getElementById('editLiveWorldviewTitle');
    const nameInput = document.getElementById('liveWorldviewNameInput');
    const contentInput = document.getElementById('liveWorldviewContentInput');

    if (id) {
        const item = liveWorldviews.find(i => i.id === id);
        title.textContent = '编辑世界观';
        nameInput.value = item.name;
        contentInput.value = item.content;
    } else {
        title.textContent = '新建世界观';
        nameInput.value = '';
        contentInput.value = '';
    }
    document.getElementById('editLiveWorldviewModal').classList.add('show');
}

async function saveLiveWorldview() {
    const name = document.getElementById('liveWorldviewNameInput').value.trim();
    const content = document.getElementById('liveWorldviewContentInput').value.trim();
    if (!name || !content) return showAlert("名称和内容不能为空");

    if (currentEditingLiveItemId) {
        const index = liveWorldviews.findIndex(i => i.id === currentEditingLiveItemId);
        if (index > -1) {
            liveWorldviews[index].name = name;
            liveWorldviews[index].content = content;
        }
    } else {
        liveWorldviews.push({
            id: `live_wv_${Date.now()}`,
            name: name,
            content: content
        });
    }
    await saveData();
    document.getElementById('editLiveWorldviewModal').classList.remove('show');
    renderLiveItemList('worldview');
    updateLiveSettingsDisplay();
}

// [修改] 选择世界观
function selectLiveWorldview(id) {
    if (currentEditingLiveWorldviewTarget === 'following') {
        liveSettings.followingWorldviewId = id;
    } else {
        liveSettings.recommendWorldviewId = id;
    }
    saveData();
    updateLiveSettingsDisplay();
    document.getElementById('liveWorldviewListModal').classList.remove('show');
}

// --- 全局提示词管理 ---

function openLivePromptList() {
    renderLiveItemList('prompt');
    document.getElementById('livePromptListModal').classList.add('show');
}

function openEditLivePromptModal(id) {
    currentEditingLiveItemId = id;
    const title = document.getElementById('editLivePromptTitle');
    const nameInput = document.getElementById('livePromptNameInput');
    const contentInput = document.getElementById('livePromptContentInput');

    if (id) {
        const item = livePrompts.find(i => i.id === id);
        title.textContent = '编辑提示词';
        nameInput.value = item.name;
        contentInput.value = item.content;
    } else {
        title.textContent = '新建提示词';
        nameInput.value = '';
        contentInput.value = '';
    }
    document.getElementById('editLivePromptModal').classList.add('show');
}

async function saveLivePrompt() {
    const name = document.getElementById('livePromptNameInput').value.trim();
    const content = document.getElementById('livePromptContentInput').value.trim();
    if (!name || !content) return showAlert("名称和内容不能为空");

    if (currentEditingLiveItemId) {
        const index = livePrompts.findIndex(i => i.id === currentEditingLiveItemId);
        if (index > -1) {
            livePrompts[index].name = name;
            livePrompts[index].content = content;
        }
    } else {
        livePrompts.push({
            id: `live_pmt_${Date.now()}`,
            name: name,
            content: content
        });
    }
    await saveData();
    document.getElementById('editLivePromptModal').classList.remove('show');
    renderLiveItemList('prompt');
    updateLiveSettingsDisplay();
}

function selectLivePrompt(id) {
    liveSettings.promptId = id;
    saveData();
    updateLiveSettingsDisplay();
    document.getElementById('livePromptListModal').classList.remove('show');
}

// --- 通用渲染列表函数 ---
function renderLiveItemList(type) {
    const containerId = type === 'worldview' ? 'liveWorldviewList' : 'livePromptList';
    const list = type === 'worldview' ? liveWorldviews : livePrompts;
    const selectedId = type === 'worldview' ? liveSettings.worldviewId : liveSettings.promptId;
    const selectFn = type === 'worldview' ? 'selectLiveWorldview' : 'selectLivePrompt';
    const editFn = type === 'worldview' ? 'openEditLiveWorldviewModal' : 'openEditLivePromptModal';
    const deleteFn = 'deleteLiveItem'; // 通用删除

    const container = document.getElementById(containerId);
    container.innerHTML = '';

    // "不使用/默认" 选项
    const defaultItem = document.createElement('div');
    defaultItem.className = 'opening-statement-item'; // 复用现有样式
    defaultItem.innerHTML = `<span style="flex-grow:1;">${type === 'worldview' ? '默认 (现代日常)' : '不使用'}</span>`;
    defaultItem.onclick = () => window[selectFn](null);
    if (!selectedId) defaultItem.style.background = '#f0f0f0';
    container.appendChild(defaultItem);

    list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'opening-statement-item';
        if (item.id === selectedId) div.style.background = '#f0f0f0'; // 高亮选中
        
        div.innerHTML = `
            <span onclick="${selectFn}('${item.id}')" style="flex-grow: 1;">${item.name}</span>
            <div class="item-actions">
                <span class="edit-btn" onclick="${editFn}('${item.id}'); event.stopPropagation();">✎</span>
                <span class="delete-btn" onclick="${deleteFn}(event, '${type}', '${item.id}')">✕</span>
            </div>
        `;
        container.appendChild(div);
    });
}

async function deleteLiveItem(event, type, id) {
    event.stopPropagation();
    if (!confirm("确定删除吗？")) return;

    if (type === 'worldview') {
        liveWorldviews = liveWorldviews.filter(i => i.id !== id);
        if (liveSettings.worldviewId === id) liveSettings.worldviewId = null;
    } else {
        livePrompts = livePrompts.filter(i => i.id !== id);
        if (liveSettings.promptId === id) liveSettings.promptId = null;
    }
    
    await saveData();
    renderLiveItemList(type);
    updateLiveSettingsDisplay();
}

// =========================================
// END: 直播设置逻辑
// =========================================

// [新增] 打开角色选择
function openLiveCharacterSelect() {
    const container = document.getElementById('liveCharacterSelectList');
    container.innerHTML = '';
    
    friends.filter(f => !f.isGroup).forEach(friend => {
        const isChecked = (liveSettings.activeAiIds || []).includes(friend.id);
        const item = document.createElement('div');
        item.className = 'multi-select-item';
        item.innerHTML = `
            <input type="checkbox" id="live-char-${friend.id}" value="${friend.id}" ${isChecked ? 'checked' : ''}>
            <label for="live-char-${friend.id}">${friend.remark || friend.name}</label>
        `;
        container.appendChild(item);
    });
    
    document.getElementById('liveCharacterSelectModal').classList.add('show');
}

// [新增] 保存角色选择
function saveLiveCharacterSelect() {
    const selectedIds = [];
    document.querySelectorAll('#liveCharacterSelectList input:checked').forEach(cb => {
        selectedIds.push(cb.value);
    });
    liveSettings.activeAiIds = selectedIds;
    
    saveData();
    updateLiveSettingsDisplay();
    document.getElementById('liveCharacterSelectModal').classList.remove('show');
}

/**
 * [新增] 直播页面的统一刷新入口
 * 点击右上角刷新按钮时触发，根据当前所在的标签页（推荐/关注）执行不同的生成逻辑
 */
async function refreshLiveContent() {
    const btn = document.getElementById('liveRefreshBtn');
    
    // 防止重复点击（如果已经在旋转，就直接返回）
    if (btn && btn.classList.contains('rotate-anim')) return;

    if (currentLiveSubTab === 'recommend') {
        // 如果当前在“推荐”页，调用原来的生成函数
        await generateLiveRecommendations(true);
    } else {
        // 如果当前在“关注”页，调用新的关注生成函数
        // (generateLiveFollowing 函数在之前的回答中已经提供，也需要粘贴到脚本里)
        await generateLiveFollowing(true);
    }
}

/**
 * [全新] 生成关注列表的直播 (一次性生成所有选中角色)
 */
async function generateLiveFollowing(isForceRefresh = false) {
    const container = document.getElementById('liveListContainer');
    const refreshBtn = document.getElementById('liveRefreshBtn');

    // 1. 检查 API
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl || !settings.apiKey) {
        return showAlert("请先配置API");
    }
    
    // 2. 检查是否有选中的角色
    if (!liveSettings.activeAiIds || liveSettings.activeAiIds.length === 0) {
        container.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">还没有关注的主播<br>请点击左上角设置 -> 选择关注的角色</div>';
        return;
    }

    // 3. UI 反馈
    if (isForceRefresh) {
        if (refreshBtn) refreshBtn.classList.add('rotate-anim');
        showToast("正在连接好友直播间...");
    }
    
    // 4. 准备角色情报
    const selectedFriends = friends.filter(f => liveSettings.activeAiIds.includes(f.id));
    
    // 获取世界观信息
    let worldviewContext = "默认世界观：现代日常网络直播环境。";
    let isDefaultWorld = true;
    if (liveSettings.followingWorldviewId) {
        const wv = liveWorldviews.find(i => i.id === liveSettings.followingWorldviewId);
        if (wv) {
            worldviewContext = `【当前直播世界观】: ${wv.content}`;
            isDefaultWorld = false;
        }
    }

    // 构建每个角色的档案
    const characterProfiles = selectedFriends.map(friend => {
        const personaId = friend.activeUserPersonaId || 'default_user';
        const persona = userPersonas.find(p => p.id === personaId) || userProfile;
        
        let memoryInfo = "";
        
        // 只有在默认世界观下，才大量读取聊天记录和总结，以保证“贴合现实”
        // 在架空世界观下，主要依靠人设和世界观设定，避免OOC
        if (isDefaultWorld) {
            // 读取聊天记录
            const history = (chatHistories[friend.id] || []).slice(-10).map(m => 
                `${m.type === 'sent' ? persona.name : friend.name}: ${summarizeMessageContentForAI(m)}`
            ).join(' | ');
            
            // 读取最新的一条总结
            const memories = characterMemories[friend.id] || [];
            const lastMemory = memories.length > 0 ? memories[memories.length-1].content.substring(0, 100) : "";
            
            memoryInfo = `
            - 最近聊天氛围: ${history || '无'}
            - 你们的关系记忆: ${lastMemory || '无'}
            `;
        }

        return `
        --- 角色ID: "${friend.id}" ---
        - 姓名: "${friend.name}"
        - 人设: "${friend.role}"
        - 观看者(用户)人设: "${persona.name}" (${persona.personality || '普通人'})
        ${memoryInfo}
        ---------------------------
        `;
    }).join('\n');

    // 5. 构建 Prompt (修复版：公共直播风格)
    const prompt = `
【任务】: 你是一个直播内容生成器。你需要为列表中的 **${selectedFriends.length} 位角色** 分别生成一个正在进行的直播间状态。

${worldviewContext}

【【【创作铁律 (最高优先级)】】】
1.  **【公共直播场景】**: 
    - 角色正在面向**所有观众**直播，**并不**知道特定用户（${userProfile.name}）正在刷列表看TA。
    - **严禁**出现“看到你来了”、“欢迎你”等针对特定用户的语句。
    - **应该**描写：正在做的事、正在回应路人弹幕、正在感谢礼物、或者专注才艺/游戏。

2.  **【人设贴合】**: 
    - 必须根据角色的**性格**和**职业/兴趣**来设计直播内容。
    - 例如：学霸直播自习、吃货直播探店、傲娇直播打游戏喷队友、温柔角色直播聊天哄睡。
    - 如果是架空世界观，请让角色从事符合该世界的活动（如修仙者直播炼丹）。

3.  **【标题风格】**: 标题要有吸引力，符合抖音/B站/直播平台的调性（可使用震惊体、疑问句或唯美风）。

4.  **【画面描述 (description)】**: 
    - 30-60字。
    - 描写主播当前的**动作、神态**以及**直播间的氛围**。
    - 示例："手里拿着奶茶，正在笑着读弹幕评论。" / "全神贯注地盯着屏幕打游戏，眉头微皱。"

【角色列表】:
${characterProfiles}

【输出格式】:
必须返回一个纯净的 JSON 数组 \`[]\`，包含 ${selectedFriends.length} 个对象。
每个对象格式如下：
{
  "friendId": "角色ID (原样返回)",
  "title": "直播标题",
  "viewers": 1234,
  "description": "详细的画面描述..."
}
`;

    try {
        // 6. 发送请求
        // 获取自定义温度
        const temp = parseFloat(settings.apiTemperature) || 1.0;
        
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: parseFloat(settings.apiTemperature) || 1.0 
            })
        });

        if (!response.ok) throw new Error("API请求失败");

        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) throw new Error("JSON解析失败");
        
        const generatedList = JSON.parse(jsonMatch[0]);

        // 7. 处理数据并转换格式
        // 注意：关注列表的数据我们不存入 currentLiveRecommendations（那是推荐列表的），
        // 而是直接渲染，或者存入一个新的全局变量 currentLiveFollowingList
        currentLiveFollowingList = generatedList.map(item => {
            const friend = friends.find(f => f.id === item.friendId);
            if (!friend) return null;
            
            return {
                id: `live_friend_${friend.id}`, // 特殊ID前缀
                name: friend.remark || friend.name,
                avatar: friend.avatarImage || '', // 使用好友真实头像
                title: item.title,
                viewers: item.viewers,
                description: item.description,
                isFriend: true,
                friendId: friend.id // 记录原始ID
            };
        }).filter(Boolean);

        // --- ▼▼▼ 【核心修复】添加了这行保存代码 ▼▼▼ ---
        await saveData();
        // --- ▲▲▲ 修复结束 ▲▲▲ ---

        // 8. 渲染
        renderLiveGrid(currentLiveFollowingList);
        
        if (isForceRefresh) showToast("关注列表已更新");

    } catch (e) {
        console.error("生成关注直播失败", e);
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:#999;">
            生成失败: ${e.message}<br><span onclick="refreshLiveContent()" style="color:#ff4d4d;cursor:pointer;">点击重试</span>
        </div>`;
    } finally {
        if (refreshBtn) refreshBtn.classList.remove('rotate-anim');
    }
}

// 2. AI 生成直播剧本 (V5 - 持久化 + 全局规则 + 自定义时长)
async function generateLiveStreamScript(liveData) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) return showAlert("API未配置");

    // 1. 获取配置参数
    const duration = liveSettings.duration || 60;
    const density = liveSettings.danmuDensity || 'normal';
    
    // 2. 准备密度指令
    let danmuInstruction = "";
    if (density === 'low') {
        danmuInstruction = "弹幕较少，每秒生成 0-1 条，偶尔有空隙。";
    } else if (density === 'high') {
        danmuInstruction = "弹幕刷屏，每秒生成 3-8 条，营造极度火爆的氛围。";
    } else {
        danmuInstruction = "弹幕正常，每秒生成 1-3 条。";
    }

    // 3. 获取世界观 (优先用推荐世界观，或者根据直播间类型判断)
    // 这里我们统一使用当前推荐板块的世界观，或者如果这个直播间是关注列表里的，也可以逻辑判断
    const worldviewId = liveSettings.recommendWorldviewId;
    const worldview = liveWorldviews.find(w => w.id === worldviewId) || { content: "现代日常直播" };

    // 4. 获取全局提示词 (Global Prompt)
    let globalPromptContent = "";
    if (liveSettings.promptId) {
        const gp = livePrompts.find(p => p.id === liveSettings.promptId);
        if (gp) globalPromptContent = `\n【全局额外指令】: ${gp.content}`;
    }

    // 5. 获取全局规则 (Forum Rules) - 确保人设贴合
    let rulesContent = "";
    if (typeof forumRules !== 'undefined' && forumRules.length > 0) {
        rulesContent = `\n【必须遵守的世界/平台规则】:\n${forumRules.map(r => `- ${r.name}: ${r.description}`).join('\n')}`;
    }

    // 6. 获取主播人设 (如果是好友)
    let hostPersona = "普通主播";
    if (liveData.friendId) { // 如果是关注的好友
        const friend = friends.find(f => f.id === liveData.friendId);
        if (friend) hostPersona = `核心人设: ${friend.role}`;
    }

    const prompt = `
【任务】: 你是一个直播间全景模拟器。请为以下直播间生成 **${duration}秒** 的详细直播脚本。

【直播间信息】:
- 主播: ${liveData.name}
- 标题: ${liveData.title}
- 初始画面: ${liveData.description}
- ${hostPersona}

【【【最高优先级情报库】】】
1. **世界观背景**: ${worldview.content}
2. ${rulesContent}
${globalPromptContent}

【生成要求】:
1.  **画面描述 (visual)**: 以**第三人称**详细描写主播的动作、神态、正在做的事情、环境的变化。文字要优美、有画面感，严格符合主播人设和世界观。每隔 5-10 秒必须更新一次画面。
2.  **弹幕 (danmu)**: 模拟观众的实时反应。要有梗、有互动、有情绪。${danmuInstruction}
3.  **时间轴**: 覆盖 0 到 ${duration} 秒。

【【【直播状态铁律 (必须死板遵守)】】】
1. **永远在进行中**：这只是几小时直播中的**中间一小段**。**绝对禁止**出现任何“今天的直播就到这里”、“下了”、“拜拜”、“感谢观看”等结束语。
2. **切片感**：脚本的最后一条必须是**动作正在进行中**的状态（例如：“拿起水杯喝了一口”、“正在调整设备”），不能是总结性的陈词。
3. **拒绝谢幕**：不要写总结今天的直播内容，不要预告明天播什么，就专注当下的每一秒。

【输出格式铁律】:
必须返回一个纯净的 JSON 数组。数组中每个对象代表一个“事件”。
格式: 
[
  { "time": 0, "type": "visual", "content": "主播微笑着调整了一下摄像头，拿起手边的吉他..." },
  { "time": 1, "type": "danmu", "user": "路人甲", "content": "前排！" },
  { "time": 2, "type": "danmu", "user": "爱吃鱼", "content": "终于开播啦！" },
  ...
]
`;

    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: settings.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: parseFloat(settings.apiTemperature) || 0.8
        })
    });

    const data = await response.json();
    const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error("JSON解析失败");
    
    // 解析脚本
    const script = JSON.parse(jsonMatch[0]);
    currentLiveScript = script;
    
    // 按时间排序
    currentLiveScript.sort((a, b) => a.time - b.time);

    // 【核心修改】：将生成的脚本保存到直播间对象中，实现持久化
    liveData.savedScript = currentLiveScript; // 存入内存
    await saveData(); // 存入数据库

    // 开始播放
    startLivePlayback(duration);
}

/**
 * [V5 稳健版] 播放引擎：修复速度异常
 * @param {number} endTime - 播放结束的时间点
 * @param {number} startTime - 播放开始的时间点
 */
function startLivePlayback(endTime, startTime = 0) {
    if (!currentLiveScript) return;
    
    // 1. 再次强制清理旧定时器 (双重保险)
    if (liveRoomInterval) clearInterval(liveRoomInterval);

    livePlaybackIndex = startTime;
    
    const visualList = document.getElementById('liveVisualList');
    const danmuContainer = document.getElementById('liveDanmuContainer');
    const loadingBubble = document.getElementById('liveLoadingBubble');
    if (loadingBubble) loadingBubble.remove();

    // 2. 【核心】确保速度变量有效，如果未定义则强制为 1.0
    // 防止因为变量丢失导致 setInterval(..., NaN) 变成极速
    let speed = (typeof currentLiveSpeed !== 'undefined' && currentLiveSpeed > 0) ? currentLiveSpeed : 1.0;
    
    // 计算间隔 (1.0倍速 = 1000ms)
    const intervalMs = 1000 / speed;

    console.log(`[直播] 启动播放: ${startTime}s -> ${endTime}s | 速度: ${speed}x | 间隔: ${intervalMs}ms`);

    liveRoomInterval = setInterval(() => {
        // 筛选当前秒的事件
        const events = currentLiveScript.filter(e => Math.floor(e.time) === livePlaybackIndex);

        events.forEach(e => {
            if (e.type === 'visual') {
                const visualItem = document.createElement('div');
                visualItem.className = 'live-visual-bubble';
                visualItem.textContent = e.content;
                visualList.appendChild(visualItem);
                
                // 优化滚动体验：只在有新画面时平滑滚动
                visualItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                if (visualList.children.length > 20) visualList.removeChild(visualList.firstChild);

            } else if (e.type === 'danmu') {
                const danmuItem = document.createElement('div');
                danmuItem.className = 'live-danmu-item';
                const nameColor = ['#aaddff', '#ffccdd', '#fff3cd', '#ccffcc', '#e0e0e0'][Math.floor(Math.random()*5)];
                
                // 【核心修复】：智能兼容各种 AI 可能生成的键名
                const userName = e.user || e.name || e.author || e.userName || "热心水友";
                
                danmuItem.innerHTML = `<span class="danmu-user" style="color:${nameColor}">${userName}：</span><span class="danmu-content">${e.content}</span>`;
                
                danmuContainer.appendChild(danmuItem);
                danmuContainer.scrollTop = danmuContainer.scrollHeight;
                
                if (danmuContainer.children.length > 50) danmuContainer.removeChild(danmuContainer.firstChild);
            }
        });

        livePlaybackIndex++;
        
        if (livePlaybackIndex > endTime) {
            clearInterval(liveRoomInterval);
            console.log("[直播] 播放结束");
        }

    }, intervalMs);
}

// 4. 退出直播间
function quitLiveRoom() {
    // 停止播放
    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }
    currentLiveScript = null;

    // --- 【新增】：强制清除连麦状态与 UI ---
    isLiveMicActive = false;
    const micWindow = document.getElementById('liveMicWindow');
    if (micWindow) {
        micWindow.classList.remove('show');
    }
    // 确保连麦输入框也关掉
    const micInputModal = document.getElementById('liveMicInputModal');
    if (micInputModal) {
        micInputModal.classList.remove('show');
    }
    // ----------------------------------------

    // 返回直播列表页
    setActivePage('liveApp');
    // 恢复状态栏 (如果全局设置是开启的)
    applyStatusBarVisibility(); 
}

async function saveLiveSettings() {
    // --- 新增：保存时长和密度 ---
    const durationInput = document.getElementById('liveDurationSlider');
    const densityInput = document.getElementById('liveDanmuDensitySelect');
    
    if (durationInput) {
        liveSettings.duration = parseInt(durationInput.value, 10);
    }
    if (densityInput) {
        liveSettings.danmuDensity = densityInput.value;
    }

    // 保存选中的AI (保持不变)
    // 注意：这里不需要再处理 activeAiIds，因为它是在 saveLiveCharacterSelect 里处理的
    // 但为了保险，保持现有逻辑结构
    
    await saveData(); // 保存数据
    closeLiveSettingsModal(); // 关闭弹窗
    showAlert('直播设置已保存！\n下一次进入直播间时生效。');
}

/**
 * 关闭直播设置弹窗
 */
function closeLiveSettingsModal() {
    document.getElementById('liveSettingsModal').classList.remove('show');
}

/**
 * [新增] 直接渲染整个直播脚本到界面（不播放动画，直接看结果）
 */
function renderFullLiveScript(script) {
    const visualList = document.getElementById('liveVisualList');
    const danmuContainer = document.getElementById('liveDanmuContainer');
    
    visualList.innerHTML = '';
    danmuContainer.innerHTML = '';

    script.forEach(e => {
        if (e.type === 'visual') {
            const visualItem = document.createElement('div');
            visualItem.className = 'live-visual-bubble';
            visualItem.textContent = e.content;
            visualList.appendChild(visualItem);
        } else if (e.type === 'danmu') {
            const danmuItem = document.createElement('div');
            danmuItem.className = 'live-danmu-item';
            const nameColor = ['#aaddff', '#ffccdd', '#fff3cd', '#ccffcc', '#e0e0e0'][Math.floor(Math.random()*5)];
            const userName = e.user || e.name || e.author || e.userName || "热心水友";
            danmuItem.innerHTML = `<span class="danmu-user" style="color:${nameColor}">${userName}：</span><span class="danmu-content">${e.content}</span>`;
            danmuContainer.appendChild(danmuItem);
        }
    });

    // 滚动到底部
    setTimeout(() => {
        visualList.scrollTop = visualList.scrollHeight;
        danmuContainer.scrollTop = danmuContainer.scrollHeight;
        // 更新播放索引为最大时间，以便后续续写
        livePlaybackIndex = Math.max(...script.map(i => i.time)) + 1;
    }, 100);
}

// 切换菜单显示
function toggleLiveMoreMenu() {
    const menu = document.getElementById('liveMoreMenu');
    menu.classList.toggle('show');
}

/**
 * [功能1] 重播：清空界面，从头开始播放
 */
function replayLiveStream() {
    toggleLiveMoreMenu(); // 关菜单
    if (!currentLiveScript || currentLiveScript.length === 0) return;

    // 清空界面
    document.getElementById('liveVisualList').innerHTML = '';
    document.getElementById('liveDanmuContainer').innerHTML = '';
    
    // 获取最大时长
    const maxTime = Math.max(...currentLiveScript.map(e => e.time));
    
    // 调用原有的播放逻辑
    startLivePlayback(maxTime + 1);
    showToast("开始重播");
}

/**
 * [V5 完整记忆版 + Toast加载] 续写直播
 * 特性：好友模式下，完整读取聊天记录、人设、用户画像，确保续写内容与生成时一样贴合。
 * 修改：使用底部 Toast 提示加载，报错弹窗显示详情。
 */
async function continueLiveStream() {
    toggleLiveMoreMenu(); // 关闭菜单
    
    // 停止当前的播放定时器
    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }
    
    // 1. 基础数据校验
    const liveId = currentPreviewLiveId; 
    let liveData = currentLiveRecommendations.find(l => l.id === liveId);
    let isFriendRoom = false;

    // 尝试在关注列表找
    if (!liveData) {
        liveData = (currentLiveFollowingList || []).find(l => l.id === liveId);
        if (liveData) isFriendRoom = true;
    }
    
    if (!liveData) return showAlert("数据丢失，无法续写");

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiKey) return showAlert("API未配置");

    // --- 【修改点】使用 Toast 提示加载，设置 60秒时长确保它一直显示 ---
    showToast("正在接收后续直播信号，请稍候...", 999999);
    try {
        // ============================================
        // 2. 智能构建上下文 (分流逻辑)
        // ============================================

        let worldviewContent = "";
        let characterContext = ""; // 存放角色、用户、聊天记录等核心情报

        if (isFriendRoom) {
            // --- A. 好友模式：全量读取记忆 ---
            const friend = friends.find(f => f.id === liveData.friendId);
            if (friend) {
                // A1. 获取用户人设
                const personaId = friend.activeUserPersonaId || 'default_user';
                const persona = userPersonas.find(p => p.id === personaId) || userProfile;

                // A2. 获取关注世界观
                const wvId = liveSettings.followingWorldviewId;
                const wv = liveWorldviews.find(w => w.id === wvId) || { content: "现代日常直播" };
                worldviewContent = wv.content;

                // A3. 判断是否读取聊天记录 (默认世界观才读)
                const isDefaultWorld = (!wvId || wvId === 'default' || wv.name.includes("默认") || wv.name.includes("日常"));
                
                let chatHistoryContext = "";
                if (isDefaultWorld) {
                    // 读取最近 50 条聊天记录
                    const history = (chatHistories[friend.id] || []).slice(-50).map(m => 
                        `${m.type === 'sent' ? persona.name : friend.name}: ${summarizeMessageContentForAI(m)}`
                    ).join('\n');

                    chatHistoryContext = `
                    【【【人际关系与记忆 (最高优先级)】】】
                    - **场景定义**: 这是现实生活的延伸。你和观众里的特定用户 "${persona.name}" 是熟人/好友/恋人关系。
                    - **最近聊天记忆**:
                    ${history || "（近期无私聊，关系正常）"}
                    - **指令**: 在直播中，你的某些话语或状态可以隐晦地映射最近的聊天内容，让用户感到亲切。`;
                } else {
                    chatHistoryContext = `
                    【【【架空世界观隔离铁律 (最高优先级)】】】
                    - **严禁**提及任何现代现实世界的聊天记录或设定。
                    - 你必须全身心投入角色在这个架空世界里的身份。`;
                }

                // A4. 组装好友专属情报
                characterContext = `
    【【【主播深度档案】】】
    - 真实身份: "${friend.name}"
    - 核心人设: "${friend.role}"
    - 关键观众(用户): "${persona.name}" (人设: ${persona.personality})
    ${chatHistoryContext}

    【【【续写人设铁律 (CRITICAL)】】】
    接下来的表演必须继续保持这个人设的说话语气、口癖和行为逻辑。严禁OOC。
    `;
            }
        } else {
            // --- B. 路人模式：简单设定 ---
            const wvId = liveSettings.recommendWorldviewId;
            const wv = liveWorldviews.find(w => w.id === wvId) || { content: "现代日常直播" };
            worldviewContent = wv.content;
            
            characterContext = `【主播设定】: 普通路人主播 "${liveData.name}"，保持当前风格即可。`;
        }

        // ============================================
        // 3. 通用参数与历史记录
        // ============================================

        // 全局提示词 & 规则
        let globalExtras = "";
        if (liveSettings.promptId) {
            const gp = livePrompts.find(p => p.id === liveSettings.promptId);
            if (gp) globalExtras += `\n【全局额外指令】: ${gp.content}`;
        }
        if (typeof forumRules !== 'undefined' && forumRules.length > 0) {
            globalExtras += `\n【平台规则】:\n${forumRules.map(r => `- ${r.name}: ${r.description}`).join('\n')}`;
        }

        const durationToGen = liveSettings.duration || 60;
        const density = liveSettings.danmuDensity || 'normal';
        
        let danmuInstruction = "弹幕正常，每秒生成 1-3 条。";
        if (density === 'low') danmuInstruction = "弹幕较少，每秒生成 0-1 条。";
        else if (density === 'high') danmuInstruction = "弹幕刷屏，每秒生成 3-8 条。";

        // 提取直播历史记录 (最近300条，作为上下文)
        const lastTime = Math.max(...currentLiveScript.map(e => e.time));
        const contextText = currentLiveScript.slice(-300).map(e => {
            if (e.type === 'visual') return `[${e.time}秒] [画面]: ${e.content}`;
            return `[${e.time}秒] [弹幕] ${e.user}: ${e.content}`;
        }).join('\n');

        // ============================================
        // 4. 构建 Prompt
        // ============================================

        const prompt = `
    【任务】: 继续生成直播间脚本。

    【直播间信息】
    - 标题: "${liveData.title}"
    - 初始画面: "${liveData.description}"

    【当前世界观】: ${worldviewContent}
    ${globalExtras}

    ${characterContext}

    【完整直播历史 (上下文参考)】
    ${contextText}

    【本次生成要求】
    1.  **时间轴接续**: 上一段内容结束于第 **${lastTime}** 秒。请从第 **${lastTime + 1}** 秒开始，生成接下来的 **${durationToGen}** 秒内容。
    2.  **剧情连贯**: 必须紧接上一条[画面]的动作继续发展。如果上一条还在说话，这一条就继续说完。
    3.  **弹幕氛围**: ${danmuInstruction}
    4.  **【核心】**: 保持人设一致性，如果是好友，请继续保持那种熟络/亲密的微妙氛围。

    【【【禁止虚构用户互动 (最高优先级)】】】
    1.  **基于事实**：请仔细检查【完整直播历史】。如果历史记录的最后几秒里，用户（${isFriendRoom ? '用户' : '用户'}）**没有**发送弹幕，你就**绝对禁止**让主播对用户做出反应。
    2.  **严禁脑补**：不要描写“主播好像看到了你”、“对着你笑”。如果用户没说话，主播就当用户不存在，继续播自己的，或者回应NPC路人。

    【【【身份隔离铁律】】】
    **严禁**生成 "用户"、"我" 或 "你" 发送的弹幕。只生成其他 NPC 观众的弹幕。

    【【【真实网感 ID 指令】】】
    **严禁使用** “路人甲”、“观众A”。请根据上下文生成不重复的、有趣的真实风格网名。

    【输出格式铁律】
    返回纯净的 JSON 数组。\`time\` 字段必须基于 ${lastTime} 继续递增。

    【JSON示例】
    [
      { "time": ${lastTime + 1}, "type": "visual", "content": "..." },
      { "time": ${lastTime + 2}, "type": "danmu", "user": "路人A", "content": "..." }
    ]
    `;

        // ============================================
        // 5. 发送请求
        // ============================================
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: parseFloat(settings.apiTemperature) || 1.0
            })
        });

        if (!response.ok) {
             const errText = await response.text();
             throw new Error(`API请求失败 (Status ${response.status}): ${errText}`);
        }
        
        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
        
        if (jsonMatch) {
            const newScript = JSON.parse(jsonMatch[0]);
            
            // 合并数据
            currentLiveScript = [...currentLiveScript, ...newScript];
            liveData.savedScript = currentLiveScript;
            await saveData();

            // 播放新片段
            const newEndTime = Math.max(...newScript.map(e => e.time));
            startLivePlayback(newEndTime, lastTime + 1);
            
            // 这里的 Toast 会覆盖掉前面的“正在接收...”
            showToast(`成功续写 ${newScript.length} 条事件！`);
        } else {
            throw new Error("AI未返回有效的JSON格式，请重试。");
        }

    } catch (e) {
        console.error("重新生成失败:", e);
        
        // ★★★ 确保这里有移除提示的代码 ★★★
        const toast = document.getElementById('toast-notification');
        if(toast) {
            toast.classList.remove('show'); // 立即隐藏加载提示
            toast.style.opacity = '0';      // 确保视觉上也消失
        }
        
        // 然后再弹报错窗
        showAlert(`重试失败！\n\n【错误详情】:\n${e.message}`);
    } 
    // ★★★ 建议加上 finally 块作为双重保险 ★★★
    finally {
        // 如果成功了，上面的逻辑会弹出"成功续写"的新Toast覆盖掉旧的，所以这里只需确保没卡住
        const btn = document.getElementById('liveMoreMenu'); // 或者是你的操作按钮
        // 清理其他状态...
    }
}

/**
 * [V4 修改版] 重新生成：回滚 -> 续写播放 (Toast提示 + 报错弹窗)
 */
async function regenerateLiveStream() {
    toggleLiveMoreMenu();

    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }

    if (!confirm("确定要删除上一段生成的内容并重试吗？")) return;

    const friendId = currentPreviewLiveId;
    let liveData = currentLiveRecommendations.find(l => l.id === friendId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === friendId);
    
    if (!liveData || !currentLiveScript) return;

    let isFriendRoom = false;
    if (liveData.isFriend || (liveData.friendId && friends.some(f => f.id === liveData.friendId))) {
        isFriendRoom = true;
    }

    // 1. 计算回滚点
    const durationPerBatch = liveSettings.duration || 60;
    const maxTime = Math.max(...currentLiveScript.map(e => e.time));
    const cutOffTime = maxTime - durationPerBatch;

    // --- 【修改点】使用 Toast 提示加载 ---
    showToast("正在重新生成，请稍候...", 60000);

    try {
        // 如果数据太少，就全部清空重来
        if (cutOffTime <= 0) {
            currentLiveScript = [];
            document.getElementById('liveVisualList').innerHTML = '';
            document.getElementById('liveDanmuContainer').innerHTML = '';
            
            // 分流调用完全重新生成
            if (isFriendRoom) {
                // 注意：这些生成函数内部一般不处理 loading 的显隐，
                // 如果它们报错，会抛出异常被下面的 catch 捕获
                await generateFriendLiveScript(liveData); 
            } else {
                await generateLiveStreamScript(liveData); 
            }
            
            // 如果成功执行到这里，说明生成完成。
            // 此时之前的 "正在重新生成..." Toast 可能还在显示。
            // 我们可以手动移除它，或者让 generate... 函数内部的 success toast 覆盖它。
            // 为了保险，这里可以移除：
            const t = document.getElementById('toast-notification');
            if(t) t.classList.remove('show');
            return;
        }

        // 2. 截断数据 (回滚模式)
        currentLiveScript = currentLiveScript.filter(e => e.time <= cutOffTime);
        liveData.savedScript = currentLiveScript;
        await saveData();

        // 3. 瞬间渲染剩下的旧数据
        renderFullLiveScript(currentLiveScript);

        // 4. 调用续写
        // continueLiveStream 内部会重新设置自己的 loading toast 和 error handling
        // 这里的 await 是为了保证顺序
        await continueLiveStream();

    } catch (e) {
        console.error("重新生成失败:", e);
        // --- 失败处理 ---
        const toast = document.getElementById('toast-notification');
        if(toast) toast.classList.remove('show');
        
        showAlert(`重试失败！\n\n【错误详情】:\n${e.message}`);
    }
}

// --- 直播画面设置相关函数 ---

function openLiveVisualSettings() {
    toggleLiveMoreMenu(); // 关闭底部菜单
    
    // 回显当前速度
    const slider = document.getElementById('liveSpeedSlider');
    const display = document.getElementById('liveSpeedDisplay');
    
    slider.value = currentLiveSpeed;
    display.textContent = currentLiveSpeed + 'x';
    
    document.getElementById('liveVisualSettingsModal').classList.add('show');
}

function closeLiveVisualSettings() {
    document.getElementById('liveVisualSettingsModal').classList.remove('show');
}

function updateLiveSpeedPreview(val) {
    document.getElementById('liveSpeedDisplay').textContent = val + 'x';
}

function saveLiveVisualSettings() {
    const newSpeed = parseFloat(document.getElementById('liveSpeedSlider').value);
    
    if (newSpeed !== currentLiveSpeed) {
        currentLiveSpeed = newSpeed;
        
        // 如果当前正在播放，需要重启定时器以应用新速度
        if (liveRoomInterval && currentLiveScript) {
            // 获取当前脚本的最大时间作为结束时间
            const maxTime = Math.max(...currentLiveScript.map(e => e.time));
            
            // 重新调用播放函数，它会清除旧定时器并用新速度启动
            // 注意：从当前的 livePlaybackIndex 继续播放
            startLivePlayback(maxTime + 1, livePlaybackIndex);
        }
        
        showToast(`倍速已调整为 ${currentLiveSpeed}x`);
    }
    
    closeLiveVisualSettings();
}

/**
 * [全新] 关注板块专用：好友角色直播生成函数
 * 特性：完美贴合人设、读取用户人设、智能判断是否读取聊天记录
 */
async function generateFriendLiveScript(liveData) {
    const friend = friends.find(f => f.id === liveData.friendId);
    if (!friend) return showAlert("好友数据丢失，无法生成。");

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) return showAlert("API未配置");

    // ================= 1. 读取基础配置 =================
    const duration = liveSettings.duration || 60;
    const density = liveSettings.danmuDensity || 'normal';
    
    // 弹幕密度指令
    let danmuInstruction = "弹幕正常，每秒生成 1-3 条。";
    if (density === 'low') danmuInstruction = "弹幕较少，每秒生成 0-1 条。";
    else if (density === 'high') danmuInstruction = "弹幕刷屏，每秒生成 3-8 条，氛围火爆。";

    // 全局提示词与规则
    let globalExtras = "";
    if (liveSettings.promptId) {
        const gp = livePrompts.find(p => p.id === liveSettings.promptId);
        if (gp) globalExtras += `\n【全局额外指令】: ${gp.content}`;
    }
    if (typeof forumRules !== 'undefined' && forumRules.length > 0) {
        globalExtras += `\n【平台规则】:\n${forumRules.map(r => `- ${r.name}: ${r.description}`).join('\n')}`;
    }

    // ================= 2. 准备人设与关系 =================
    const personaId = friend.activeUserPersonaId || 'default_user';
    const persona = userPersonas.find(p => p.id === personaId) || userProfile;

    // ================= 3. 世界观与记忆逻辑 (核心需求) =================
    
    // 获取关注板块选定的世界观
    const worldviewId = liveSettings.followingWorldviewId;
    // 如果没选，或者选的是默认ID，则视为默认世界观
    const worldview = liveWorldviews.find(w => w.id === worldviewId) || { id: 'default', name: '默认 (现代日常)', content: "现代日常直播环境" };
    
    // 判断逻辑
    const isDefaultWorld = (!worldviewId || worldviewId === 'default' || worldview.name.includes("默认") || worldview.name.includes("日常"));

    let memoryContext = "";
    let worldInstruction = "";

    if (isDefaultWorld) {
        // --- 情况 A: 默认世界观 ---
        // 读取最近 50 条聊天记录
        const history = (chatHistories[friend.id] || []).slice(-50).map(m => 
            `${m.type === 'sent' ? persona.name : friend.name}: ${summarizeMessageContentForAI(m)}`
        ).join('\n');

        worldInstruction = `【当前世界观】: ${worldview.content} (贴近现实)`;
        memoryContext = `
【【【人际关系与记忆 (最高优先级)】】】
- **场景定义**: 这是现实生活的延伸。你和观众里的特定用户 "${persona.name}" 是熟人/好友/恋人关系。
- **最近聊天记忆**:
${history || "（近期无私聊，关系正常）"}
- **指令**: 在直播中，你的某些话语或状态可以隐晦地映射最近的聊天内容（例如私聊说饿了，直播就在吃东西），这会让用户感到亲切。
`;
    } else {
        // --- 情况 B: 架空世界观 ---
        // 不读取聊天记录，防止OOC
        worldInstruction = `【当前世界观】: **${worldview.name}**\n设定描述: ${worldview.content}`;
        memoryContext = `
【【【架空世界观隔离铁律 (最高优先级)】】】
- **严禁**提及任何现代现实世界的聊天记录或设定。
- 你必须全身心投入角色在这个特殊世界观里的身份（例如：如果是修仙世界，你就是修仙者，不认识什么手机微信）。
- 你与用户 "${persona.name}" 的关系应基于这个架空世界的设定重新构建（例如：师徒、盟友、敌对）。
`;
    }

    // ================= 4. 构建 Prompt =================
    const prompt = `
【任务】: 你是角色 "${friend.name}"。请生成一段 **${duration}秒** 的直播脚本。

【主播档案】
- 姓名: ${friend.name}
- **核心人设**: ${friend.role}
- 正在观看的关键用户: "${persona.name}" (人设: ${persona.personality})

${worldInstruction}
${memoryContext}
${globalExtras}

【生成要求】
1.  **完全贴合人设**: 直播风格、说话语气、做的事情必须严格符合 "${friend.role}"。
2.  **画面描述 (visual)**: 以**第三人称**描写主播的动作神态语言。要细腻、有代入感。每隔 5-10 秒更新一次画面。
3.  **弹幕 (danmu)**: 
    - ${danmuInstruction}
    

【【【禁止虚构用户互动 (Anti-Hallucination)】】】
1.  **严禁虚空互动**：用户当前**没有**发送任何弹幕！
2.  **绝对禁止**描写针对用户的反应，除非你生成了NPC弹幕并让主播回应那个NPC。
3.  **专注直播内容**：主播应该专注在自己正在做的事情上，或者回应**你自己生成的NPC路人弹幕**。

【【【直播分寸感 (Live Etiquette)】】】
1.  **公开场合**：这是面向全网的直播，不是私密视频通话！
2.  **拒绝私密话题**：严禁说出只有你们两个人知道的秘密、过于露骨的情话或不适合公开说的隐私。
3.  **言行得体**：保持主播的职业素养（或人设素养），不要像发疯一样什么都说。

【【【身份隔离铁律 (绝对禁止)】】】
你**严禁生成**发送者为 "${persona.name}"、"我"、"用户" 或 "你" 的弹幕。用户的发言权在用户自己手里，AI不得代劳。

【【【真实网感 ID 指令】】】
**严禁使用** “路人甲”、“观众A”、“网友1” 这种虚假代号！
**必须生成** 具有真实网感的ID，例如：
- 风格多样：momo、AAA建材王哥、纯爱战士、xx不吃香菜、一只大居居、用户738291、小狗骑士、每天都在发疯。
- 必须符合当前世界观背景。

【【【直播状态铁律】】】
1. **进行时态**: 这是直播的中间片段，不要写开场白或结束语。
2. **切片感**: 脚本最后一条必须是动作正在进行中。

【输出格式铁律】:
必须返回一个纯净的 JSON 数组。
格式: 
[
  { "time": 0, "type": "visual", "content": "..." },
  { "time": 1, "type": "danmu", "user": "路人A", "content": "..." },
  { "time": 3, "type": "danmu", "user": "${persona.name}", "content": "..." },
  ...
]
`;

    // ================= 5. API 请求 =================
    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: parseFloat(settings.apiTemperature) || 0.9
            })
        });

        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) throw new Error("JSON解析失败");
        
        const script = JSON.parse(jsonMatch[0]);
        currentLiveScript = script;
        currentLiveScript.sort((a, b) => a.time - b.time);

        // 持久化
        liveData.savedScript = currentLiveScript; 
        await saveData(); 

        // 开始播放
        startLivePlayback(duration);

    } catch (e) {
        console.error("好友直播生成失败", e);
        const visualList = document.getElementById('liveVisualList');
        if(visualList) visualList.innerHTML = `<div class="live-visual-bubble">连接断开... ${e.message}</div>`;
    }
}

// --- 直播App 个人资料编辑功能 ---

// 1. 处理头像上传 (优化版：立即刷新)
async function handleLiveAvatarUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    try {
        // 压缩图片
        const compressedDataUrl = await compressImage(file, { quality: 0.8, maxWidth: 300 });
        
        // 1. 先更新内存中的变量
        liveUserProfile.avatarImage = compressedDataUrl;
        
        // 2. 【核心修改】立即刷新界面！不要等保存！
        // 这样用户就能马上看到头像变了
        updateLiveProfile();
        
        // 3. 提示用户
        showToast('直播头像已更新');
        
        // 4. 最后在后台默默保存到数据库 (不阻塞界面)
        await saveData();
        
    } catch (error) {
        console.error("头像处理失败:", error);
        showAlert("头像上传失败，请重试。");
    }
    
    // 清空 input 允许重复上传同一张
    event.target.value = '';
}

// 2. 编辑昵称
function editLiveName() {
    // 使用现有的通用输入弹窗
    openNameInputModal("修改直播昵称", async (newName) => {
        if (!newName || !newName.trim()) return;
        
        liveUserProfile.name = newName.trim();
        await saveData();
        updateLiveProfile();
        showToast("昵称已更新");
    });
}

// 3. 编辑ID
function editLiveId() {
    openNameInputModal("修改直播ID (数字/字母)", async (newId) => {
        if (!newId || !newId.trim()) return;
        
        liveUserProfile.id = newId.trim();
        await saveData();
        updateLiveProfile();
        showToast("ID已更新");
    });
}

/**
 * [新增] 用户发送直播弹幕
 */
async function sendLiveDanmu() {
    const input = document.getElementById('liveUserDanmuInput');
    const content = input.value.trim();
    if (!content) return;

    // 1. 获取当前直播间信息
    const liveId = currentPreviewLiveId; // 当前直播ID
    // 尝试从推荐或关注列表找到数据
    let liveData = currentLiveRecommendations.find(l => l.id === liveId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === liveId);
    
    if (!liveData) return showToast("直播间数据异常");

    // 2. 立即上屏 (用户体验优化)
    const danmuContainer = document.getElementById('liveDanmuContainer');
    const danmuItem = document.createElement('div');
    danmuItem.className = 'live-danmu-item';
    // 用户弹幕显示为金色/特殊颜色，名字使用直播APP里的网名
    const userName = liveUserProfile.name || "我";
    
    danmuItem.innerHTML = `<span class="danmu-user" style="color:#FFD700; font-weight:bold;">${userName}：</span><span class="danmu-content" style="color:#fff;">${content}</span>`;
    
    danmuContainer.appendChild(danmuItem);
    danmuContainer.scrollTop = danmuContainer.scrollHeight;
    
    // 清空输入框
    input.value = '';

    // 3. 将用户发言记录到当前脚本历史中 (供后续AI参考)
    // 使用当前播放时间
    const currentTime = Math.floor(livePlaybackIndex) || 0;
    if (currentLiveScript) {
        currentLiveScript.push({
            time: currentTime,
            type: 'danmu',
            user: userName,
            content: content,
            isUser: true // 标记这是用户发的
        });
    }

    // 4. 触发 AI 反应 (核心逻辑)
    await triggerLiveInteraction(liveData, content, currentTime);
}

/**
 * [V7 - 终极修复版] 触发直播间互动
 * 修复：强制重排时间轴，解决AI生成的时间戳堆积导致播放过快的问题
 */
async function triggerLiveInteraction(liveData, userContent, currentTime) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl || !settings.apiKey) {
        return showAlert("请先配置API信息");
    }

    // 防止重复点击的锁
    if (document.getElementById('interaction-loading-toast')) return;

    // --- 1. 获取参数 ---
    const customTemp = parseFloat(settings.apiTemperature) || 0.9;
    // 随机时长 (40-90秒)
    const randomDuration = Math.floor(Math.random() * (90 - 40 + 1)) + 40;

    // --- 2. 停止当前播放 ---
    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }
    
    // --- 3. UI 反馈 (底部Toast) ---
    const loadingToast = document.createElement('div');
    loadingToast.id = 'interaction-loading-toast';
    loadingToast.style.cssText = 'position:fixed; bottom:120px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:12px 24px; border-radius:30px; z-index:9999; display:flex; align-items:center; gap:10px; font-size:14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); pointer-events: none; backdrop-filter: blur(5px);';
    loadingToast.innerHTML = '<i class="ri-loader-4-line fa-spin" style="font-size: 18px;"></i> <span>主播正在反应中...</span>';
    document.body.appendChild(loadingToast);

    try {
        // ==========================================
        // 4. 上下文构建
        // ==========================================
        
        const isFriendRoom = !!liveData.friendId;
        const worldviewId = isFriendRoom 
            ? (liveSettings.followingWorldviewId || 'default')
            : (liveSettings.recommendWorldviewId || 'default');

        const worldview = liveWorldviews.find(w => w.id === worldviewId) || { content: "现代日常直播环境" };
        const worldviewContext = `【当前直播世界观】: ${worldview.content}`;

        let globalPromptContent = "";
        if (liveSettings.promptId) {
            const gp = livePrompts.find(p => p.id === liveSettings.promptId);
            if (gp) globalPromptContent = `【全局额外指令】: ${gp.content}`;
        }
        
        let rulesContext = ""; 
        if (typeof forumRules !== 'undefined' && forumRules.length > 0) {
            rulesContext = `【平台规则】:\n${forumRules.map(r => `- ${r.name}: ${r.description}`).join('\n')}`;
        }

        // ==========================================
        // 5. 人际关系与记忆
        // ==========================================
        
        let relationContext = "";
        let chatHistoryContext = "";
        let reactionProbability = 20; 

        if (isFriendRoom) {
            const friend = friends.find(f => f.id === liveData.friendId);
            if (friend) {
                const personaId = friend.activeUserPersonaId || 'default_user';
                const persona = userPersonas.find(p => p.id === personaId) || userProfile;
                
                reactionProbability = 90;
                const isDefaultWorld = (!worldviewId || worldviewId === 'default' || worldview.name.includes("默认") || worldview.name.includes("日常"));

                if (isDefaultWorld) {
                    const history = (chatHistories[friend.id] || []).slice(-30).map(m => 
                        `${m.type === 'sent' ? persona.name : friend.name}: ${summarizeMessageContentForAI(m)}`
                    ).join(' | ');

                    chatHistoryContext = `
                    【【【私聊记忆植入 (最高优先级)】】】
                    - **关系**: 你们是熟人/好友/恋人。
                    - **最近私聊话题**: ${history || "暂无近期私聊"}
                    - **指令**: 主播的反应必须结合这些私聊记忆。如果用户弹幕提到了私聊梗，主播必须秒懂并回应。
                    `;
                } else {
                    chatHistoryContext = `
                    【【【架空世界观隔离】】】
                    虽然发送弹幕的是你的朋友，但由于当前处于【${worldview.name}】架空世界，请不要提及现实世界的私聊内容。
                    `;
                }

                relationContext = `
                【主播身份】: "${friend.name}" (人设: ${friend.role})
                【弹幕发送者】: "${liveUserProfile.name}" (真实身份: 你的好友 "${persona.name}")
                ${chatHistoryContext}
                `;
            }
        } else {
            relationContext = `
            【主播身份】: 路人主播 "${liveData.name}"。
            【弹幕发送者】: "${liveUserProfile.name}" (一名普通观众)。
            `;
        }

        // ==========================================
        // 6. 读取直播历史
        // ==========================================
        const historyScript = (currentLiveScript || []).filter(e => e.time <= currentTime).slice(-100);
        const liveStreamContext = historyScript.map(e => {
            if (e.type === 'visual') return `[画面]: ${e.content}`;
            return `[弹幕] ${e.user}: ${e.content}`;
        }).join('\n');
        
        // ==========================================
        // 7. 构建 Prompt
        // ==========================================
        const prompt = `
【任务】: 你正在进行一场直播。刚刚有一位观众发送了一条**关键弹幕**，你需要基于【世界观】、【记忆】和【之前的直播流】，生成接下来的 **${randomDuration}秒** 直播脚本。

${worldviewContext}
${globalPromptContent}
${rulesContext}

${relationContext}

【【【直播间前情提要 (上下文)】】】
${liveStreamContext || "(直播刚开始)"}

【【【触发事件】】】
**观众 "${liveUserProfile.name}" 发送弹幕说**: "${userContent}"

【生成要求】
1.  **主播反应 (Visual)**: 
    -   概率：${reactionProbability}% 回应。
    -   如果回应：请描写主播看到弹幕后的神态、动作和说的话。
    -   如果不回应：描写主播继续做自己的事，或者被其他海量弹幕淹没。
    -   **必须紧接**【直播间前情提要】里的最后一个动作继续发展。

2.  **弹幕氛围 (Danmu)**: 
    -   **必须火爆**: 你的直播间人气很高！生成大量路人弹幕。
    -   **路人反应**: 路人观众应该对 "${userContent}" 做出反应（复读、嘲笑、询问等）。

3.  **时间轴**: 本次生成内容对应的时间长度为 **${randomDuration}秒**。请确保事件丰富，不要只生成几秒钟的内容。

【输出格式铁律】
返回纯净的 JSON 数组 \`[]\`。**请只提供事件对象，不要关心具体的 time 字段数值，只需保证事件发生的先后顺序即可，我会为你自动分配时间。**
示例: 
[
  { "type": "visual", "content": "主播看到弹幕愣了一下，笑着说..." },
  { "type": "danmu", "user": "路人A", "content": "哈哈哈" },
  { "type": "visual", "content": "主播拿起水杯喝了一口..." },
  ...
]
`;

        // ==========================================
        // 8. 调用 API
        // ==========================================
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: customTemp
            })
        });

        if (!response.ok) throw new Error(`API请求失败: ${response.status}`);

        const data = await response.json();
        const contentStr = data.choices[0].message.content;
        const jsonMatch = contentStr.match(/\[[\s\S]*\]/);
        
        if (!jsonMatch) throw new Error("JSON解析失败，AI未返回有效的数组格式。");
        
        let newEvents = JSON.parse(jsonMatch[0]);

        // ==========================================
        // 9. 【核心修复】时间轴重排算法 (Time Redistribution)
        // ==========================================
        // 无论AI返回的 time 是多少（或者没有time），我们都强制重写
        // 将所有事件均匀分布在 randomDuration (例如60秒) 内
        
        const startTime = currentTime + 1;
        const totalEvents = newEvents.length;
        
        if (totalEvents > 0) {
            newEvents = newEvents.map((event, index) => {
                // 计算该事件应该在第几秒
                // 算法：起始时间 + (当前索引 / 总数) * 总时长
                // 这样事件就会从 startTime 均匀铺满到 startTime + duration
                const offset = Math.floor((index / totalEvents) * randomDuration);
                return {
                    ...event,
                    time: startTime + offset
                };
            });
        }

        // ==========================================
        // 10. 合并数据并播放
        // ==========================================

        // 保留旧脚本中 current time 之前的部分
        const prevScript = (currentLiveScript || []).filter(e => e.time <= currentTime);
        // 拼接新生成的脚本
        currentLiveScript = [...prevScript, ...newEvents];
        
        // 更新缓存
        liveData.savedScript = currentLiveScript;
        await saveData();

        // 重新开始播放 (从下一秒开始)
        // 使用新脚本的最大时间作为结束时间，确保播放完整
        const newEndTime = Math.max(...newEvents.map(e => e.time), currentTime + randomDuration);
        
        // 再次确保停止旧的（双重保险）
        if (liveRoomInterval) clearInterval(liveRoomInterval);
        
        // 立即开始播放
        startLivePlayback(newEndTime, currentTime + 1);

    } catch (e) {
        console.error("互动生成失败", e);
        showAlert(`互动生成失败！\n\n原因: ${e.message}\n\n我们将尝试继续播放旧内容。`);
        
        // 恢复播放旧脚本 (防止画面卡死)
        if (currentLiveScript) {
             const maxTime = Math.max(...currentLiveScript.map(e => e.time));
             if (maxTime > currentTime) {
                 startLivePlayback(maxTime, currentTime + 1);
             }
        }
    } finally {
        // ==========================================
        // 11. 清理加载 UI
        // ==========================================
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
    }
}

// ==========================================
// 直播打赏礼物功能模块
// ==========================================

// 1. 定义抖音风格的直播礼物列表（价格由低到高）
const liveGifts = [
    { id: 'lg_1', name: '玫瑰花', price: 1, img: 'https://cdn-icons-png.flaticon.com/512/1065/1065715.png' },
    { id: 'lg_2', name: '小心心', price: 5, img: 'https://file.zhuyitai.com/feedback/202511/24/9ce146ca3dae3c2eba98e2cdf6acc1dc.png' },
    { id: 'lg_3', name: '甜甜圈', price: 10, img: 'https://cdn-icons-png.flaticon.com/512/184/184483.png' },
    { id: 'lg_4', name: '奶茶', price: 20, img: 'https://cdn-icons-png.flaticon.com/512/3081/3081162.png' },
    { id: 'lg_5', name: '加油鸭', price: 50, img: 'https://www.yn12377.cn/jubao/upload/smjb/2025/11/24/4acd1cb299a34d88a4ea1e5b5083717f.png' },
    { id: 'lg_6', name: '仙女棒', price: 99, img: 'https://s3plus.meituan.net/opapisdk/op_ticket_1_5673241091_1763972966316_qdqqd_za45lw.png' },
    { id: 'lg_7', name: '浪漫马车', price: 299, img: 'https://cdn-icons-png.flaticon.com/512/784/784131.png' },
    { id: 'lg_8', name: '保时捷', price: 500, img: 'https://saas.chatbot.cn/download/minio/standard/2025-11-24/b3c3e153231c4d438d00eb695ed38cfa.png' },
    { id: 'lg_9', name: '绚烂烟花', price: 999, img: 'https://saas.chatbot.cn/download/minio/standard/2025-11-24/624e810b8c75443c8bc3a7c23571b2c5.png' },
    { id: 'lg_10', name: '梦幻城堡', price: 2000, img: 'https://cdn-icons-png.flaticon.com/512/1415/1415715.png' },
    { id: 'lg_11', name: '抖音一号', price: 5000, img: 'https://cdn-icons-png.flaticon.com/512/860/860368.png' },
    { id: 'lg_12', name: '嘉年华', price: 9999, img: 'https://cdncs.ykt.cbern.com.cn/v0.1/download?path=/zxx_feedback/qdqqd/1763973058417.png' }
];

let selectedLiveGiftItem = null;

// 2. 打开弹窗并渲染列表
function openLiveGiftModal() {
    if (!currentPreviewLiveId) {
        showToast("请先进入一个直播间");
        return;
    }
    
    // 显示余额
    document.getElementById('liveGiftBalanceDisplay').textContent = userProfile.balance.toFixed(2);
    selectedLiveGiftItem = null;
    
    const container = document.getElementById('liveGiftListContainer');
    container.innerHTML = liveGifts.map(item => `
        <div class="gift-item" onclick="selectLiveGiftItem(this, '${item.id}')" style="border: 2px solid transparent; border-radius: 8px; padding: 10px; cursor: pointer; transition: all 0.2s;">
            <img src="${item.img}" style="width: 45px; height: 45px; object-fit: contain; margin-bottom: 5px;">
            <div class="gift-name" style="color:#fff; font-size:12px;">${item.name}</div>
            <div class="gift-price" style="color:#f2c353; font-size:11px; font-weight:bold;">¥ ${item.price}</div>
        </div>
    `).join('');
    
    document.getElementById('liveGiftModal').classList.add('show');
}

// 3. 关闭弹窗
function closeLiveGiftModal() {
    document.getElementById('liveGiftModal').classList.remove('show');
}

// 4. 选中礼物（高亮处理）
function selectLiveGiftItem(element, itemId) {
    document.querySelectorAll('#liveGiftListContainer .gift-item').forEach(el => {
        el.style.borderColor = 'transparent';
        el.style.backgroundColor = 'transparent';
    });
    element.style.borderColor = '#ff4d4d';
    element.style.backgroundColor = 'rgba(255, 77, 77, 0.1)';
    
    selectedLiveGiftItem = liveGifts.find(i => i.id === itemId);
}

// --- 【替换】确认赠送核心逻辑（接入贡献值系统） ---
async function confirmLiveGiftSend() {
    if (!selectedLiveGiftItem) return showToast("请先选择一个礼物！");
    
    const gift = selectedLiveGiftItem;
    
    // 1. 检查余额
    if (userProfile.balance < gift.price) {
        return showAlert("余额不足，请前往钱包充值！");
    }
    
    // 2. 扣除余额并增加当前直播间的贡献值 (1元 = 10贡献值)
    userProfile.balance -= gift.price;
    
    // 找到当前直播间数据
    let liveData = currentLiveRecommendations.find(l => l.id === currentPreviewLiveId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === currentPreviewLiveId);
    
    if (liveData) {
        // 初始化并增加贡献值
        if (!liveData.myContribution) liveData.myContribution = 0;
        liveData.myContribution += (gift.price * 10);
    }
    
    await saveData();
    if(typeof updateWalletDisplay === 'function') updateWalletDisplay(); // 同步全局钱包UI
    
    // 3. 关闭礼物弹窗
    closeLiveGiftModal();
    
    // 4. 播放全局投掷动画 
    if (typeof playGiftAnimation === 'function') {
        playGiftAnimation(gift.img);
    }
    
    // 5. 在直播间发送显眼的弹幕
    const danmuContainer = document.getElementById('liveDanmuContainer');
    const danmuItem = document.createElement('div');
    danmuItem.className = 'live-danmu-item';
    const userName = liveUserProfile.name || "我";
    
    danmuItem.innerHTML = `
        <span class="danmu-user" style="color:#FFD700; font-weight:bold;">${userName}：</span>
        <span class="danmu-content" style="color:#ff4d4d; font-weight:bold; font-size:15px;">送出了 ${gift.name} 🎁 x1</span>
    `;
    
    danmuContainer.appendChild(danmuItem);
    danmuContainer.scrollTop = danmuContainer.scrollHeight;
    
    const currentTime = Math.floor(livePlaybackIndex) || 0;
    if (currentLiveScript) {
        currentLiveScript.push({ time: currentTime, type: 'danmu', user: userName, content: `[送出了 ${gift.name} 🎁]`, isUser: true });
    }

    // 6. 判断价值，大于等于50元触发主播反应
    if (gift.price >= 50 && liveData) {
        await triggerLiveGiftReaction(liveData, gift, currentTime);
    }
    
    // 7. 如果贡献榜是打开的，实时刷新榜单
    if (document.getElementById('liveRankModal').classList.contains('show')) {
        renderLiveRankList(liveData);
    }
}

// ==========================================
// 贡献榜/在线观众 功能模块
// ==========================================

// 打开榜单
function openLiveRankModal() {
    if (!currentPreviewLiveId) return;
    
    let liveData = currentLiveRecommendations.find(l => l.id === currentPreviewLiveId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === currentPreviewLiveId);
    if (!liveData) return;

    // 确保假数据榜单已初始化
    initFakeLeaderboard(liveData);
    
    // 渲染列表
    renderLiveRankList(liveData);
    
    document.getElementById('liveRankModal').classList.add('show');
}

// 关闭榜单
function closeLiveRankModal() {
    document.getElementById('liveRankModal').classList.remove('show');
}

// 初始化生成假人榜单 (只在第一次打开该直播间时生成)
function initFakeLeaderboard(liveData) {
    if (!liveData.leaderboard) {
        liveData.myContribution = liveData.myContribution || 0;
        liveData.leaderboard = [];
        
        // 随机生成 15-25 个高分机器人大佬
        const botCount = Math.floor(Math.random() * 10) + 15;
        // 榜一的分数（根据直播间人数稍微浮动）
        let baseScore = Math.floor(Math.random() * 80000) + 20000; 
        
        for(let i = 0; i < botCount; i++) {
            // 从内置头像库随便抽一个
            const randomAvatar = passerbyAvatarUrls[Math.floor(Math.random() * passerbyAvatarUrls.length)];
            liveData.leaderboard.push({
                name: "神秘老板" + Math.floor(Math.random() * 9999),
                avatar: randomAvatar,
                score: baseScore,
                isMe: false
            });
            // 后面的机器人分数递减
            baseScore = Math.floor(baseScore * (Math.random() * 0.15 + 0.7)); 
        }
    }
}

// 渲染榜单 HTML
function renderLiveRankList(liveData) {
    const listArea = document.getElementById('liveRankListArea');
    listArea.innerHTML = '';

    // 1. 复制一份榜单，并把“我”塞进去一起参与排序
    let allPlayers = [...liveData.leaderboard];
    
    // 只有当我有贡献值时，才加入主榜单竞争
    if (liveData.myContribution > 0) {
        allPlayers.push({
            name: liveUserProfile.name || "我",
            avatar: liveUserProfile.avatarImage || '',
            score: liveData.myContribution,
            isMe: true
        });
    }

    // 2. 根据贡献值从大到小排序
    allPlayers.sort((a, b) => b.score - a.score);

    // 3. 渲染主列表
    allPlayers.forEach((player, index) => {
        const rankNum = index + 1;
        const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
        
        // 处理头像
        const avatarStyle = player.avatar 
            ? `background-image: url('${player.avatar}')` 
            : `background-color: #333; display:flex; align-items:center; justify-content:center; color:#fff; font-size:12px;`;
        const avatarText = player.avatar ? '' : player.name[0];

        const itemHTML = `
            <div class="live-rank-item" style="${player.isMe ? 'background: #fff8f8;' : ''}">
                <div class="rank-num ${rankClass}">${rankNum}</div>
                <div class="rank-avatar" style="${avatarStyle}">${avatarText}</div>
                <div class="rank-info">
                    <div class="rank-name" style="${player.isMe ? 'color:#ff4d4d;' : ''}">${player.name}</div>
                </div>
                <div class="rank-score">${player.score}</div>
            </div>
        `;
        listArea.insertAdjacentHTML('beforeend', itemHTML);
    });

    // 4. 更新底部的“我的状态”栏
    let myRankStr = "-";
    if (liveData.myContribution > 0) {
        const myIndex = allPlayers.findIndex(p => p.isMe);
        myRankStr = myIndex + 1;
    }

    const myAvatarEl = document.getElementById('myRankAvatar');
    if (liveUserProfile.avatarImage) {
        myAvatarEl.style.backgroundImage = `url('${liveUserProfile.avatarImage}')`;
        myAvatarEl.textContent = '';
    } else {
        myAvatarEl.style.backgroundImage = 'none';
        myAvatarEl.style.backgroundColor = '#1da1f2';
        myAvatarEl.style.display = 'flex';
        myAvatarEl.style.alignItems = 'center';
        myAvatarEl.style.justifyContent = 'center';
        myAvatarEl.style.color = '#fff';
        myAvatarEl.textContent = '我';
    }

    document.getElementById('myRankNum').textContent = myRankStr;
    document.getElementById('myRankNum').style.color = (myRankStr <= 3 && myRankStr !== "-") ? '#ff3b30' : '#999';
    document.getElementById('myRankName').textContent = liveUserProfile.name || "我";
    document.getElementById('myRankName').style.color = liveData.myContribution > 0 ? '#000' : '#999';
    document.getElementById('myRankScore').textContent = liveData.myContribution || 0;
}

// 6. 高阶礼物触发的主播专属反应生成 (双轨制 + 人设强绑定版)
async function triggerLiveGiftReaction(liveData, gift, currentTime) {
    // 获取全局 API 设置
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl || !settings.apiKey) return;

    if (document.getElementById('interaction-loading-toast')) return; // 防止重复触发

    const isFriendRoom = !!liveData.friendId; // 判断是关注(好友)还是推荐(路人)
    
    // 【核心要求】：完全使用 API 设置中的自定义温度
    const customTemp = parseFloat(settings.apiTemperature) || 0.9; 
    
    const randomDuration = Math.floor(Math.random() * (60 - 30 + 1)) + 30; // 生成30-60秒的感谢片段

    // 停止当前播放
    if (liveRoomInterval) {
        clearInterval(liveRoomInterval);
        liveRoomInterval = null;
    }
    
    // 显示底部 Toast 加载提示
    const loadingToast = document.createElement('div');
    loadingToast.id = 'interaction-loading-toast';
    loadingToast.style.cssText = 'position:fixed; bottom:120px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:12px 24px; border-radius:30px; z-index:9999; display:flex; align-items:center; gap:10px; font-size:14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); pointer-events: none; backdrop-filter: blur(5px);';
    loadingToast.innerHTML = '<i class="ri-loader-4-line fa-spin" style="font-size: 18px;"></i> <span>主播正在做出反应...</span>';
    document.body.appendChild(loadingToast);

    try {
        // 获取世界观上下文
        const worldviewId = isFriendRoom ? (liveSettings.followingWorldviewId || 'default') : (liveSettings.recommendWorldviewId || 'default');
        const worldview = liveWorldviews.find(w => w.id === worldviewId) || { content: "现代日常网络直播环境" };
        
        let aiInstruction = "";

        // ==========================================
        // 分流 A：【关注板块】好友专属反应 (极度注重人设)
        // ==========================================
        if (isFriendRoom) {
            const friend = friends.find(f => f.id === liveData.friendId);
            const personaId = friend ? (friend.activeUserPersonaId || 'default_user') : 'default_user';
            const persona = userPersonas.find(p => p.id === personaId) || userProfile;
            
            // 提取最近10条私聊记录，让AI模仿平时的说话语气
            const chatHistory = (chatHistories[friend.id] || []).slice(-10).map(m => 
                `${m.type === 'sent' ? persona.name : friend.name}: ${m.content.substring(0, 30)}`
            ).join('\n');

            aiInstruction = `
【【【最高优先级指令：完美贴合人设 (好友模式)】】】
- 主播真实身份：你的好友 "${friend.name}"。
- 主播核心人设："${friend.role}"。
- 送礼者身份：你的好友 "${persona.name}" (你在直播间的昵称是 "${liveUserProfile.name}")。
- 送礼者的性格："${persona.personality || '普通人'}"。

【参考：你们近期的私聊语气】
${chatHistory || '暂无私聊记录'}

【行为铁律 (绝对禁止OOC)】
收到好友送的 ${gift.name} (价值 ${gift.price} 元) 大礼，你**必须完全基于你的人设**做出反应！
1. **拒绝网络乞丐味**：绝对不要表现得像普通小主播一样献媚。你是以朋友/特定人设的身份在直播。
2. **性格投射**：
   - 如果你是【傲娇】，请表现出别扭的开心，甚至责怪对方乱花钱（“哼，谁要你破费了...不过还是谢啦”）。
   - 如果你是【高冷/霸总】，请表现出克制但真诚的反应。
   - 如果你是【病娇/占有欲】，请表现出对送礼者特殊的执念。
3. **认出好友**：你必须在画面描写中，准确认出这个网名 "${liveUserProfile.name}" 就是你的好友 "${persona.name}"，并用符合人设的口吻亲口念出TA的名字或专属称呼。`;

        } 
        // ==========================================
        // 分流 B：【推荐板块】路人主播反应 (狂热/直播间效果)
        // ==========================================
        else {
            aiInstruction = `
【【【直播间互动指令：路人模式】】】
- 主播身份：路人主播 "${liveData.name}"。
- 送礼者：榜一大哥/大姐 "${liveUserProfile.name}"。

【行为铁律】
收到老板送的 ${gift.name} (价值 ${gift.price} 元) 的超级大礼！
1. **直播间效果拉满**：你必须表现出极度的震惊、狂喜、感动，符合职业主播的素养。
2. **疯狂感谢**：大声且疯狂地念出老板 "${liveUserProfile.name}" 的名字。
3. **肢体语言**：在画面中做出比心、鞠躬、甚至激动得站起来等大幅度的感谢动作。`;
        }

        // 读取直播间近期的弹幕和画面作为上下文
        const historyScript = (currentLiveScript || []).filter(e => e.time <= currentTime).slice(-40);
        const liveStreamContext = historyScript.map(e => {
            if (e.type === 'visual') return `[画面]: ${e.content}`;
            return `[弹幕] ${e.user}: ${e.content}`;
        }).join('\n');

        // 构建最终 Prompt
        const prompt = `
【任务】: 你正在进行一场直播。刚刚有一位观众为你送出了昂贵的礼物，你需要基于上下文，生成接下来的 **${randomDuration}秒** 剧情。

【当前世界观】: ${worldview.content}

${aiInstruction}

【直播间前情提要】:
${liveStreamContext || "(直播刚开始)"}

【【【触发事件 (爆发点)】】】
**观众 "${liveUserProfile.name}" 送出了豪华礼物：${gift.name} (价值 ${gift.price} 元)！！！**

【生成要求】
1. **画面动作 (Visual)**: 
   - 必须**紧接**着触发事件，立刻描写主播的表情、动作和说出的话。
2. **弹幕氛围 (Danmu)**: 
   - 其他路人观众要发弹幕起哄。
   - 弹幕要刷屏，表达对礼物的惊叹或对主播反应的调侃。
3. **输出格式**: 返回纯净的 JSON 数组 \`[]\`。只需提供事件对象，无需关心具体的 time 数值，确保先后顺序即可。

【JSON示例】:
[
  { "type": "visual", "content": "主播看到屏幕上的礼物特效，猛地凑近镜头：‘哇...谢谢 ${liveUserProfile.name}！’..." },
  { "type": "danmu", "user": "吃瓜群众", "content": "老板大气！！！" },
  { "type": "visual", "content": "主播（后续的动作或情绪表达）..." }
]
`;

        // 统一使用自定义温度发起请求
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: customTemp // 【关键】使用 API 设置中的温度
            })
        });

        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("JSON Parse Error");
        
        let newEvents = JSON.parse(jsonMatch[0]);

        // 时间轴重排算法：把新的反应平滑地铺满生成的时长
        const startTime = currentTime + 1;
        const totalEvents = newEvents.length;
        if (totalEvents > 0) {
            newEvents = newEvents.map((event, index) => {
                const offset = Math.floor((index / totalEvents) * randomDuration);
                return { ...event, time: startTime + offset };
            });
        }

        // 合并数据并播放
        const prevScript = (currentLiveScript || []).filter(e => e.time <= currentTime);
        currentLiveScript = [...prevScript, ...newEvents];
        liveData.savedScript = currentLiveScript;
        await saveData(); // 将改变保存至数据库

        // 恢复播放
        const newEndTime = Math.max(...newEvents.map(e => e.time), currentTime + randomDuration);
        startLivePlayback(newEndTime, currentTime + 1);

    } catch (e) {
        console.error("生成礼物反应失败:", e);
        showToast("网速不佳，主播没看到礼物特效...");
        // 恢复播放旧脚本
        if (currentLiveScript) {
             const maxTime = Math.max(...currentLiveScript.map(e => e.time));
             if (maxTime > currentTime) startLivePlayback(maxTime, currentTime + 1);
        }
    } finally {
        // 隐藏加载动画
        if (loadingToast && loadingToast.parentNode) {
            loadingToast.parentNode.removeChild(loadingToast);
        }
    }
}

// ==========================================
// 直播连麦系统模块
// ==========================================

let isLiveMicActive = false; // 是否在麦上

// 1. 发起连麦请求
async function requestLiveMic() {
    toggleLiveMoreMenu(); // 关闭更多菜单

    if (isLiveMicActive) {
        return showToast("已经在连麦中啦！");
    }

    let liveData = currentLiveRecommendations.find(l => l.id === currentPreviewLiveId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === currentPreviewLiveId);
    if (!liveData) return;

    const isFriendRoom = !!liveData.friendId;
    let isAccepted = false;
    let reason = "";

    // 判定逻辑
    if (isFriendRoom) {
        isAccepted = true; // 关注板块（好友）必接
    } else {
        // 推荐板块：判断我送礼的贡献值 (500 相当于 50 块钱)
        const myContribute = liveData.myContribution || 0;
        if (myContribute >= 500) {
            isAccepted = true; // 礼物刷够了，同意
        } else if (Math.random() < 0.15) { 
            isAccepted = true; // 15% 运气好也会同意
        } else {
            isAccepted = false;
            reason = "主播拒绝了你的连麦请求（礼物贡献不足~）。";
        }
    }

    // --- 触发 AI 主播面对连麦请求的反应 ---
    showToast("正在发送连麦申请...", 2000);
    await triggerMicRequestReaction(liveData, isAccepted, isFriendRoom);

    // AI反应完后，如果同意则上麦
    if (isAccepted) {
        startLiveMicCall();
    } else {
        showToast(reason);
    }
}

// 2. AI 针对连麦申请的反应生成 (分流 + 强制第三人称)
async function triggerMicRequestReaction(liveData, isAccepted, isFriendRoom) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings.apiUrl) return;

    if (liveRoomInterval) clearInterval(liveRoomInterval);

    // 使用 API 设置里的自定义温度
    const customTemp = parseFloat(settings.apiTemperature) || 0.9;
    const randomDuration = Math.floor(Math.random() * 15) + 15; // 生成 15-30 秒的剧情
    const currentTime = Math.floor(livePlaybackIndex) || 0;

    let aiInstruction = "";

    // === 分流 A：关注板块 (熟人/好友) ===
    if (isFriendRoom) {
        const friend = friends.find(f => f.id === liveData.friendId);
        const persona = userPersonas.find(p => p.id === (friend.activeUserPersonaId || 'default_user')) || userProfile;
        
        // 读取近期私聊，增强人设贴合度
        const chatHistory = (chatHistories[friend.id] || []).slice(-10).map(m => 
            `${m.type === 'sent' ? persona.name : friend.name}: ${m.content.substring(0, 30)}`
        ).join('\n');

        aiInstruction = `
【【【情景指令：关注板块 (熟人局)】】】
- 主播身份：你的好友 "${friend.name}" (人设: ${friend.role})。
- 连麦申请者：你的好友 "${persona.name}" (人设: ${persona.personality || '普通人'})。
- 你们的近期聊天参考：
${chatHistory || '暂无'}

【事件】：好友向你发起了直播连麦请求，你瞬间同意了。
【要求】：你必须基于 "${friend.name}" 的人设做出反应（傲娇、开心、调侃等）。
`;
    } 
    // === 分流 B：推荐板块 (陌生人/路人) ===
    else {
        if (isAccepted) {
            aiInstruction = `
【【【情景指令：推荐板块 (路人局)】】】
- 主播身份：路人主播 "${liveData.name}"。
- 连麦申请者：直播间的观众 "${liveUserProfile.name}"。
【事件】：这位观众申请连麦，你同意了。
【要求】：表现出热情欢迎水友上麦的职业主播态度。`;
        } else {
            aiInstruction = `
【【【情景指令：推荐板块 (路人局)】】】
- 主播身份：路人主播 "${liveData.name}"。
- 连麦申请者：直播间的观众 "${liveUserProfile.name}"。
【事件】：这位观众申请连麦，但被你拒绝了。
【要求】：找个借口礼貌拒绝（如“不方便”、“只抽粉丝”）。`;
        }
    }

    const prompt = `
【任务】: 你正在进行直播。根据下面的突发事件，生成接下来的 ${randomDuration}秒 直播间剧情。

${aiInstruction}

【【【画面描写铁律 (ABSOLUTE RULES)】】】
1. **必须使用第三人称**：在描写主播画面 (\`type="visual"\`) 时，必须用第三人称（例如：“主播笑了笑”、“${liveData.name}接通了连麦说...”）。**绝对禁止**使用“我”或任何括号第一人称！
2. **严禁代替用户行为**：你**只负责描写主播**的反应。**绝对禁止**描写连麦者（用户）的神态、动作，也**绝对禁止**代替连麦者说任何话！

【输出格式】:
返回纯净的 JSON 数组 \`[]\`。包含 \`type="visual"\` (主播在画面里的动作和说的话) 和 \`type="danmu"\` (路人观众发在公屏上的弹幕)。

【JSON格式示例】:
[
  { "type": "visual", "content": "主播看到连麦申请，开心地说..." },
  { "type": "danmu", "user": "吃瓜网友", "content": "前排吃瓜！" }
]
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: customTemp })
        });
        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        let newEvents = JSON.parse(jsonMatch[0]);

        const startTime = currentTime + 1;
        if (newEvents.length > 0) {
            newEvents = newEvents.map((event, index) => ({ ...event, time: startTime + Math.floor((index / newEvents.length) * randomDuration) }));
        }
        
        const prevScript = (currentLiveScript || []).filter(e => e.time <= currentTime);
        currentLiveScript = [...prevScript, ...newEvents];
        liveData.savedScript = currentLiveScript;
        await saveData();

        const newEndTime = Math.max(...newEvents.map(e => e.time), currentTime + randomDuration);
        startLivePlayback(newEndTime, currentTime + 1);
    } catch(e) {
        console.error("连麦反应失败", e);
        if (currentLiveScript) {
             const maxTime = Math.max(...currentLiveScript.map(e => e.time));
             startLivePlayback(maxTime, currentTime + 1);
        }
    }
}

// 3. 开始连麦，显示方块 UI
function startLiveMicCall() {
    isLiveMicActive = true;
    const micWindow = document.getElementById('liveMicWindow');
    const avatarEl = document.getElementById('liveMicAvatar');
    const nameEl = document.getElementById('liveMicName');

    if (liveUserProfile.avatarImage) {
        avatarEl.style.backgroundImage = `url('${liveUserProfile.avatarImage}')`;
        avatarEl.textContent = '';
    } else {
        avatarEl.style.backgroundImage = 'none';
        avatarEl.style.backgroundColor = '#1da1f2';
        avatarEl.textContent = '我';
        avatarEl.style.display = 'flex';
        avatarEl.style.alignItems = 'center';
        avatarEl.style.justifyContent = 'center';
        avatarEl.style.color = '#fff';
    }
    nameEl.textContent = liveUserProfile.name || '我';

    micWindow.classList.add('show'); 
}

// 4. 挂断连麦
function closeLiveMicCall() {
    isLiveMicActive = false;
    document.getElementById('liveMicWindow').classList.remove('show');
}

// 5. 点击麦克风打开输入弹窗
function openLiveMicInput() {
    document.getElementById('liveMicVoiceText').value = '';
    document.getElementById('liveMicInputModal').classList.add('show');
}
function closeLiveMicInput() {
    document.getElementById('liveMicInputModal').classList.remove('show');
}

// 6. 麦上发送语音 (已取消弹幕上屏，只作为系统暗号发给API)
async function sendLiveMicVoice() {
    const text = document.getElementById('liveMicVoiceText').value.trim();
    if (!text) return;
    
    closeLiveMicInput();

    let liveData = currentLiveRecommendations.find(l => l.id === currentPreviewLiveId);
    if (!liveData) liveData = (currentLiveFollowingList || []).find(l => l.id === currentPreviewLiveId);
    if (!liveData) return;

    const currentTime = Math.floor(livePlaybackIndex) || 0;

    // 【修改】：不再把我的发言当做弹幕推送到屏幕上。它只存在于麦克风的语音交流里。

    // --- 触发 AI 听到我说话后的回应 ---
    await triggerMicSpeakReaction(liveData, text, currentTime);
}

// 7. AI 主播回应我在连麦时说的话 (严格贴合人设 + 第三人称)
async function triggerMicSpeakReaction(liveData, userVoiceText, currentTime) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings.apiUrl) return;

    if (liveRoomInterval) clearInterval(liveRoomInterval);
    
    // 显示底部加载 Toast
    const loadingToast = document.createElement('div');
    loadingToast.id = 'mic-speaking-toast';
    loadingToast.style.cssText = 'position:fixed; bottom:120px; left:50%; transform:translateX(-50%); background:rgba(0,0,0,0.85); color:white; padding:12px 24px; border-radius:30px; z-index:9999; display:flex; align-items:center; gap:10px; font-size:14px; box-shadow: 0 4px 15px rgba(0,0,0,0.4); pointer-events: none; backdrop-filter: blur(5px);';
    loadingToast.innerHTML = '<i class="ri-loader-4-line fa-spin" style="font-size: 18px;"></i> <span>主播正在听你说话...</span>';
    document.body.appendChild(loadingToast);

    const isFriendRoom = !!liveData.friendId;
    const customTemp = parseFloat(settings.apiTemperature) || 0.9;
    const randomDuration = Math.floor(Math.random() * 30) + 20; 

    let aiInstruction = "";

    // === 分流 A：关注板块 ===
    if (isFriendRoom) {
        const friend = friends.find(f => f.id === liveData.friendId);
        const persona = userPersonas.find(p => p.id === (friend.activeUserPersonaId || 'default_user')) || userProfile;
        
        // 提取聊天记录
        const chatHistory = (chatHistories[friend.id] || []).slice(-10).map(m => 
            `${m.type === 'sent' ? persona.name : friend.name}: ${m.content.substring(0, 30)}`
        ).join('\n');

        aiInstruction = `
【【【情景指令：关注板块 (熟人局)】】】
- 主播身份：你的好友 "${friend.name}" (人设: ${friend.role})。
- 连麦者：你的好友 "${persona.name}" (人设: ${persona.personality || '普通人'})。
- 近期私聊参考：\n${chatHistory || '无'}
【要求】：连麦者在麦上对你说了话。你需要基于 "${friend.name}" 的人设（以及你们的关系）对这番话进行直接的语音互动和回应。`;
    } 
    // === 分流 B：推荐板块 ===
    else {
        aiInstruction = `
【【【情景指令：推荐板块 (路人局)】】】
- 主播身份：路人主播 "${liveData.name}"。
- 连麦者：直播间的观众 "${liveUserProfile.name}"。
【要求】：连麦者对你说话了，你需要做出适当的互动和回应。`;
    }

    const historyScript = (currentLiveScript || []).filter(e => e.time <= currentTime).slice(-30);
    const liveStreamContext = historyScript.map(e => `${e.type === 'visual' ? '[画面]' : '[弹幕] ' + e.user}: ${e.content}`).join('\n');

    const prompt = `
【任务】: 你正在进行直播连麦。请根据连麦者的发言，生成接下来的 ${randomDuration}秒 直播剧情。
${aiInstruction}

【当前直播间历史】:
${liveStreamContext || '(无)'}

【【【核心触发事件】】】
**连麦者在麦克风里对你说了：“${userVoiceText}”**

【【【画面描写铁律 (ABSOLUTE RULES)】】】
1. **必须使用第三人称**：在描写主播 (\`type="visual"\`) 时，必须用第三人称（如“主播点头回答道”、“${liveData.name}凑近屏幕说”）。**绝对禁止使用“我”**。
2. **严禁越俎代庖**：你**只负责描写主播**的回答和反应。**绝对禁止**描写连麦者的动作，也**绝对禁止**代替连麦者说任何后续的话。

3. 返回 JSON 数组 \`[]\`。

【JSON格式示例】:
[
  { "type": "visual", "content": "主播认真听完，点了点头回答道..." },
  { "type": "danmu", "user": "路人甲", "content": "这声音绝了！" }
]
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: customTemp })
        });
        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        let newEvents = JSON.parse(jsonMatch[0]);

        const startTime = currentTime + 1;
        if (newEvents.length > 0) {
            newEvents = newEvents.map((event, index) => ({ ...event, time: startTime + Math.floor((index / newEvents.length) * randomDuration) }));
        }

        currentLiveScript = [...(currentLiveScript || []).filter(e => e.time <= currentTime), ...newEvents];
        liveData.savedScript = currentLiveScript;
        await saveData();

        const newEndTime = Math.max(...newEvents.map(e => e.time), currentTime + randomDuration);
        startLivePlayback(newEndTime, currentTime + 1);

    } catch (e) {
        console.error("生成连麦对话失败:", e);
        if (currentLiveScript) {
             const maxTime = Math.max(...currentLiveScript.map(e => e.time));
             startLivePlayback(maxTime, currentTime + 1);
        }
    } finally {
        const toast = document.getElementById('mic-speaking-toast');
        if (toast) toast.remove();
    }
}

/* ====================================================
   [新增] “我开直播” 功能模块
   ================================================== */

// 1. 打开开播设置弹窗
function openMyLiveSetupModal() {
    document.getElementById('myLiveTitle').value = '';
    document.getElementById('myLiveRules').value = '';
    document.getElementById('myLiveSetupModal').classList.add('show');
}

function closeMyLiveSetupModal() {
    document.getElementById('myLiveSetupModal').classList.remove('show');
}

// 2. 初始化并进入我的直播间
function startMyLiveRoom() {
    const title = document.getElementById('myLiveTitle').value.trim() || '我的日常直播';
    const category = document.getElementById('myLiveCategory').value;
    const rules = document.getElementById('myLiveRules').value.trim();

    myLiveState = {
        isActive: true,
        category: category,
        title: title,
        rules: rules,
        viewers: [], // 生成几个初始假观众
        chatHistory: [],
        viewerCount: Math.floor(Math.random() * 50) + 10 // 初始观众数
    };

    // 初始化假观众名单
    for (let i = 0; i < 15; i++) {
        myLiveState.viewers.push({
            name: `水友_${Math.floor(Math.random()*9999)}`,
            avatar: passerbyAvatarUrls[Math.floor(Math.random() * passerbyAvatarUrls.length)],
            score: Math.floor(Math.random() * 100) // 初始贡献值
        });
    }

    closeMyLiveSetupModal();
    
    // 设置界面 UI
    const bgEl = document.getElementById('myLiveBg');
    const avatarEl = document.getElementById('myLiveRoomAvatar');
    const myAvatarUrl = liveUserProfile.avatarImage || userProfile.avatarImage; // 优先用直播马甲头像，其次全局头像

    if (myAvatarUrl) {
        bgEl.style.backgroundImage = `url('${myAvatarUrl}')`;
        avatarEl.style.backgroundImage = `url('${myAvatarUrl}')`;
        avatarEl.textContent = '';
    } else {
        bgEl.style.backgroundColor = '#333';
        avatarEl.style.backgroundColor = '#1da1f2';
        avatarEl.textContent = '我';
    }

    document.getElementById('myLiveRoomName').textContent = liveUserProfile.name || userProfile.name;
    document.getElementById('myLiveViewerCountText').textContent = myLiveState.viewerCount;
    document.getElementById('myLiveDanmuContainer').innerHTML = '';
    document.getElementById('myLiveActionLog').innerHTML = '';

    // 初始系统弹幕
    appendMyLiveDanmu('系统', `欢迎来到【${title}】直播间！`, '#ffcc00');

    // 切换到我的直播间页面
    setActivePage('myLiveRoomScreen');
    document.querySelector('.phone').classList.add('status-bar-hidden');
}

// 3. 退出直播间
function quitMyLiveRoom() {
    showConfirm('确定要下播吗？', (yes) => {
        if (yes) {
            myLiveState.isActive = false;
            setActivePage('liveApp');
            applyStatusBarVisibility(); // 恢复状态栏
        }
    });
}

// 4. 推进剧情 (调用 AI - V2 深度记忆+角色融合版)
async function advanceMyLive() {
    if (!myLiveState.isActive) return;

    const inputEl = document.getElementById('myLiveHostInput');
    const hostAction = inputEl.value.trim();
    if (!hostAction) return showToast("总得说点或做点什么吧~");

    const btn = document.getElementById('myLiveAdvanceBtn');
    if (btn.classList.contains('loading')) return;

    // A. 将主播的动作上屏显示并存入历史
    appendMyLiveAction(hostAction);
    inputEl.value = '';
    myLiveState.chatHistory.push(`[主播(我)的动作/话语]: ${hostAction}`);
    
    // B. UI 加载状态
    btn.classList.add('loading');
    btn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i>';

    // C. 准备 AI 情报
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) {
        btn.classList.remove('loading');
        btn.textContent = '推进';
        return showToast("请先配置API");
    }

    // 1. 获取完整的直播间历史记录 (保留最近40条，确保记忆连贯但不爆Token)
    const historyText = myLiveState.chatHistory.slice(-40).join('\n');

    // 2. 抓取被选中的 AI 角色 (读取用户在设置里勾选的关注角色)
    const activeAiIds = liveSettings.activeAiIds || [];
    const aiFriends = friends.filter(f => activeAiIds.includes(f.id));
    
    // 构建 AI 角色档案 (包含他们眼中的你的人设)
    const aiFriendsInfo = aiFriends.map(f => {
        const personaId = f.activeUserPersonaId || 'default_user';
        const persona = userPersonas.find(p => p.id === personaId) || userProfile;
        return `- 角色名: "${f.name}"
  - TA的人设: "${f.role}"
  - 你在TA眼中的人设: "${persona.name}" (${persona.personality || '普通人'})
  - 私下关系参考(最近聊天): ${(chatHistories[f.id] || []).slice(-5).map(m => m.content).join(' | ') || '无'}`;
    }).join('\n\n');

    // D. 构建极其严谨的 Prompt
    const prompt = `
【任务】: 你是一个直播间互动模拟器。用户目前正在进行一场虚拟直播。
你需要根据用户刚刚的“动作/发言”，以及【完整的历史记忆】，生成一批实时的弹幕和礼物。

【直播间档案】:
- 主播(用户): "${liveUserProfile.name || userProfile.name}"
- 直播分类: ${myLiveState.category}
- 标题: ${myLiveState.title}
- 规则/人设指令: ${myLiveState.rules || '无'}
- 当前在线人数: ${myLiveState.viewerCount} 人

【特别关注的熟人观众 (AI好友)】:
${aiFriendsInfo || '当前无熟人观众，全靠路人水友。'}

【【【完整直播历史记录 (你的记忆库)】】】:
${historyText || '(直播刚刚开始)'}

【【【主播刚刚做出的行为】】】:
"${hostAction}"

【生成规则 (必须严格遵守)】:
1. **【记忆连贯】**: 仔细阅读历史记录！如果某个观众（特别是熟人）上一轮问了问题，或者送了礼物，这一轮他们必须记得自己做过的事，并根据主播刚才的反应继续互动。禁止记忆重置。
2. **【人设附体】**: 熟人观众的发言和送礼行为，必须**百分之百**贴合他们的人设以及你们的私下关系（傲娇、霸总、粘人等）。
3. **【路人网感】**: 除了熟人，还要生成真实的“路人水友”。路人弹幕要有梗、爱凑热闹、带节奏或吐槽。
4. **【礼物机制】**: 如果主播的举动很精彩、搞笑、或惹人怜爱，安排 1-2 个送礼物的弹幕（熟人为了捧场也极大概率会砸重金送礼）。
5. **【数量要求】**: 根据主播的行为，直播间的人数，一次性生成 20到30条弹幕。

【输出格式铁律 (必须返回纯 JSON 数组)】:
- \`isFriend\`: 如果是熟人观众，填 true；路人填 false。
- \`user\`: 观众名字。熟人必须严格使用档案中的原名。
- \`type\`: "text" (普通弹幕) 或 "gift" (礼物)。
- \`price\`: 如果是 gift，必须包含一个纯数字金额（如 500），否则填 0。

【JSON格式示例】:
[
  { "type": "text", "isFriend": false, "user": "暴躁老哥", "content": "主播这操作没看懂啊？", "price": 0 },
  { "type": "gift", "isFriend": true, "user": "熟人名字", "content": "送出 豪华游艇 🎁 (附言：别太累了)", "price": 1000 },
  { "type": "text", "isFriend": true, "user": "熟人名字", "content": "刚刚那句是在对我说吗？", "price": 0 }
]
`;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.95 // 稍微高一点让弹幕更多样化
            })
        });

        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("JSON解析失败");

        const reactions = JSON.parse(jsonMatch[0]);

        // E. 逐条播放弹幕并计算贡献值
        for (const reaction of reactions) {
            await new Promise(r => setTimeout(r, 500 + Math.random() * 800)); // 模拟真实进场延迟
            
            let viewerName = reaction.user;
            let viewerAvatar = '';
            let isRealFriend = false;

            // 识别是否是我们的 AI 好友
            if (reaction.isFriend) {
                const friendObj = friends.find(f => f.name === viewerName);
                if (friendObj) {
                    viewerAvatar = friendObj.avatarImage || 'text'; // 如果没图做个标记
                    isRealFriend = true;
                }
            }

            // 如果是路人，分配随机头像
            if (!isRealFriend) {
                viewerAvatar = passerbyAvatarUrls[Math.floor(Math.random() * passerbyAvatarUrls.length)];
            }

            // 排行榜记账逻辑
            let viewer = myLiveState.viewers.find(v => v.name === viewerName);
            if (!viewer) {
                viewer = { name: viewerName, avatar: viewerAvatar, score: 0 };
                myLiveState.viewers.push(viewer);
            } else if (isRealFriend && viewerAvatar !== 'text') {
                // 如果之前没刷出头像，现在补上
                viewer.avatar = viewerAvatar; 
            }

            // 弹幕上屏颜色区分：好友弹幕用醒目的金色/粉色，路人用白色/浅蓝
            const nameColor = isRealFriend ? '#ffb6c1' : '#aaddff'; 

            if (reaction.type === 'gift' && reaction.price > 0) {
                viewer.score += parseInt(reaction.price);
                // 好友送礼用特殊高亮颜色
                appendMyLiveDanmu(viewerName, reaction.content, isRealFriend ? '#FFD700' : '#fff', true);
                myLiveState.chatHistory.push(`[礼物] ${viewerName}: ${reaction.content}`);
            } else {
                appendMyLiveDanmu(viewerName, reaction.content, nameColor);
                myLiveState.chatHistory.push(`[弹幕] ${viewerName}: ${reaction.content}`);
            }
        }
        
        // 随机增加一点观众人数，营造火热氛围
        myLiveState.viewerCount += Math.floor(Math.random() * 30) + 5;
        document.getElementById('myLiveViewerCountText').textContent = myLiveState.viewerCount;

    } catch (e) {
        console.error(e);
        appendMyLiveDanmu('系统', '直播流波动，水友们卡顿了...', '#ff3b30');
    } finally {
        btn.classList.remove('loading');
        btn.textContent = '推进';
    }
}

// 5. 辅助：在屏幕中间显示主播动作
function appendMyLiveAction(text) {
    const container = document.getElementById('myLiveActionLog');
    const div = document.createElement('div');
    div.className = 'my-action-bubble';
    div.textContent = text;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    myLiveState.chatHistory.push(`[主播]: ${text}`);
}

// 6. 辅助：生成弹幕
function appendMyLiveDanmu(user, content, color = '#aaddff', isGift = false) {
    const container = document.getElementById('myLiveDanmuContainer');
    const div = document.createElement('div');
    div.className = `live-danmu-item ${isGift ? 'gift' : ''}`;
    div.innerHTML = `<span class="danmu-user" style="color:${color}">${user}：</span><span class="danmu-content">${content}</span>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// 7. 打开我的直播间贡献榜
function openMyLiveRankModal() {
    if (!myLiveState.isActive) return;

    // 复用已有的 #liveRankModal，但内容填我自己的数据
    const listArea = document.getElementById('liveRankListArea');
    listArea.innerHTML = '';

    // 按贡献排序
    const sortedViewers = [...myLiveState.viewers].sort((a, b) => b.score - a.score).slice(0, 50); // 最多看前50

    sortedViewers.forEach((v, index) => {
        if (v.score <= 0) return; // 没刷过礼物的就不上榜了

        const rankNum = index + 1;
        const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
        const avatarStyle = `background-image: url('${v.avatar}');`;

        const html = `
            <div class="live-rank-item">
                <div class="rank-num ${rankClass}">${rankNum}</div>
                <div class="rank-avatar" style="${avatarStyle}"></div>
                <div class="rank-info">
                    <div class="rank-name">${v.name}</div>
                </div>
                <div class="rank-score">${v.score}</div>
            </div>
        `;
        listArea.insertAdjacentHTML('beforeend', html);
    });

    // 隐藏底部的“我”的排名栏（因为这是我开的直播，我不在榜单里）
    document.querySelector('.live-my-rank-bar').style.display = 'none';
    
    // 强制修改弹窗标题为“贡献榜”
    document.querySelector('.live-rank-title-row span').textContent = "直播间贡献榜";

    document.getElementById('liveRankModal').classList.add('show');
}

/* ── 插件对外接口 (供主文件 save/load 使用) ── */
window.LivePlugin = {
    getSaveData: function() {
        return {
            currentLiveRecommendations: currentLiveRecommendations,
            currentLiveFollowingList:   currentLiveFollowingList,
            liveWorldviews:  liveWorldviews,
            livePrompts:     livePrompts,
            liveSettings:    liveSettings,
            liveUserProfile: liveUserProfile,
        };
    },
    loadData: function(settings) {
        if (!settings) return;

        if (settings.liveUserProfile) {
            liveUserProfile = settings.liveUserProfile;
        } else {
            liveUserProfile = {
                name: "直播萌新",
                avatarImage: "",
                id: Math.floor(Math.random() * 90000000 + 10000000).toString(),
                following: 0, fans: 0, likes: 0
            };
        }

        currentLiveRecommendations = settings.currentLiveRecommendations || [];
        currentLiveFollowingList   = settings.currentLiveFollowingList   || [];
        liveWorldviews = settings.liveWorldviews || [];
        livePrompts    = settings.livePrompts    || [];

        liveSettings = settings.liveSettings || {
            recommendWorldviewId: null,
            followingWorldviewId: null,
            promptId:    null,
            activeAiIds: [],
            duration:    60,
            danmuDensity: 'normal'
        };

        // 兼容旧版本
        if (settings.liveSettings && settings.liveSettings.worldviewId && !liveSettings.recommendWorldviewId) {
            liveSettings.recommendWorldviewId = settings.liveSettings.worldviewId;
        }
        if (!liveSettings.activeAiIds) liveSettings.activeAiIds = [];
    }
};

/* ── 初始化：等 DOM 就绪后注入 HTML ── */
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { _injectLiveCSS(); _injectLiveHTML(); });
} else {
    _injectLiveCSS();
    _injectLiveHTML();
}

console.log('[LivePlugin] 直播插件加载完成 ✅');
