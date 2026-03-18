/**
 * ============================================================================
 * JRSY 穿越现实 (Cross Reality) 插件 - 终极流畅晋江动态交互版
 * ============================================================================
 */

// --- 1. 全局数据与 BGM 配置 ---
const CR_PLAYLIST = [
    { name: "那些你很冒险的梦", url: "https://img.heliar.top/file/1773748133382_M500003VwfmM1X0b1a.mp3" },
    { name: "我爱你没有保留", url: "https://img.heliar.top/file/1773748279361_M500003G1obN0nHpGU.mp3" },
    { name: "演员", url: "https://img.heliar.top/file/1773748460456_M500003ArIqB27NamX.mp3" },
    { name: "老街", url: "https://img.heliar.top/file/1773748610589_M500004U927G0splK9.mp3" },
    { name: "爱的回归线", url: "https://img.heliar.top/file/1773748754911_M500002xpBxA13oPjq.mp3" }
];

let crState = {
    currentFriendId: null,
    session: null,        
    textQueue: [],        
    isGenerating: false,
    audioPlayer: new Audio(),
    currentSongIndex: 0,
    isNightMode: false
};

// --- 2. 页面 DOM 注入初始化 ---
window.addEventListener('DOMContentLoaded', () => {
    injectCRStyles();
    injectCRDomElements();
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'dreamModeSelectModal' && mutation.target.classList.contains('show')) {
                injectCREntryButton();
            }
        });
    });
    const targetNode = document.getElementById('dreamModeSelectModal');
    if (targetNode) observer.observe(targetNode, { attributes: true, attributeFilter: ['class'] });

    crState.audioPlayer.addEventListener('ended', () => {
        crState.currentSongIndex = (crState.currentSongIndex + 1) % CR_PLAYLIST.length;
        crState.audioPlayer.src = CR_PLAYLIST[crState.currentSongIndex].url;
        crState.audioPlayer.play().catch(e => console.error("音频连播失败:", e));
    });
});

// --- 3. 核心样式注入 ---
function injectCRStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .cr-nav-bar { background: #fff; border-bottom: 1px solid #f0f0f0; z-index: 100; }
        .cr-play-area {
            width: 100%; height: 100%; background-color: #fcfcfc; 
            background-image: radial-gradient(#e0e0e0 1px, transparent 1px); background-size: 20px 20px;
            overflow-y: auto; padding: 60px 20px 100px; box-sizing: border-box; display: flex; flex-direction: column; align-items: center; position: relative;
            transition: background 0.3s;
        }
        .cr-play-area.night-mode { background-color: #121212; background-image: radial-gradient(#333 1px, transparent 1px); }
        .cr-top-float-bar {
            position: fixed; top: 0; left: 0; right: 0; display: flex; justify-content: space-between; align-items: center;
            padding: calc(15px + env(safe-area-inset-top)) 20px 15px; background: transparent; z-index: 100; pointer-events: none;
        }
        .cr-top-float-bar > * { pointer-events: auto; }
        .cr-score-badge {
            background: rgba(255,255,255,0.9); color: #000; border: 1px solid #ddd; padding: 6px 15px; border-radius: 20px; font-weight: bold; font-family: monospace; font-size: 14px; box-shadow: 0 2px 10px rgba(0,0,0,0.05); transition: all 0.3s;
        }
        .night-mode .cr-score-badge { background: rgba(30,30,30,0.9); color: #fff; border-color: #444; }
        
        .cr-text-p {
            font-family: var(--font-family, "Noto Serif SC", serif); font-size: 16px; line-height: 1.9; color: #333; margin-bottom: 20px;
            opacity: 0; transform: translateY(10px); transition: opacity 0.8s ease, transform 0.8s ease; text-align: justify; width: 100%; max-width: 600px;
        }
        .cr-text-p.visible { opacity: 1; transform: translateY(0); }
        .night-mode .cr-text-p { color: #ddd; }
        .cr-system-text { color: #888; font-style: italic; text-align: center; font-size: 14px; margin-bottom: 20px; }
        
        .cr-options-box { width: 100%; max-width: 600px; margin-top: 20px; display: none; flex-direction: column; gap: 12px; animation: fadeIn 0.5s ease; }
        .cr-option-btn { background: #fff; border: 1px solid #000; color: #000; padding: 15px; border-radius: 8px; font-size: 15px; cursor: pointer; transition: all 0.2s; text-align: center; box-shadow: 0 4px 0 rgba(0,0,0,0.1); }
        .cr-option-btn:active { transform: translateY(2px); box-shadow: 0 2px 0 rgba(0,0,0,0.1); background: #f9f9f9; }
        .night-mode .cr-option-btn { background: #1c1c1e; border-color: #fff; color: #fff; }
        
        .cr-input-box { width: 100%; max-width: 600px; margin-top: 20px; display: none; flex-direction: column; gap: 10px; animation: fadeIn 0.5s ease;}
        .cr-input-row { display: flex; gap: 10px; width: 100%; }
        .cr-input { flex: 1; background: #fff; border: 1px solid #ddd; border-radius: 20px; padding: 10px 15px; color: #333; font-size: 15px; outline: none; }
        .night-mode .cr-input { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2); color: #fff; }
        .cr-send-btn { background: #333; color: #fff; border: none; border-radius: 20px; padding: 0 20px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .cr-send-btn:active { transform: scale(0.95); opacity: 0.8; }
        
        .cr-history-card { background: #fff; border-radius: 16px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; cursor: pointer; position: relative; }
        .cr-history-card:active { transform: scale(0.98); }
        .wechat-dark-mode .cr-history-card { background: #1c1c1e; border-color: #333; }
        .cr-loading-indicator { color: #999; text-align: center; font-size: 13px; margin-top: 20px; }
    `;
    document.head.appendChild(style);
}

function injectCRDomElements() {
    const html = `
    <div id="crCharSelectScreen" class="page">
        <div class="nav-bar cr-nav-bar">
            <button class="nav-btn" onclick="backToDreamModeSelect()"><i class="ri-arrow-left-s-line"></i></button>
            <div class="nav-title">选择降临对象</div>
            <div></div>
        </div>
        <div class="wechat-content" style="background: #fff; padding-top: 74px;">
            <div id="crCharList" class="dream-grid-container"></div>
        </div>
    </div>

    <div id="crListScreen" class="page">
        <div class="nav-bar cr-nav-bar">
            <button class="nav-btn" onclick="backToCRCharSelect()"><i class="ri-arrow-left-s-line"></i></button>
            <div class="nav-title" id="crListTitle">穿越记录</div>
            <button class="nav-btn nav-right-action-btn" onclick="openCRSetupModal()">
                <i class="ri-add-line" style="font-size: 24px; color: #000;"></i>
            </button>
        </div>
        <div class="wechat-content" style="background: #f7f7f7; padding: 20px; padding-top: 84px;">
            <div id="crHistoryList"></div>
        </div>
    </div>

    <div id="crSetupModal" class="modal" style="z-index: 10000;">
        <div class="modal-content">
            <div class="modal-title" style="color: #333; border-bottom: 1px solid #eee; padding-bottom:10px; margin-bottom:20px;">建立现实锚点</div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="font-size:13px; color:#666; margin-bottom:5px; display:block;">你最近遇到的难过/崩溃的事</label>
                <textarea id="crSadEventInput" class="modal-textarea" placeholder="例如：今天工作搞砸了被当众大骂，感觉好无助..." style="min-height: 80px; background:#f9f9f9; border-color:#eee; color:#333;"></textarea>
            </div>
            <div class="form-group" style="margin-bottom: 15px;">
                <label style="font-size:13px; color:#666; margin-bottom:5px; display:block;">你现实生活中的真实人设/境遇</label>
                <textarea id="crRealPersonaInput" class="modal-textarea" placeholder="例如：一个普通的社畜，长相平平，平时总是戴着坚强的面具..." style="min-height: 80px; background:#f9f9f9; border-color:#eee; color:#333;"></textarea>
            </div>
            <div class="form-group" style="margin-bottom: 25px;">
                <label style="font-size:13px; color:#666; margin-bottom:5px; display:block;">首发降临BGM</label>
                <select id="crMusicSelect" class="form-select arrow-select" style="background:#f9f9f9; border-color:#eee; color:#333;">
                    ${CR_PLAYLIST.map((song, i) => `<option value="${i}">${song.name}</option>`).join('')}
                </select>
            </div>
            <div class="modal-buttons">
                <button class="modal-btn modal-btn-cancel" onclick="document.getElementById('crSetupModal').classList.remove('show')">放弃</button>
                <button class="modal-btn modal-btn-confirm" onclick="startCRGame()" style="background:#000; color:#fff;">开启穿越</button>
            </div>
        </div>
    </div>

    <div id="crPlayScreen" class="page">
        <div class="cr-top-float-bar">
            <button class="nav-btn" onclick="exitCRPlay()" style="background: rgba(0,0,0,0.1); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                <i class="ri-arrow-left-s-line" style="color: #666; font-size: 24px;"></i>
            </button>
            <div class="cr-score-badge" id="crScoreDisplay">奇迹值: 0/100</div>
            <button class="nav-btn" onclick="toggleCRSettings()" style="background: rgba(0,0,0,0.1); border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(5px);">
                <i class="ri-settings-3-line" style="color: #666; font-size: 20px;"></i>
            </button>
        </div>

        <div id="crSettingsPanel" class="dream-settings-panel" style="top: 65px;">
            <div class="dream-setting-row">
                <span>显示模式</span>
                <div class="dream-mode-switch">
                    <div class="mode-btn active" onclick="setCRTheme('day', this)"><i class="ri-sun-line"></i></div>
                    <div class="mode-btn" onclick="setCRTheme('night', this)"><i class="ri-moon-line"></i></div>
                </div>
            </div>
            <div class="dream-setting-row column" style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #eee;">
                <span>进度存档 (仅限当前故事)</span>
                <div id="crSaveSlotsContainer" class="dream-save-grid"></div>
            </div>
        </div>

        <div id="crPlayArea" class="cr-play-area" onclick="handleCRTap()">
            <div id="crContentBox" style="width: 100%; max-width: 600px;"></div>
            
            <div id="crOptionsBox" class="cr-options-box"></div>
            
            <div id="crInputBox" class="cr-input-box">
                <div id="crInputHint" style="color:#888; font-size:12px; text-align:center;">写下你的举动：</div>
                <div class="cr-input-row">
                    <input type="text" id="crActionInput" class="cr-input" placeholder="例如：我忍不住抱住了他...">
                    <button class="cr-send-btn" onclick="submitCRUserAction(event)">回应</button>
                </div>
            </div>

            <div class="dream-tap-hint" id="crTapHint">点击屏幕继续...</div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
}

function injectCREntryButton() {
    const container = document.querySelector('#dreamModeSelectModal .form-group');
    if (container && !document.getElementById('btnCrossReality')) {
        const btnHtml = `
        <div id="btnCrossReality" onclick="openCRCharSelect()" style="background: #fdf5e6; padding: 15px; border-radius: 12px; cursor: pointer; border: 1px solid #f5deb3; margin-top: 15px;">
            <div style="font-weight: bold; font-size: 16px; color: #8b4513; margin-bottom: 5px;">
                <i class="ri-door-open-line"></i> 穿越现实 (高虐/治愈)
            </div>
            <div style="font-size: 12px; color: #a0522d; line-height: 1.4;">
                当系统告诉他，你只是一串数据外的真实人类，且此刻正坠入深渊。他愿用什么代价换取一次跨越次元的拥抱？
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', btnHtml);
    }
}

// --- 4. 页面导航逻辑 ---

window.backToDreamModeSelect = function() {
    setActivePage('chatScreen');
    document.getElementById('dreamModeSelectModal').classList.add('show');
}

window.openCRCharSelect = function() {
    document.getElementById('dreamModeSelectModal').classList.remove('show');
    setActivePage('crCharSelectScreen');
    
    const container = document.getElementById('crCharList');
    container.innerHTML = '';
    const aiFriends = friends.filter(f => !f.isGroup);
    
    aiFriends.forEach(friend => {
        const item = document.createElement('div');
        item.className = 'dream-char-card';
        const avatarHtml = friend.avatarImage 
            ? `<div class="dream-card-avatar" style="background-image: url('${friend.avatarImage}')"></div>`
            : `<div class="dream-card-avatar" style="background: #333;">${friend.name[0]}</div>`;
        item.innerHTML = `${avatarHtml}<div class="dream-card-name">${friend.name}</div><div class="dream-card-hint">选择他降临</div>`;
        item.onclick = () => openCRList(friend.id);
        container.appendChild(item);
    });
}

window.backToCRCharSelect = function() { setActivePage('crCharSelectScreen'); }

window.openCRList = function(friendId) {
    crState.currentFriendId = friendId;
    const friend = friends.find(f => f.id === friendId);
    document.getElementById('crListTitle').textContent = `${friend.name} 的穿越记录`;
    setActivePage('crListScreen');
    renderCRHistoryList();
}

window.openCRSetupModal = function() {
    document.getElementById('crSadEventInput').value = '';
    document.getElementById('crRealPersonaInput').value = '';
    document.getElementById('crMusicSelect').value = '0';
    document.getElementById('crSetupModal').classList.add('show');
}

// --- 5. 核心游戏流转 ---

window.startCRGame = async function() {
    const sadEvent = document.getElementById('crSadEventInput').value.trim();
    const realPersona = document.getElementById('crRealPersonaInput').value.trim();
    const songIndex = parseInt(document.getElementById('crMusicSelect').value);

    if (!sadEvent || !realPersona) return showAlert("请填写完整的现实遭遇与人设。");
    
    document.getElementById('crSetupModal').classList.remove('show');
    
    const newSession = {
        id: `cr_${Date.now()}`,
        title: `现实降临 - ${new Date().toLocaleDateString()}`,
        sadEvent, realPersona,
        score: 0, itemRetrieved: false, exchangedItem: '',
        contentLog: [], readIndex: 0, isFinished: false,
        nextInteractionType: null, // "predict", "input", "end"
        tempOptions: null,
        interactionHint: "",
        saves: [null, null, null],
        timestamp: new Date().toISOString(),
        storyLog: [] 
    };
    
    const friend = friends.find(f => f.id === crState.currentFriendId);
    if (!friend.crHistory) friend.crHistory = [];
    friend.crHistory.unshift(newSession);
    await saveData();

    crState.session = newSession;
    crState.currentSongIndex = songIndex;

    enterCRPlayScreen(true);
    // 开始第一回合生成
    await generateCRStory(true);
}

window.continueCRGame = function(sessionId) {
    const friend = friends.find(f => f.id === crState.currentFriendId);
    const session = friend.crHistory.find(s => s.id === sessionId);
    if (!session) return;
    crState.session = session;
    crState.currentSongIndex = 0; 
    enterCRPlayScreen(false);
}

window.deleteCRGame = async function(event, sessionId) {
    event.stopPropagation();
    showConfirm("确定要删除这条穿越记录吗？", async (yes) => {
        if (!yes) return;
        const friend = friends.find(f => f.id === crState.currentFriendId);
        friend.crHistory = friend.crHistory.filter(s => s.id !== sessionId);
        await saveData();
        renderCRHistoryList();
    });
}

function renderCRHistoryList() {
    const container = document.getElementById('crHistoryList');
    container.innerHTML = '';
    const friend = friends.find(f => f.id === crState.currentFriendId);
    const history = friend.crHistory || [];
    
    if (history.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:50px; color:#999;">暂无降临记录<br>点击右上角 + 号开启通道</div>';
        return;
    }

    history.forEach(session => {
        const item = document.createElement('div');
        item.className = 'cr-history-card';
        item.onclick = () => continueCRGame(session.id);
        
        const status = session.isFinished ? '<span style="color:#999;">[已完结]</span>' : '<span style="color:#07c160;">[进行中]</span>';
        const preview = session.contentLog.length > 0 ? session.contentLog[0].content.substring(0, 40) + '...' : '等待降临...';
        
        item.innerHTML = `
            <div style="font-size: 16px; font-weight: bold; margin-bottom: 8px;">${session.title} ${status}</div>
            <div style="font-size: 13px; color: #666; line-height: 1.5; margin-bottom: 10px;">${preview}</div>
            <div style="font-size: 11px; color: #aaa; text-align: right;">奇迹值: ${session.score}/100</div>
            <div onclick="deleteCRGame(event, '${session.id}')" style="position: absolute; top: 20px; right: 20px; color: #ccc; font-size: 18px;"><i class="ri-delete-bin-line"></i></div>
        `;
        container.appendChild(item);
    });
}

// --- 6. 播放器界面控制 ---

function enterCRPlayScreen(isNew) {
    setActivePage('crPlayScreen');
    document.querySelector('.phone').classList.add('status-bar-hidden');
    
    crState.audioPlayer.src = CR_PLAYLIST[crState.currentSongIndex].url;
    crState.audioPlayer.play().catch(e => console.log("等待用户交互播放"));

    document.getElementById('crContentBox').innerHTML = '';
    document.getElementById('crOptionsBox').style.display = 'none';
    document.getElementById('crInputBox').style.display = 'none';
    
    crState.textQueue = [];
    updateCRScoreUI();

    if (!isNew && crState.session.contentLog) {
        crState.session.contentLog.forEach((log, index) => {
            if (index < crState.session.readIndex) {
                renderCRParagraph(log.content, log.isSystem, false);
            } else {
                crState.textQueue.push(log);
            }
        });
        
        setTimeout(() => document.getElementById('crPlayArea').scrollTo({ top: 9999, behavior: 'smooth' }), 100);
        
        if (crState.textQueue.length > 0) {
            document.getElementById('crTapHint').style.display = 'block';
        } else if (!crState.session.isFinished) {
            triggerCurrentInteraction();
        }
    }
}

window.exitCRPlay = function() {
    crState.audioPlayer.pause();
    crState.audioPlayer.src = "";
    document.getElementById('crSettingsPanel').classList.remove('show');
    applyStatusBarVisibility();
    openCRList(crState.currentFriendId);
}

function updateCRScoreUI() {
    const score = crState.session.score || 0;
    const display = document.getElementById('crScoreDisplay');
    display.textContent = `奇迹值: ${score}/100`;
    if (score >= 100) display.style.color = '#07c160';
    else display.style.color = '#ffca28';
}

window.toggleCRSettings = function() {
    const panel = document.getElementById('crSettingsPanel');
    panel.classList.toggle('show');
    if (panel.classList.contains('show')) renderCRSaveSlots();
}

window.setCRTheme = function(mode, btn) {
    crState.isNightMode = (mode === 'night');
    document.querySelectorAll('.dream-mode-switch .mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    const playArea = document.getElementById('crPlayArea');
    const panel = document.getElementById('crSettingsPanel');
    
    if (crState.isNightMode) {
        playArea.classList.add('night-mode');
        panel.classList.add('dream-night-mode-panel');
    } else {
        playArea.classList.remove('night-mode');
        panel.classList.remove('dream-night-mode-panel');
    }
}

function createLoadingIndicator(text) {
    const p = document.createElement('div');
    p.className = 'cr-text-p visible cr-loading-indicator';
    p.innerHTML = `<i class="ri-loader-4-line fa-spin"></i> ${text}`;
    document.getElementById('crContentBox').appendChild(p);
    const area = document.getElementById('crPlayArea');
    if (area) setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);
    return p;
}

// --- 7. 阅读与交互流转 ---

window.handleCRTap = function() {
    const panel = document.getElementById('crSettingsPanel');
    if (panel.classList.contains('show')) { panel.classList.remove('show'); return; }

    if (crState.isGenerating) return;

    // 如果队列空了
    if (crState.textQueue.length === 0) {
        if (crState.session.isFinished) return;
        
        // 检查是否有未完成的交互状态
        if (crState.session.nextInteractionType) {
            triggerCurrentInteraction();
        } else {
            // 没有待处理的交互，说明刚交互完，或者出bug了，总之触发生成下一段
            generateCRStory(false);
        }
        return;
    }

    // 从队列取出并显示
    const nextLog = crState.textQueue.shift();
    renderCRParagraph(nextLog.content, nextLog.isSystem, true);
    
    crState.session.readIndex++;
    saveData();

    if (crState.textQueue.length === 0) {
        document.getElementById('crTapHint').style.display = 'none';
        setTimeout(handleCRTap, 400); // 稍微延迟后自动进入下一步判断
    }
}

function renderCRParagraph(text, isSystem, animate) {
    const box = document.getElementById('crContentBox');
    const p = document.createElement('div');
    p.className = isSystem ? 'cr-system-text cr-text-p' : 'cr-text-p';
    
    if (text.startsWith('> (你的回应：') || text.startsWith('> (你的预测：')) {
        p.style.color = '#81d4fa';
        p.style.textAlign = 'right';
        p.style.fontStyle = 'italic';
    }
    
    p.innerHTML = text.replace(/\n/g, '<br>');
    box.appendChild(p);

    if (animate) {
        void p.offsetWidth;
        p.classList.add('visible');
        const area = document.getElementById('crPlayArea');
        setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);
    } else {
        p.classList.add('visible');
    }
}

// 触发当前设定的 UI 交互
function triggerCurrentInteraction() {
    const type = crState.session.nextInteractionType;
    const hint = crState.session.interactionHint || "请做出你的选择";

    if (type === 'predict') {
        showCROptions(crState.session.tempOptions, hint);
    } else if (type === 'input') {
        showCRInput(hint);
    } else if (type === 'end') {
        handleLocalEnding();
    }
}

function showCROptions(options, hintText) {
    if (!options || options.length === 0) return;
    const box = document.getElementById('crOptionsBox');
    box.innerHTML = `<div style="color:#aaa; font-size:12px; text-align:center; margin-bottom:10px;">${hintText} (猜对+5奇迹值)</div>`;
    
    options.forEach(opt => {
        const btn = document.createElement('div');
        btn.className = 'cr-option-btn';
        btn.textContent = opt.text;
        btn.onclick = (e) => { e.stopPropagation(); handleCRPrediction(opt); };
        box.appendChild(btn);
    });

    box.style.display = 'flex';
    document.getElementById('crInputBox').style.display = 'none';
    
    const area = document.getElementById('crPlayArea');
    setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);
}

function showCRInput(hintText) {
    document.getElementById('crActionInput').value = '';
    document.getElementById('crInputHint').textContent = hintText;
    document.getElementById('crOptionsBox').style.display = 'none';
    document.getElementById('crInputBox').style.display = 'flex';
    
    const area = document.getElementById('crPlayArea');
    setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);
}

function handleLocalEnding() {
    const box = document.getElementById('crOptionsBox');
    box.innerHTML = '';
    const exitBtn = document.createElement('div');
    exitBtn.className = 'cr-option-btn';
    exitBtn.style.textAlign = 'center';
    exitBtn.style.background = '#000';
    exitBtn.style.color = '#fff';
    exitBtn.textContent = "幻梦终醒，回到日常";
    exitBtn.onclick = (e) => { e.stopPropagation(); exitCRPlay(); };
    box.appendChild(exitBtn);
    box.style.display = 'flex';
    
    crState.session.isFinished = true;
    crState.session.nextInteractionType = null;
    saveData();
}

// --- 8. 统一的剧情生成引擎 (AI API) ---

async function callCR_API(prompt) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) throw new Error("API未配置");

    const response = await fetch(`${settings.apiUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: settings.modelName,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.9 // 保持创造性
        })
    });

    if (!response.ok) throw new Error(`API 错误: ${response.status}`);
    const data = await response.json();
    const contentStr = data.choices[0].message.content;
    
    const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("返回格式非JSON");
    
    return JSON.parse(jsonMatch[0]);
}

/**
 * 核心引擎：处理所有的剧情推演、选项生成和互动类型决定
 * @param {boolean} isInitial - 是否是第一次穿越开场
 */
async function generateCRStory(isInitial = false) {
    crState.isGenerating = true;
    const loaderMsg = isInitial ? "次元壁突破中，正在建立连结..." : "时空锚点波动，正在推演世界线...";
    const loader = createLoadingIndicator(loaderMsg);
    
    const friend = friends.find(f => f.id === crState.currentFriendId);
    const session = crState.session;

    // 提取上下文
    const fullStory = session.storyLog.join('\n');
    const contextStr = fullStory.length > 4000 ? fullStory.slice(-4000) : fullStory;
    
    const endingInstruction = "【剧情节奏控制】：请尽情展开细节描写，不要急于结束。只有当你们之间的情感彻底宣泄、或者剧情自然发展到必须离别的时刻，才可以将 `next_interaction_type` 设置为 \"end\" 触发结局。否则请一直保持 \"predict\" 或 \"input\" 让故事无限延续。";

    // 初始剧情特殊设定（修复时间线：悲剧已发生，事后救赎）
    const initialInstruction = isInitial
        ? `
【系统设定与开场任务】：
在极其普通的一天，冷酷的系统切断了 "${friend.name}" 所在世界的时间流。
系统告诉他残酷的真相：“你日夜牵挂的用户，在现实中只是个普通人。她刚刚经历了巨大的打击，此刻正独自舔舐伤口，坠入深渊。”
现实中的你：${session.realPersona}
你刚刚经历的惨痛遭遇（已结束）：${session.sadEvent}
系统提出交易：“交出你在当前世界最重要的一样东西，换取一次去现实拥抱她的机会。”

1. 详细描写他听到真相、看到你事后崩溃孤立无援画面时的震惊与心碎。
2. 写出他毫不犹豫答应，并在 \`exchanged_item\` 字段中创造性地写出他献祭了什么。
3. 描写他跨越维度，降临在你身边的第一幕。（【铁律】：他降临时，那件悲伤的事情**已经发生完了**，你正独自一人沉浸在事后的难过、委屈与崩溃中，他来给你无声的陪伴与救赎）。
` : "";

    const prompt = `
【模式】：打破第四面墙，逆向穿越虐心治愈文。
【角色】："${friend.name}" (人设: ${friend.role})。
【视角】：严格使用**第三人称**（“他”）描写角色，描写用户时使用第二人称“你”。
【文风铁律】：晋江现言救赎风。**必须分 8 到 15 个极其细碎的自然段落**！每一段只写一两句话，大量运用白描、眼神交汇、细微动作语言描写和克制的心痛感。禁止大段文字堆砌。

${initialInstruction}
${!isInitial ? `【迄今为止的剧情回顾】:\n${contextStr}` : ""}
${endingInstruction}

【动态交互机制 (核心任务)】：
在推动完本轮剧情后，你必须作为导演决定接下来的互动方式。
**【极度重要】：本游戏以用户自由输入互动为主！请尽量创造让用户自由说话、哭泣或做动作的机会！**
1. **主要交互 (强烈推荐使用 "input")**：若剧情推进到他正心疼地看着你、抱着你、等待你回应，或到了你必须发泄/开口说话的时刻，请务必将 \`next_interaction_type\` 设为 "input"。此时不需要生成选项。
2. **次要交互 (偶尔使用 "predict")**：只有当他接下来要做某个【出人意料的举动】（如突然吻你、突然变出某个东西），需要考验你们的默契时，才将 \`next_interaction_type\` 设为 "predict"，并提供3个选项让用户猜（1对2错）。
3. 结局交互：若情感彻底宣泄完毕，必须离别时，设为 "end"。

【输出JSON格式 (严格遵守)】：
{
  ${isInitial ? `"exchanged_item": "他献祭的具体事物(简短描述)",` : ""}
  "segments": [
    "第一段极短的环境/心理描写...",
    "第二段细微的动作描写...",
    "...直到第15段"
  ],
  "next_interaction_type": "input", // 强烈建议多填 "input"，少数情况填 "predict" 或 "end"
  "interaction_hint": "这里写给用户的UI提示语，如 '预测他下一步的动作' 或 '面对他，写下你的举动或话语...'",
  "options": [
    // 【警告】：只有当 type 严格为 "predict" 时才填写此数组。如果是 "input" 或 "end"，这里【必须是空数组 []】！！！
    { "text": "预测动作A", "is_correct": true, "reaction": "预测成功后的后续剧情..." },
    { "text": "预测动作B", "is_correct": false, "reaction": "预测失败，他实际上..." }
  ]
}`;

    try {
        const result = await callCR_API(prompt);
        loader.remove();

        // 1. 如果是第一次，记录献祭物品
        if (isInitial && result.exchanged_item) {
            session.exchangedItem = result.exchanged_item;
            session.storyLog.push(`【系统告知真相，角色献祭了 ${result.exchanged_item} 降临现实】`);
        }

        // 2. 推入段落队列
        result.segments.forEach((seg, i) => {
            const isSys = isInitial && i === 0 && seg.includes("【系统");
            session.contentLog.push({ content: seg, isSystem: isSys, timestamp: Date.now() });
            crState.textQueue.push({ content: seg, isSystem: isSys });
            session.storyLog.push(seg);
        });

        // 3. 设置接下来的交互状态
        session.nextInteractionType = result.next_interaction_type;
        session.interactionHint = result.interaction_hint || (result.next_interaction_type === 'predict' ? "预测他的下一步动作" : "写下你的回应");
        session.tempOptions = result.options || null;

        await saveData();
        
        // 4. 触发播放
        handleCRTap(); 

    } catch (e) {
        console.error(e);
        loader.innerHTML = `时空连接不稳定: ${e.message} <br><span style="color:#007aff;cursor:pointer;" onclick="generateCRStory(${isInitial})">点击重试</span>`;
    } finally {
        crState.isGenerating = false;
    }
}

// --- 用户交互处理 ---

async function handleCRPrediction(opt) {
    document.getElementById('crOptionsBox').style.display = 'none';
    const session = crState.session;
    
    // 1. 计分与反馈
    if (opt.is_correct) {
        session.score += 5;
        showToast("预测正确！奇迹值 +5", 2000);
    } else {
        session.score = Math.max(0, session.score - 5);
        showToast("预测偏差... 奇迹值 -5", 2000);
    }
    updateCRScoreUI();
    
    // 2. 记入日志与队列
    const userPredictLog = `> (你的预测：${opt.text})`;
    session.contentLog.push({ content: userPredictLog, isSystem: true, timestamp: Date.now() });
    crState.textQueue.push({ content: userPredictLog, isSystem: true });
    
    session.contentLog.push({ content: opt.reaction, isSystem: false, timestamp: Date.now() });
    crState.textQueue.push({ content: opt.reaction, isSystem: false });
    session.storyLog.push(`【你的预测】：${opt.text}。\n【实际发展】：${opt.reaction}`);
    
    // 3. 奇迹触发 (满100分拿回物品)
    if (session.score >= 100 && !session.itemRetrieved) {
        session.itemRetrieved = true;
        const miracleLog = `【系统公告】：奇迹共鸣达到顶峰！世界法则被扭曲，被献祭的 [${session.exchangedItem}] 重新回到了他的灵魂之中！`;
        session.contentLog.push({ content: miracleLog, isSystem: true, timestamp: Date.now() });
        crState.textQueue.push({ content: miracleLog, isSystem: true });
        session.storyLog.push(miracleLog);
    }

    // 4. 清理当前交互状态，触发后续生成
    session.tempOptions = null;
    session.nextInteractionType = null; 
    await saveData();
    
    handleCRTap();
}

window.submitCRUserAction = async function(e) {
    e.stopPropagation();
    const input = document.getElementById('crActionInput');
    const action = input.value.trim();
    if (!action) return;

    const session = crState.session;
    document.getElementById('crInputBox').style.display = 'none';
    
    // 1. 记入日志与队列
    const userActionLog = `> (你的回应：${action})`;
    session.contentLog.push({ content: userActionLog, isSystem: true, timestamp: Date.now() });
    crState.textQueue.push({ content: userActionLog, isSystem: true });
    session.storyLog.push(`【你的真实回应】：${action}`);
    
    // 2. 清理状态
    input.value = '';
    session.tempOptions = null; 
    session.nextInteractionType = null;
    
    await saveData();
    showToast("已回应", 1500);

    // 3. 触发后续生成
    handleCRTap();
}

// --- 9. 存档与读档 ---
function renderCRSaveSlots() {
    const container = document.getElementById('crSaveSlotsContainer');
    if (!container) return;
    container.innerHTML = '';

    for (let i = 0; i < 3; i++) {
        const saveData = crState.session.saves[i];
        let timeStr = "空存档";
        let hasData = false;

        if (saveData) {
            const d = new Date(saveData.saveTime);
            timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
            hasData = true;
        }

        const div = document.createElement('div');
        div.className = 'save-slot-item';
        div.style.cssText = 'display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.05); padding:10px; border-radius:8px; margin-bottom:8px; border:1px solid rgba(255,255,255,0.1);';
        div.innerHTML = `
            <div class="save-slot-info">
                <div class="slot-title" style="font-size:14px; font-weight:bold;">存档位 ${i + 1}</div>
                <div class="slot-time" style="font-size:12px; color:#888;">${timeStr}</div>
            </div>
            <div class="slot-actions" style="display:flex; gap:10px;">
                <div class="slot-btn save" onclick="handleCRSave(${i})" title="保存" style="cursor:pointer;"><i class="ri-save-3-line"></i></div>
                <div class="slot-btn load ${hasData ? '' : 'disabled'}" onclick="handleCRLoad(${i})" title="读取" style="cursor:pointer; opacity:${hasData?1:0.3};"><i class="ri-download-cloud-2-line"></i></div>
            </div>
        `;
        container.appendChild(div);
    }
}

window.handleCRSave = async function(slotIndex) {
    if (crState.session.saves[slotIndex]) {
        if (!confirm(`存档位 ${slotIndex + 1} 已有数据，确定覆盖吗？`)) return;
    }
    const snapshot = {
        saveTime: new Date().toISOString(),
        contentLog: JSON.parse(JSON.stringify(crState.session.contentLog)),
        storyLog: JSON.parse(JSON.stringify(crState.session.storyLog)),
        readIndex: crState.session.readIndex,
        isFinished: crState.session.isFinished,
        tempOptions: crState.session.tempOptions ? JSON.parse(JSON.stringify(crState.session.tempOptions)) : null,
        nextInteractionType: crState.session.nextInteractionType,
        interactionHint: crState.session.interactionHint,
        score: crState.session.score,
        itemRetrieved: crState.session.itemRetrieved
    };
    crState.session.saves[slotIndex] = snapshot;
    await saveData();
    renderCRSaveSlots();
    showToast(`进度已保存至存档 ${slotIndex + 1}`);
}

window.handleCRLoad = async function(slotIndex) {
    const save = crState.session.saves[slotIndex];
    if (!save) return;
    if (!confirm(`确定读取存档 ${slotIndex + 1} 吗？未保存进度将丢失。`)) return;

    crState.session.contentLog = JSON.parse(JSON.stringify(save.contentLog));
    crState.session.storyLog = JSON.parse(JSON.stringify(save.storyLog || []));
    crState.session.readIndex = save.readIndex;
    crState.session.isFinished = save.isFinished;
    crState.session.tempOptions = save.tempOptions ? JSON.parse(JSON.stringify(save.tempOptions)) : null;
    crState.session.nextInteractionType = save.nextInteractionType;
    crState.session.interactionHint = save.interactionHint;
    crState.session.score = save.score;
    crState.session.itemRetrieved = save.itemRetrieved;

    document.getElementById('crSettingsPanel').classList.remove('show');
    await saveData();
    enterCRPlayScreen(false);
    showToast(`已读取存档 ${slotIndex + 1}`);
}