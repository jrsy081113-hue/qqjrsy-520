/**
 * ============================================================================
 * JRSY - 你画我猜 (Draw & Guess) 独立插件 V2.0
 * 包含: 布局各占一半、手动下一局、AI自由作画、深度人设聊天(1-8条)
 * ============================================================================
 */

// ----------------------------------------------------------------------------
// 1. CSS 样式注入 (绿白/蓝白极简清新风，优化布局)
// ----------------------------------------------------------------------------
const dg_styles = `
<style>
/* 游戏主界面容器 */
#drawGuessGameScreen {
    background-color: #f7f8fa !important;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
}

/* 导航栏贴顶处理 (沉浸式) */
.phone.dg-active .status-bar {
    display: none !important;
}
#drawGuessGameScreen .nav-bar {
    top: 0 !important;
    height: calc(44px + env(safe-area-inset-top)) !important;
    padding-top: env(safe-area-inset-top) !important;
    background: #ffffff !important;
    border-bottom: 1px solid #f0f0f0 !important;
    box-shadow: 0 2px 10px rgba(0,0,0,0.02) !important;
    z-index: 100;
}
#drawGuessGameScreen .nav-title { font-weight: 800; color: #333; }
#drawGuessGameScreen .nav-btn { color: #333; }

/* 内容区域：Flex 布局，让画板和聊天各占一定比例 */
.dg-main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding-top: calc(44px + env(safe-area-inset-top));
    overflow: hidden;
}

/* --- 画板卡片区域 (优化高度，不遮挡聊天) --- */
.dg-board-card {
    background: #fff;
    margin: 10px 15px;
    border-radius: 16px;
    padding: 10px 15px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
    border: 1px solid #f0f0f0;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* 顶部状态行 */
.dg-status-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-bottom: 10px;
}

.dg-role-badge {
    background: #e6f7ff;
    color: #007aff;
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: bold;
}

.dg-current-word {
    font-size: 16px;
    font-weight: 900;
    color: #ff3b30;
    letter-spacing: 2px;
}

.dg-timer {
    background: #fff0f0;
    color: #ff3b30;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 14px;
    font-family: monospace;
    font-weight: bold;
    border: 1px solid #ffe4e4;
}

/* 画板容器：限制最大高度为屏幕的 40%，确保正方形且居中 */
.dg-canvas-container {
    width: 100%;
    max-width: 35vh; /* 基于高度限制宽度，保持正方形 */
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    border: 2px solid #e5e5e5;
    position: relative;
    overflow: hidden;
    background-color: #fafafa;
    /* 网格线背景 */
    background-image: 
        linear-gradient(90deg, transparent 95%, #ececec 95%),
        linear-gradient(transparent 95%, #ececec 95%);
    background-size: 20px 20px;
    box-shadow: inset 0 0 10px rgba(0,0,0,0.03);
}

#dgCanvas {
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    cursor: crosshair;
}

/* 画板上的 AI 思考遮罩 */
.dg-ai-overlay {
    position: absolute;
    top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(255,255,255,0.85);
    backdrop-filter: blur(2px);
    display: none;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10;
}
.dg-ai-overlay.show { display: flex; }

/* 画笔工具栏 */
.dg-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    width: 100%;
}

.dg-color-palette {
    display: flex;
    gap: 8px;
}
.dg-color-btn {
    width: 24px; height: 24px;
    border-radius: 50%;
    cursor: pointer;
    border: 2px solid transparent;
    transition: transform 0.2s;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
}
.dg-color-btn.active {
    transform: scale(1.2);
    border-color: #dcdcdc;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}

.dg-actions {
    display: flex;
    gap: 8px;
}
.dg-icon-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    background: #f5f5f5;
    border: none; color: #666;
    font-size: 16px; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: all 0.2s;
}
.dg-icon-btn.active { background: #333; color: #fff; }
.dg-icon-btn:active { transform: scale(0.95); }

/* 画好了按钮 */
.dg-btn-done {
    background: #007aff;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 0 15px;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 4px;
    transition: transform 0.1s;
    box-shadow: 0 2px 8px rgba(0,122,255,0.3);
}
.dg-btn-done:active { transform: scale(0.95); }

/* --- 聊天区域 (占满下半部) --- */
#dgChatLog {
    flex: 1;
    overflow-y: auto;
    padding: 0 15px 15px 15px;
    background: transparent !important;
}

/* 游戏系统提示 */
.dg-sys-tip {
    text-align: center;
    margin: 8px 0;
    font-size: 12px;
    color: #888;
}
.dg-sys-tip span {
    background: #e8e8e8;
    padding: 4px 12px;
    border-radius: 12px;
    display: inline-block;
}

/* 覆盖聊天气泡，保持极简 */
#dgChatLog .message-content {
    box-shadow: 0 2px 5px rgba(0,0,0,0.02) !important;
    border: 1px solid #eee;
    padding: 8px 12px !important;
    font-size: 14px;
}
#dgChatLog .message.sent .message-content {
    background: #007aff !important;
    color: #fff !important;
    border-color: #007aff;
}
#dgChatLog .message.received .message-content {
    background: #fff !important;
    color: #333 !important;
}

/* 底部输入区 */
#drawGuessGameScreen .chat-input {
    background: #ffffff !important;
    border-top: 1px solid #f0f0f0;
    padding: 10px 15px;
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
    display: flex;
    gap: 10px;
    align-items: center;
    z-index: 20;
}

#dgChatInput {
    flex: 1;
    height: 40px;
    background: #f5f5f5;
    border: 1px solid transparent;
    border-radius: 20px;
    padding: 0 15px;
    font-size: 15px;
    outline: none;
    color: #333;
}
#dgChatInput:focus { background: #fff; border-color: #007aff; }

/* 接收消息/让TA猜 灯泡按钮 */
.dg-btn-receive {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #f0f7ff;
    color: #007aff;
    border: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 20px; cursor: pointer; flex-shrink: 0;
}

.dg-btn-send {
    width: 40px; height: 40px;
    border-radius: 50%;
    background: #333;
    color: #fff;
    border: none;
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; cursor: pointer; flex-shrink: 0;
}
.dg-btn-send:disabled, .dg-btn-receive:disabled { opacity: 0.5; cursor: not-allowed; }

/* --- 选词弹窗美化 --- */
#dgWordSelectModal .modal-content {
    background: linear-gradient(180deg, #ffffff 0%, #f4f9ff 100%) !important;
    border: 1px solid #d6eaff !important;
    border-radius: 24px !important;
    padding: 30px 25px !important;
    box-shadow: 0 15px 40px rgba(0,122,255,0.15) !important;
}

.dg-word-options {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    width: 100%;
    margin: 20px 0;
}
.dg-word-btn {
    background: #fff;
    border: 1px solid #bae0ff;
    color: #007aff;
    padding: 15px 10px;
    border-radius: 12px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 10px rgba(0,122,255,0.05);
}
.dg-word-btn:active { background: #e6f7ff; transform: scale(0.95); }

.dg-custom-input-row {
    display: flex; width: 100%; gap: 10px; margin-top: 10px;
}
.dg-custom-input-row input {
    flex: 1; border: 1px solid #d9d9d9; background: #fff; border-radius: 8px; padding: 10px; font-size: 14px; outline: none;
}
.dg-custom-input-row button {
    background: #333; color: #fff; border: none; border-radius: 8px; padding: 0 15px; font-weight: bold; cursor: pointer;
}

/* 暗色模式适配 */
.wechat-dark-mode #drawGuessGameScreen { background-color: #000 !important; }
.wechat-dark-mode #drawGuessGameScreen .nav-bar { background: #1c1c1e !important; border-bottom-color: #333 !important; }
.wechat-dark-mode #drawGuessGameScreen .nav-title, .wechat-dark-mode #drawGuessGameScreen .nav-btn { color: #fff !important; }
.wechat-dark-mode .dg-board-card { background: #1c1c1e; border-color: #333; }
.wechat-dark-mode .dg-canvas-container { background-color: #2c2c2e; border-color: #444; background-image: linear-gradient(90deg, transparent 95%, #3a3a3c 95%), linear-gradient(transparent 95%, #3a3a3c 95%); }
.wechat-dark-mode #dgCanvas { filter: invert(1) hue-rotate(180deg); }
.wechat-dark-mode .dg-ai-overlay { background: rgba(28,28,30,0.85); color: #fff; }
.wechat-dark-mode .dg-icon-btn, .wechat-dark-mode .dg-btn-receive { background: #3a3a3c; color: #ccc; }
.wechat-dark-mode .dg-icon-btn.active { background: #fff; color: #000; }
.wechat-dark-mode #drawGuessGameScreen .chat-input { background: #1c1c1e !important; border-top-color: #333; }
.wechat-dark-mode #dgChatInput { background: #2c2c2e; color: #fff; border-color: #444; }
.wechat-dark-mode #dgWordSelectModal .modal-content { background: #1c1c1e !important; border-color: #333 !important; }
.wechat-dark-mode .dg-word-btn { background: #2c2c2e; border-color: #444; color: #64a1ff; }
</style>
`;
document.head.insertAdjacentHTML('beforeend', dg_styles);

// ----------------------------------------------------------------------------
// 2. HTML 结构注入
// ----------------------------------------------------------------------------
const dg_html = `
<!-- 游戏设置/选人弹窗 -->
<div id="dgSetupModal" class="modal">
    <div class="modal-content" style="border-radius: 20px;">
        <div class="modal-title" style="color: #007aff;">你画我猜</div>
        <p style="font-size: 12px; color: #999; text-align: center; margin-bottom: 15px;">
            请选择一位好友开始游戏。
        </p>
        <div id="dgFriendList" class="multi-select-list" style="max-height: 200px; border: 1px solid #e6f7ff; background: #fafcff; border-radius: 8px;">
            <!-- JS 生成 -->
        </div>
        <div class="modal-buttons" style="margin-top: 20px;">
            <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('dgSetupModal').classList.remove('show')">取消</button>
            <button class="modal-btn modal-btn-confirm" onclick="dg_startGame()" style="background: #007aff;">开始游戏</button>
        </div>
    </div>
</div>

<!-- 选词弹窗 (全局居中) -->
<div id="dgWordSelectModal" class="modal" style="z-index: 10005;">
    <div class="modal-content">
        <div class="modal-title">请选择一个词语</div>
        <div style="text-align: center; color: #ff3b30; font-size: 28px; font-weight: 800; font-family: Arial; margin-bottom: 15px;" id="dgWordTimer">30s</div>
        
        <div class="dg-word-options" id="dgWordOptions">
            <!-- 按钮由 JS 生成 -->
        </div>
        
        <div style="margin-top: 15px; font-size: 12px; color: #999;">或自己想一个词：</div>
        <div class="dg-custom-input-row">
            <input type="text" id="dgCustomWordInput" placeholder="最多6个字" maxlength="6">
            <button onclick="dg_selectCustomWord()">确定</button>
        </div>
    </div>
</div>

<!-- 游戏主界面 -->
<div id="drawGuessGameScreen" class="page">
    <div class="nav-bar">
        <button class="nav-btn" onclick="dg_quitGame()"><i class="ri-arrow-left-s-line"></i></button>
        <div class="nav-title" id="dgNavTitle">你画我猜</div>
        <div style="display: flex; gap: 5px;">
            <!-- 切换角色 -->
            <button class="nav-btn nav-right-action-btn" onclick="dg_switchRole()" title="切换谁来画">
                <i class="ri-exchange-line" style="color: #007aff; font-size: 20px;"></i>
            </button>
            <!-- 下一局 -->
            <button class="nav-btn nav-right-action-btn" onclick="dg_startNewRound()" title="换一局/重置">
                <i class="ri-refresh-line" style="color: #007aff; font-size: 20px;"></i>
            </button>
        </div>
    </div>

    <div class="dg-main-content">
        <!-- 上半部：画板区 -->
        <div class="dg-board-card">
            <div class="dg-status-row">
                <span class="dg-role-badge" id="dgRoleText">当前：我画TA猜</span>
                <span class="dg-current-word" id="dgCurrentWordDisplay">等待选词...</span>
                <span class="dg-timer" id="dgTimerDisplay">--</span>
            </div>
            
            <!-- 使用一个 flex 容器让画板居中 -->
            <div style="width:100%; display:flex; justify-content:center;">
                <div class="dg-canvas-container" id="dgCanvasContainer">
                    <canvas id="dgCanvas"></canvas>
                    <!-- AI等待/思考遮罩 -->
                    <div id="dgAiWaitOverlay" class="dg-ai-overlay">
                        <div class="loading-spinner" style="border-top-color: #007aff; margin-bottom: 10px; width: 30px; height: 30px; border-width: 3px;"></div>
                        <div style="font-weight: bold; color: #333;" id="dgWaitText">TA 正在绞尽脑汁...</div>
                    </div>
                </div>
            </div>

            <!-- 画板工具栏 -->
            <div class="dg-toolbar" id="dgToolsArea">
                <!-- 颜色盘 -->
                <div class="dg-color-palette">
                    <div class="dg-color-btn active" style="background: #000;" onclick="dg_setColor('#000', this)"></div>
                    <div class="dg-color-btn" style="background: #ff3b30;" onclick="dg_setColor('#ff3b30', this)"></div>
                    <div class="dg-color-btn" style="background: #007aff;" onclick="dg_setColor('#007aff', this)"></div>
                    <div class="dg-color-btn" style="background: #34c759;" onclick="dg_setColor('#34c759', this)"></div>
                </div>
                <!-- 动作按钮 -->
                <div class="dg-actions">
                    <button class="dg-icon-btn" id="dgEraserBtn" onclick="dg_toggleEraser(this)" title="橡皮擦"><i class="ri-eraser-fill"></i></button>
                    <button class="dg-icon-btn" onclick="dg_clearCanvas()" title="清空"><i class="ri-delete-bin-line"></i></button>
                    <!-- 画好了按钮 -->
                    <button class="dg-btn-done" id="dgDoneBtn" onclick="dg_finishDrawing()"><i class="ri-check-line"></i> 画好了</button>
                </div>
            </div>
        </div>

        <!-- 下半部：聊天区 -->
        <div id="dgChatLog" class="chat-messages dg-chat-area"></div>
    </div>

    <!-- 底部输入区 -->
    <div class="chat-input">
        <!-- 手动接收消息 / 让 AI 猜 -->
        <button class="dg-btn-receive" id="dgReceiveBtn" onclick="dg_requestAiResponse()" title="获取TA的回复">
            <i class="ri-lightbulb-flash-line"></i>
        </button>
        <input type="text" id="dgChatInput" placeholder="输入聊天或答案..." onkeydown="if(event.key==='Enter') dg_sendMessage()">
        <button class="dg-btn-send" id="dgSendBtn" onclick="dg_sendMessage()">
            <i class="ri-send-plane-fill"></i>
        </button>
    </div>
</div>
`;
document.body.insertAdjacentHTML('beforeend', dg_html);

// ----------------------------------------------------------------------------
// 3. 全局状态与词库
// ----------------------------------------------------------------------------
const dgState = {
    active: false,
    friendId: null,
    host: 'user', // 'user' (我画TA猜) 或 'ai' (TA画我猜)
    phase: 'idle', // 'word_selection', 'drawing', 'guessing', 'end'
    currentWord: '',
    timer: null,
    timeLeft: 0,
    
    // 画板状态
    isDrawing: false,
    lastX: 0,
    lastY: 0,
    currentColor: '#000000',
    isEraser: false,
    
    // 本局专属聊天记录 (不污染主世界)
    chatLog: []
};

// 预设词库
const DG_WORDS = [
    "苹果", "香蕉", "西瓜", "葡萄", "汽车", "飞机", "自行车", "轮船",
    "猫咪", "小狗", "大象", "长颈鹿", "乌龟", "毒蛇", "游鱼", "小鸟",
    "房子", "大树", "太阳", "月亮", "星星", "高山", "河流", "玫瑰",
    "手机", "电脑", "电视", "冰箱", "洗衣机", "空调", "沙发", "大床",
    "眼镜", "帽子", "鞋子", "雨伞", "书本", "铅笔", "剪刀", "手套",
    "汉堡", "披萨", "冰淇淋", "蛋糕", "火锅", "烤肉", "咖啡", "奶茶",
    "篮球", "足球", "羽毛球", "乒乓球", "游泳", "跑步", "跳绳", "举重",
    "剪发", "刷牙", "洗脸", "睡觉", "哭泣", "大笑", "生气", "发呆",
    "雪人", "圣诞树", "灯笼", "风筝", "气球", "秋千", "滑梯", "奥特曼"
];

let dgCanvas, dgCtx;

// 初始化 Canvas 及调整尺寸
function dg_initCanvasEvents() {
    dgCanvas = document.getElementById('dgCanvas');
    const container = document.getElementById('dgCanvasContainer');
    
    // 获取容器实际像素尺寸并赋值给 canvas 属性，防止拉伸模糊
    const rect = container.getBoundingClientRect();
    dgCanvas.width = rect.width;
    dgCanvas.height = rect.height;
    
    dgCtx = dgCanvas.getContext('2d');
    dgCtx.lineCap = 'round';
    dgCtx.lineJoin = 'round';
    
    dg_resetBrush();

    // 绑定事件 (先解绑防重复)
    dgCanvas.removeEventListener('mousedown', dg_startPosition);
    dgCanvas.removeEventListener('mouseup', dg_endPosition);
    dgCanvas.removeEventListener('mousemove', dg_draw);
    dgCanvas.removeEventListener('mouseout', dg_endPosition);
    dgCanvas.removeEventListener('touchstart', dg_startPosition);
    dgCanvas.removeEventListener('touchend', dg_endPosition);
    dgCanvas.removeEventListener('touchmove', dg_draw);

    dgCanvas.addEventListener('mousedown', dg_startPosition);
    dgCanvas.addEventListener('mouseup', dg_endPosition);
    dgCanvas.addEventListener('mousemove', dg_draw);
    dgCanvas.addEventListener('mouseout', dg_endPosition);
    dgCanvas.addEventListener('touchstart', dg_startPosition, { passive: false });
    dgCanvas.addEventListener('touchend', dg_endPosition);
    dgCanvas.addEventListener('touchmove', dg_draw, { passive: false });
}

function getDgCoords(e) {
    const rect = dgCanvas.getBoundingClientRect();
    const scaleX = dgCanvas.width / rect.width;
    const scaleY = dgCanvas.height / rect.height;

    if (e.touches && e.touches.length > 0) {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function dg_startPosition(e) {
    if (dgState.phase !== 'drawing' || dgState.host !== 'user') return;
    e.preventDefault();
    dgState.isDrawing = true;
    const { x, y } = getDgCoords(e);
    dgState.lastX = x;
    dgState.lastY = y;
}

function dg_endPosition() {
    dgState.isDrawing = false;
    dgCtx.beginPath();
}

function dg_draw(e) {
    if (!dgState.isDrawing || dgState.phase !== 'drawing' || dgState.host !== 'user') return;
    e.preventDefault(); 
    
    const { x, y } = getDgCoords(e);
    
    dgCtx.beginPath();
    dgCtx.moveTo(dgState.lastX, dgState.lastY);
    dgCtx.lineTo(x, y);
    dgCtx.stroke();
    
    dgState.lastX = x;
    dgState.lastY = y;
}

function dg_clearCanvas() {
    if (dgCtx && dgCanvas) {
        dgCtx.clearRect(0, 0, dgCanvas.width, dgCanvas.height);
    }
}

function dg_setColor(color, btnEl) {
    dgState.currentColor = color;
    dgState.isEraser = false;
    dg_resetBrush();
    
    document.querySelectorAll('.dg-color-btn').forEach(b => b.classList.remove('active'));
    btnEl.classList.add('active');
    document.getElementById('dgEraserBtn').classList.remove('active');
}

function dg_toggleEraser(btnEl) {
    dgState.isEraser = !dgState.isEraser;
    if (dgState.isEraser) {
        btnEl.classList.add('active');
        document.querySelectorAll('.dg-color-btn').forEach(b => b.classList.remove('active'));
        dgCtx.globalCompositeOperation = 'destination-out';
        dgCtx.lineWidth = 15; 
    } else {
        btnEl.classList.remove('active');
        const activeColorBtn = document.querySelector('.dg-color-btn[style*="' + dgState.currentColor + '"]') || document.querySelectorAll('.dg-color-btn')[0];
        activeColorBtn.classList.add('active');
        dg_resetBrush();
    }
}

function dg_resetBrush() {
    dgCtx.globalCompositeOperation = 'source-over';
    dgCtx.strokeStyle = dgState.currentColor;
    dgCtx.lineWidth = 4;
}

// ----------------------------------------------------------------------------
// 4. 游戏流程控制
// ----------------------------------------------------------------------------

function dg_openSetupModal() {
    const list = document.getElementById('dgFriendList');
    list.innerHTML = '';
    
    const aiFriends = friends.filter(f => !f.isGroup);
    if (aiFriends.length === 0) {
        list.innerHTML = '<div style="padding:20px;text-align:center;color:#999;">暂无好友</div>';
    } else {
        aiFriends.forEach((friend, idx) => {
            const item = document.createElement('div');
            item.className = 'multi-select-item';
            item.style.padding = '10px';
            item.style.borderBottom = '1px solid #eee';
            
            const avatar = friend.avatarImage 
                ? `<div style="width:32px;height:32px;border-radius:50%;background-image:url('${friend.avatarImage}');background-size:cover;margin:0 10px;"></div>`
                : `<div style="width:32px;height:32px;border-radius:50%;background:#007aff;color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:bold;margin:0 10px;">${friend.name[0]}</div>`;

            item.innerHTML = `
                <input type="radio" name="dgFriendSelect" id="dg-friend-${friend.id}" value="${friend.id}" ${idx === 0 ? 'checked' : ''} style="accent-color: #007aff;">
                ${avatar}
                <label for="dg-friend-${friend.id}" style="flex:1;cursor:pointer;color:#333;font-weight:bold;">${friend.remark || friend.name}</label>
            `;
            item.onclick = (e) => {
                if(e.target.tagName !== 'INPUT') item.querySelector('input').checked = true;
            };
            list.appendChild(item);
        });
    }
    
    document.getElementById('dgSetupModal').classList.add('show');
    hideFunctionMenus(); 
}

function dg_startGame() {
    const selected = document.querySelector('input[name="dgFriendSelect"]:checked');
    if (!selected) return showToast("请选择一位好友");
    
    dgState.friendId = selected.value;
    dgState.active = true;
    dgState.host = 'user'; // 默认我画
    dgState.chatLog = [];  
    
    document.getElementById('dgSetupModal').classList.remove('show');
    
    document.querySelector('.phone').classList.add('status-bar-hidden'); 
    document.querySelector('.phone').classList.add('dg-active'); 
    setActivePage('drawGuessGameScreen');
    
    document.getElementById('dgChatLog').innerHTML = ''; 
    setTimeout(dg_initCanvasEvents, 100);
    
    const friend = friends.find(f => f.id === dgState.friendId);
    document.getElementById('dgNavTitle').textContent = `与 ${friend.remark || friend.name} 的游戏`;
    
    dg_sysLog(`=== 游戏开始！当前：你画，${friend.name}猜 ===`);
    dg_startNewRound();
}

function dg_quitGame() {
    showConfirm("确定退出游戏吗？记录将不会保存。", (yes) => {
        if(yes) {
            dgState.active = false;
            clearInterval(dgState.timer);
            document.querySelector('.phone').classList.remove('status-bar-hidden');
            document.querySelector('.phone').classList.remove('dg-active');
            setActivePage('gamesApp');
        }
    });
}

function dg_switchRole() {
    if (dgState.phase === 'drawing') {
        return showToast("作画中不可切换，请先完成或等待倒计时结束");
    }
    
    dgState.host = dgState.host === 'user' ? 'ai' : 'user';
    const roleText = dgState.host === 'user' ? '当前：我画TA猜' : '当前：TA画我猜';
    document.getElementById('dgRoleText').textContent = roleText;
    
    const friend = friends.find(f => f.id === dgState.friendId);
    dg_sysLog(`=== 模式切换：${dgState.host === 'user' ? `你画，${friend.name}猜` : `${friend.name}画，你猜`} ===`);
    
    dg_startNewRound();
}

// 开始新一轮
function dg_startNewRound() {
    dg_clearCanvas();
    dgState.currentWord = '';
    document.getElementById('dgAiWaitOverlay').classList.remove('show');
    document.getElementById('dgCurrentWordDisplay').textContent = "等待选词...";
    
    if (dgState.host === 'user') {
        // 我画，进入选词阶段
        document.getElementById('dgToolsArea').style.visibility = 'visible';
        dg_startWordSelection();
    } else {
        // AI画，直接进入AI作画阶段
        document.getElementById('dgToolsArea').style.visibility = 'hidden'; 
        document.getElementById('dgCurrentWordDisplay').textContent = "???"; // 隐藏AI的词
        dg_aiStartDrawing();
    }
}

// ----------------------------------------------------------------------------
// 5. 用户画，AI 猜
// ----------------------------------------------------------------------------

function dg_startWordSelection() {
    dgState.phase = 'word_selection';
    const modal = document.getElementById('dgWordSelectModal');
    const optionsBox = document.getElementById('dgWordOptions');
    document.getElementById('dgCustomWordInput').value = '';
    
    // 随机抽4个词
    const shuffled = [...DG_WORDS].sort(() => 0.5 - Math.random());
    const choices = shuffled.slice(0, 4);
    
    optionsBox.innerHTML = choices.map(word => `
        <button class="dg-word-btn" onclick="dg_confirmWord('${word}')">${word}</button>
    `).join('');
    
    modal.classList.add('show');
    
    dgState.timeLeft = 30;
    document.getElementById('dgWordTimer').textContent = `${dgState.timeLeft}s`;
    
    clearInterval(dgState.timer);
    dgState.timer = setInterval(() => {
        dgState.timeLeft--;
        document.getElementById('dgWordTimer').textContent = `${dgState.timeLeft}s`;
        if (dgState.timeLeft <= 0) {
            clearInterval(dgState.timer);
            dg_confirmWord(choices[0]); // 超时选第一个
        }
    }, 1000);
}

function dg_selectCustomWord() {
    const word = document.getElementById('dgCustomWordInput').value.trim();
    if (!word) return showToast("请输入词语");
    dg_confirmWord(word);
}

function dg_confirmWord(word) {
    clearInterval(dgState.timer);
    dgState.currentWord = word;
    document.getElementById('dgWordSelectModal').classList.remove('show');
    
    // 画板上方显示题目
    document.getElementById('dgCurrentWordDisplay').textContent = `词语：${word}`;
    dg_sysLog(`(系统提示: 你的词语是【${word}】。画完后点击“画好了”让TA猜)`);
    
    // 开始 60 秒作画
    dgState.phase = 'drawing';
    dgState.timeLeft = 60;
    document.getElementById('dgTimerDisplay').textContent = `${dgState.timeLeft}s`;
    
    dgState.timer = setInterval(() => {
        dgState.timeLeft--;
        document.getElementById('dgTimerDisplay').textContent = `${dgState.timeLeft}s`;
        if (dgState.timeLeft <= 0) {
            clearInterval(dgState.timer);
            dg_finishDrawing(); // 超时自动提交
        }
    }, 1000);
}

// 画好了，强制停止画画，但 AI 不会自动猜，需要点灯泡 (对齐你演我猜)
function dg_finishDrawing() {
    if (dgState.phase !== 'drawing') return;
    clearInterval(dgState.timer);
    dgState.phase = 'guessing';
    
    const dataUrl = dgCanvas.toDataURL('image/png');
    if (dataUrl.length < 1500) {
        showToast("你还没画呢！");
        dg_startNewRound(); 
        return;
    }

    document.getElementById('dgTimerDisplay').textContent = "--";
    dg_sysLog("已完成作画。请点击左下角【灯泡】按钮让TA看图猜测！");
}

// ----------------------------------------------------------------------------
// 6. AI 画画流程 (自由发挥坐标)
// ----------------------------------------------------------------------------

async function dg_aiStartDrawing() {
    dgState.phase = 'ai_drawing';
    document.getElementById('dgTimerDisplay').textContent = "--";
    
    dgState.currentWord = DG_WORDS[Math.floor(Math.random() * DG_WORDS.length)];
    const friend = friends.find(f => f.id === dgState.friendId);
    
    dg_sysLog(`【系统】${friend.name} 正在构思怎么画... (请准备猜词)`);
    
    document.getElementById('dgWaitText').textContent = `${friend.name} 正在提笔...`;
    document.getElementById('dgAiWaitOverlay').classList.add('show');

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) {
        document.getElementById('dgAiWaitOverlay').classList.remove('show');
        return showAlert("请配置 API");
    }

    const prompt = `
【你的身份】：你是“${friend.name}”，人设是“${friend.role}”。
你现在正在玩“你画我猜”游戏，任务是在正方形画板上画出词语：【${dgState.currentWord}】。
你必须输出一个“线条坐标数组”，系统会解析它并在屏幕上动态画出来。

【画板规则】：
1. 坐标系：左上角是 [0, 0]，右下角是 [100, 100]。
2. 画风与坐标生成：必须绝对贴合你的人设性格！
   - 如果人设是严谨/高冷/聪明的，线条应尽量精准、几何化、特征明确。
   - 如果人设是呆萌/活泼/笨拙/疯批的，请化身“灵魂画手”，故意让坐标变得抽象、歪歪扭扭、比例失调，保留滑稽感。
3. 结构：必须输出一个严格的 JSON 三维数组。最外层是所有笔画，中间层代表一笔，内层是 \`[x, y]\` 坐标点。

【JSON 格式严格示例】：
[
  [ [10, 10], [90, 10], [90, 90], [10, 90], [10, 10] ],  // 第一笔
  [ [20, 20], [80, 80] ]                                 // 第二笔
]

【绝对禁令】：
严禁输出任何多余的文本、markdown标记。只返回纯数组。
`;

    let strokes = [];
    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.5 
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content.trim();
        
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            strokes = JSON.parse(jsonMatch[0]);
        } else {
            throw new Error("No JSON found");
        }
    } catch (e) {
        console.error("AI 坐标生成失败", e);
        // 兜底画个叉
        strokes = [[[10,10], [90,90]], [[90,10], [10,90]]];
    }

    document.getElementById('dgAiWaitOverlay').classList.remove('show');
    dgState.phase = 'guessing'; 
    dg_sysLog(`【系统】${friend.name} 画完了！请在下方输入答案。如果猜不出，可聊天互动并点击灯泡要提示。`);

    await dg_animateStrokes(strokes);
}

// 在 Canvas 上动画绘制线条
function dg_animateStrokes(strokes) {
    return new Promise(async (resolve) => {
        dg_clearCanvas();
        dgCtx.lineWidth = 5;
        dgCtx.strokeStyle = '#333';
        
        const scaleX = dgCanvas.width / 100;
        const scaleY = dgCanvas.height / 100;

        for (let i = 0; i < strokes.length; i++) {
            const stroke = strokes[i];
            if (!Array.isArray(stroke) || stroke.length < 2) continue;
            
            for (let j = 0; j < stroke.length - 1; j++) {
                const p1 = stroke[j];
                const p2 = stroke[j+1];
                
                if (Array.isArray(p1) && Array.isArray(p2)) {
                    // 增加 ±3 像素的随机手抖效果（数字越大画得越歪）
const jx = (Math.random() - 0.5) * 3; 
const jy = (Math.random() - 0.5) * 3;

dgCtx.beginPath();
dgCtx.moveTo(p1[0] * scaleX, p1[1] * scaleY);
dgCtx.lineTo(p2[0] * scaleX + jx, p2[1] * scaleY + jy);
                    dgCtx.stroke();
                    
                    await new Promise(r => setTimeout(r, 40)); 
                }
            }
            await new Promise(r => setTimeout(r, 100)); 
        }
        resolve();
    });
}

// ----------------------------------------------------------------------------
// 7. 聊天交互 & 手动触发 AI (灯泡按钮)
// ----------------------------------------------------------------------------

// 发送文本
function dg_sendMessage() {
    const input = document.getElementById('dgChatInput');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    const persona = userPersonas.find(p => p.id === (friends.find(f=>f.id===dgState.friendId)?.activeUserPersonaId || 'default_user')) || userProfile;
    
    dg_appendChat(persona.name, text, persona.avatarImage, persona.name[0], 'sent');

    // 裁判逻辑：我猜阶段
    if (dgState.host === 'ai' && dgState.phase === 'guessing') {
        if (text.includes(dgState.currentWord)) {
            dg_sysLog(`🎉 恭喜你猜对了！答案是【${dgState.currentWord}】`);
            document.getElementById('dgCurrentWordDisplay').textContent = `正确: ${dgState.currentWord}`;
            dgState.phase = 'end';
            // 系统判定赢了，不再自动调用 AI，可以手动聊天或点下一局
            return;
        }
    }
    
    // 聊天只存记录，不自动触发 AI
}

// 点击灯泡：获取 AI 回复 (含识图)
async function dg_requestAiResponse() {
    const btn = document.getElementById('dgReceiveBtn');
    if (btn.disabled) return;

    if (dgState.phase === 'drawing' || dgState.phase === 'word_selection') {
        return showToast("作画环节未结束，或尚未选词。");
    }

    const friend = friends.find(f => f.id === dgState.friendId);
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) return showToast("请配置API");

    btn.disabled = true;
    const oldIcon = btn.innerHTML;
    btn.innerHTML = '<i class="ri-loader-4-line fa-spin"></i>';

    const persona = userPersonas.find(p => p.id === friend.activeUserPersonaId) || userProfile;
    // 取最近聊天
    const chatContext = dgState.chatLog.slice(-15).map(m => `${m.sender}: ${m.content}`).join('\n');

    let prompt = "";
    let apiMessages = [];

    // --- 场景 A: 我画，AI 猜 (Vision 识图) ---
    if (dgState.host === 'user' && dgState.phase === 'guessing') {
        const dataUrl = dgCanvas.toDataURL('image/png');
        
        // 绝对不能包含答案 currentWord
        prompt = `
【游戏】：你画我猜
【你的身份】：${friend.name} (人设: ${friend.role})
【当前状态】：用户 "${persona.name}" 画了一幅画，正在等待你猜这是什么。

【聊天历史】：
${chatContext || '用户在发呆...'}

【你的任务】：
请查看附带的图片，并用中文猜测用户画的是什么。
1. **结合聊天记录**：如果用户在聊天里给了提示，或者吐槽了什么，请做出回应。
2. **多条回复**：为了模拟真实聊天，请将你的反应和猜测拆分成 1 到 8 条短话发出来，表现出思考、调侃或确信的过程。
3. **语气**：完全符合你的人设。严禁使用任何 emoji。

【输出格式铁律】：
必须返回纯净的 JSON 字符串数组。
示例：["这画的是什么鬼...", "难道是猪八戒？", "不对，应该是猴子！"]
`;
        apiMessages = [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: dataUrl, detail: "low" } }
            ]
        }];
    } 
    // --- 场景 B: AI 画，我猜 (纯文本) ---
    else if (dgState.host === 'ai') {
        // AI 知道答案
        prompt = `
【游戏】：你画我猜
【你的身份】：${friend.name} (人设: ${friend.role})
【情况】：你画了“${dgState.currentWord}”。用户 "${persona.name}" 正在猜词。
【聊天历史】：
${chatContext || '(用户还没说话)'}

【你的任务】：
1. 看看聊天记录，回复用户的话。
2. 如果用户猜错了，否定他并给出符合人设的提示；如果用户闲聊，就正常回应。
3. **多条回复**：将你的回复拆分成 1 到 8 条短话返回 JSON 数组。
4. **禁止**：严禁使用任何 emoji 表情符号。严禁直接说出答案。

【输出格式铁律】：
纯净的 JSON 字符串数组。
示例：["不对哦~", "再想想，是可以吃的东西。", "你这脑回路也是没谁了..."]
`;
        apiMessages = [{ role: 'user', content: prompt }];
    }
    // --- 场景 C: 游戏结束后的闲聊 ---
    else if (dgState.phase === 'end') {
        prompt = `
【游戏】：你画我猜 (本局已结束)
【你的身份】：${friend.name} (人设: ${friend.role})
【情况】：答案是“${dgState.currentWord}”，这局已经猜出来了。
【聊天历史】：
${chatContext || '(无)'}
【任务】：
根据聊天记录，和用户聊聊这局游戏，或者催促用户点击右上角的“下一局”按钮。
返回 1 到 8 条短话的 JSON 数组。严禁 emoji。`;
        apiMessages = [{ role: 'user', content: prompt }];
    }

    // --- 发起请求 ---
    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: apiMessages,
                temperature: 0.9
            })
        });

        if (!response.ok) throw new Error("API 请求失败");
        const data = await response.json();
        const rawContent = data.choices[0].message.content.trim();
        
        let replies = [];
        try {
            const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
            replies = jsonMatch ? JSON.parse(jsonMatch[0]) : [rawContent.replace(/^["“”]|["“”]$/g, '')];
        } catch(e) {
            replies = [rawContent];
        }

        for (const reply of replies) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 500));
            dg_appendChat(friend.name, reply, friend.avatarImage, friend.name[0], 'received');
            
            // 我画TA猜模式下，系统裁判：AI的回复里是否包含了正确答案
            if (dgState.host === 'user' && dgState.phase === 'guessing' && reply.includes(dgState.currentWord)) {
                dg_sysLog(`🎉 恭喜！${friend.name} 猜对了！答案就是【${dgState.currentWord}】`);
                document.getElementById('dgCurrentWordDisplay').textContent = `被猜中：${dgState.currentWord}`;
                dgState.phase = 'end';
                break; // 猜中后停止输出剩余废话
            }
        }
    } catch (e) {
        console.error(e);
        dg_sysLog("网络波动，TA 走神了。");
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldIcon;
    }
}

// 辅助：打印聊天气泡并保存内部记录
function dg_appendChat(name, text, imgUrl, textAvatar, type) {
    // 存入内部日志，供 AI 参考
    dgState.chatLog.push({ sender: type === 'sent' ? '用户' : name, content: text });

    const log = document.getElementById('dgChatLog');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    
    const avatarHtml = imgUrl 
        ? `<div class="chat-avatar" style="background-image: url('${imgUrl}'); border: none;"></div>`
        : `<div class="chat-avatar" style="background: ${type==='sent'?'#007aff':'#333'}; color:white;">${textAvatar}</div>`;
        
    const contentHtml = `<div class="message-content">${text}</div>`;
    
    div.innerHTML = type === 'sent' ? (contentHtml + avatarHtml) : (avatarHtml + contentHtml);
    log.appendChild(div);
    
    // 延迟一下确保DOM渲染完毕再滚动
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 50);
}

function dg_sysLog(text) {
    const log = document.getElementById('dgChatLog');
    const div = document.createElement('div');
    div.className = 'dg-sys-tip';
    div.innerHTML = `<span>${text}</span>`;
    log.appendChild(div);
    setTimeout(() => { log.scrollTop = log.scrollHeight; }, 50);
}