/**
 * ============================================================================
 * 同人App - 穿进同人文 (Transmigrate System) 插件
 * 包含完整的 HTML注入、CSS样式、AI逻辑与交互
 * (黑白极简UI版 + 提示词设置 + 自定义温度 + 去八股强化版 + 路人旁观防混淆版)
 * ============================================================================
 */

// ==========================================
// 1. 全局变量与状态管理
// ==========================================
let tm_records = []; 
let tm_currentSession = null; 
let tm_textQueue = []; 
let tm_isGenerating = false; 
let tm_tempBookId = null; 
let tm_tempRoleType = null; 
let tm_tempCustomIdentity = ""; 

// ==========================================
// 2. 动态注入 HTML 和 CSS
// ==========================================
function tm_injectUI() {
    // --- CSS 注入 ---
    const style = document.createElement('style');
    style.textContent = `
        /* 穿书记录列表页 */
        #tmListScreen { background-color: #f4f5f7; z-index: 105; padding-bottom: 0; }
        .tm-record-card {
            background: #fff; border-radius: 12px; padding: 20px; margin-bottom: 15px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03); border: 1px solid #eee;
            cursor: pointer; position: relative; transition: transform 0.2s;
        }
        .tm-record-card:active { transform: scale(0.98); }
        .tm-card-title { font-size: 18px; font-weight: bold; color: #000; margin-bottom: 8px; }
        .tm-card-role { font-size: 12px; background: #f0f0f0; color: #333; padding: 3px 8px; border-radius: 12px; display: inline-block; margin-bottom: 10px; font-weight: bold; }
        .tm-card-node { font-size: 14px; color: #555; line-height: 1.5; margin-bottom: 10px; }
        .tm-card-meta { border-top: 1px dashed #eee; padding-top: 10px; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
        .tm-delete-btn { position: absolute; top: 15px; right: 15px; color: #ccc; padding: 5px; cursor: pointer; transition: color 0.2s; }
        .tm-delete-btn:active { color: #000; }
        
        /* 阅读器界面 (晋江风) */
        #tmPlayScreen { background-color: #F2EBE1; z-index: 2000; }
        .tm-reader-area {
            width: 100%; height: 100%; padding: 60px 20px 40px;
            overflow-y: auto; box-sizing: border-box;
            background-color: transparent;
            color: #333; 
            font-family: var(--font-family, "Noto Serif SC", serif) !important; /* 强制跟随主题字体 */
            position: relative;
            background-size: cover; background-position: center;
        }
        .tm-paragraph {
            font-size: 17px; line-height: 2.0; text-indent: 2em;
            margin-bottom: 24px; text-align: justify;
            opacity: 0; transform: translateY(10px);
            transition: opacity 0.6s ease, transform 0.6s ease;
        }
        .tm-paragraph.visible { opacity: 1; transform: translateY(0); }
        
        /* 原著文字样式 (与新生成的一模一样，只是没有动画) */
        .tm-paragraph.original-text {
            opacity: 1; transform: translateY(0);
            transition: none;
        }
        
        /* 用户的行动文本样式 (黑白极简) */
        .tm-paragraph.user-action {
            color: #000; font-weight: bold; text-indent: 0; 
            background: #fcfcfc; padding: 12px 15px; border-radius: 8px; border-left: 4px solid #000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02); margin-top: 10px; margin-bottom: 30px;
            border-top: 1px solid #eee; border-right: 1px solid #eee; border-bottom: 1px solid #eee;
        }
        
        /* 穿越分割线 */
        .tm-transmigrate-divider {
            text-align: center; color: #999; letter-spacing: 2px; margin: 40px 0 50px 0; 
            font-size: 12px; display: flex; align-items: center; justify-content: center; gap: 10px;
            font-family: sans-serif;
        }
        .tm-transmigrate-divider span { flex: 1; height: 1px; background: #ddd; }
        .tm-transmigrate-divider i { font-size: 16px; color: #000; }
        
        /* 融入正文末尾的内联输入框 (黑白极简) */
        .tm-inline-input-box {
            background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(8px);
            border: 1px dashed #aaa; border-radius: 12px; padding: 20px;
            margin-top: 30px; margin-bottom: 60px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            animation: fadeIn 0.5s ease;
        }
        .tm-action-input {
            width: 100%; background: transparent; border: none; 
            font-size: 16px; outline: none; resize: none; color: #000;
            font-family: inherit; line-height: 1.6; min-height: 40px;
        }
        .tm-action-input::placeholder { color: #bbb; }
        
        /* 背景设置面板 */
        .tm-settings-panel {
            position: absolute; top: 55px; right: 15px; 
            background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); 
            padding: 15px; border-radius: 16px; box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
            z-index: 2020; display: none; width: 220px; border: 1px solid #f0f0f0;
        }
        .tm-bg-btn { 
            width: 36px; height: 36px; border-radius: 50%; cursor: pointer; 
            border: 2px solid transparent; transition: transform 0.2s;
        }
        .tm-bg-btn:active { transform: scale(0.9); }
        .tm-bg-btn.active { border-color: #000; box-shadow: 0 0 8px rgba(0, 0, 0, 0.2); }

        .tm-tap-hint {
            text-align: center; font-size: 13px; color: #999; animation: pulse 2s infinite; 
            padding: 20px 0; margin-bottom: 40px;
        }

        /* 模态框网格和列表 */
        .tm-book-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; max-height: 50vh; overflow-y: auto; padding: 5px;}
        .tm-book-item { background: #f9f9f9; border: 1px solid #eee; border-radius: 8px; padding: 8px; text-align: center; cursor: pointer; transition: 0.2s;}
        .tm-book-item:active, .tm-book-item.selected { border-color: #000; background: #f0f0f0; }
        .tm-book-item img { width: 100%; aspect-ratio: 3/4; object-fit: cover; border-radius: 4px; margin-bottom: 5px; }
        .tm-book-title { font-size: 11px; font-weight: bold; color: #000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .tm-role-btn { display: block; width: 100%; padding: 15px; background: #f9f9f9; border: 1px solid #eee; border-radius: 12px; margin-bottom: 10px; text-align: left; cursor: pointer; color: #333; transition: 0.2s;}
        .tm-role-btn:active, .tm-role-btn.selected { background: #f0f0f0; border-color: #000; }
        .tm-role-btn strong { display: block; font-size: 16px; margin-bottom: 4px; color: #000; }
        .tm-role-btn span { font-size: 12px; color: #888; }

        .tm-node-item { background: #fff; border: 1px solid #eee; border-left: 4px solid #000; border-radius: 10px; padding: 15px; margin-bottom: 12px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.02); transition: 0.2s;}
        .tm-node-item:active { background: #f5f5f5; transform: scale(0.98); }
        .tm-node-title { font-weight: bold; font-size: 15px; margin-bottom: 5px; color: #000; }
        .tm-node-desc { font-size: 13px; color: #666; line-height: 1.5; }
    `;
    document.head.appendChild(style);

    // --- HTML 注入 ---
    const mountDiv = document.createElement('div');
    mountDiv.innerHTML = `
        <!-- 1. 穿书记录列表页 -->
        <div id="tmListScreen" class="page page-container">
            <div class="nav-bar" style="background: #fff; border-bottom: 1px solid #eee;">
                <button class="nav-btn" onclick="tm_backToMyPage()"><i class="ri-arrow-left-s-line"></i></button>
                <div class="nav-title" style="color: #000; font-weight: 800;">时空管理局</div>
                <!-- 提示词与新建按钮 -->
                <div style="display:flex; align-items:center; gap: 5px;">
                    <button class="nav-btn nav-right-action-btn" onclick="tm_openPromptModal()" style="font-size: 20px; color: #000;" title="提示词设置">
                        <i class="ri-settings-3-line"></i>
                    </button>
                    <button class="nav-btn nav-right-action-btn" onclick="tm_openSelectBookModal()" style="font-size: 24px; color: #000;" title="新建穿越">
                        <i class="ri-add-line"></i>
                    </button>
                </div>
            </div>
            <div class="content" id="tmRecordListContainer" style="overflow-y: auto; height: 100%; padding-top: 74px; padding-bottom: 20px;"></div>
        </div>

        <!-- 2. 阅读/沉浸页 -->
        <div id="tmPlayScreen" class="page">
            <!-- 悬浮透明导航栏 -->
            <div class="nav-bar" style="background: transparent; border: none; z-index: 2010; position: absolute; top:0; width:100%;">
                <button class="nav-btn" onclick="tm_exitPlayScreen()" style="background: rgba(255,255,255,0.6); border-radius: 50%; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.05);">
                    <i class="ri-arrow-left-s-line" style="font-size: 20px; color: #000;"></i>
                </button>
                <div class="nav-title" id="tmPlayTitle" style="color: #000; font-weight: bold; text-shadow: 0 1px 2px rgba(255,255,255,0.8);">穿越中</div>
                <!-- 右侧设置按钮 -->
                <button class="nav-btn" onclick="tm_toggleSettings(event)" style="background: rgba(255,255,255,0.6); border-radius: 50%; width: 32px; height: 32px; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(4px); border: 1px solid rgba(0,0,0,0.05);">
                    <i class="ri-palette-line" style="font-size: 18px; color: #000;"></i>
                </button>
            </div>

            <!-- 背景设置面板 -->
            <div id="tmSettingsPanel" class="tm-settings-panel">
                <div style="font-size: 13px; font-weight: bold; color: #000; margin-bottom: 12px;">阅读背景</div>
                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                    <div class="tm-bg-btn" style="background: #F2EBE1;" onclick="tm_changeBg('#F2EBE1', 'color')"></div>
                    <div class="tm-bg-btn" style="background: #FFFFFF; border: 1px solid #ccc;" onclick="tm_changeBg('#FFFFFF', 'color')"></div>
                    <div class="tm-bg-btn" style="background: #CCE8CF;" onclick="tm_changeBg('#CCE8CF', 'color')"></div>
                    <div class="tm-bg-btn" style="background: #E6F7FF;" onclick="tm_changeBg('#E6F7FF', 'color')"></div>
                    <div class="tm-bg-btn" style="background: #1a1a1a;" onclick="tm_changeBg('#1a1a1a', 'color')"></div>
                    <div class="tm-bg-btn" style="background: #f9f9f9; display:flex; align-items:center; justify-content:center; border: 1px dashed #aaa;" onclick="document.getElementById('tmBgUploadInput').click()">
                        <i class="ri-image-add-line" style="color: #333;"></i>
                    </div>
                </div>
                <input type="file" id="tmBgUploadInput" accept="image/*" style="display: none;" onchange="tm_handleBgUpload(event)">
            </div>
            
            <!-- 正文区域 -->
            <div id="tmPlayArea" class="tm-reader-area" onclick="tm_handleTap(event)">
                <div id="tmContentBox"></div>
                
                <!-- 嵌入正文末尾的输入框 -->
                <div id="tmInlineInputContainer" class="tm-inline-input-box" style="display:none;">
                    <div style="font-size: 13px; color: #000; font-weight: bold; margin-bottom: 8px;"><i class="ri-edit-2-line"></i> 决定你的下一步行动：</div>
                    <textarea id="tmActionInput" class="tm-action-input" rows="1" placeholder="例如：我推开门走进去，对他说..." oninput="this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';"></textarea>
                    <div style="text-align: right; margin-top: 10px;">
                        <button onclick="tm_submitAction(event)" style="background: #000; color: #fff; border: none; padding: 8px 24px; border-radius: 20px; font-weight: bold; cursor: pointer; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">执行行动</button>
                    </div>
                </div>
                
                <div id="tmTapHint" class="tm-tap-hint" style="display:none;">点击屏幕继续阅读...</div>
            </div>
        </div>

        <!-- 模态框：提示词设置 -->
        <div id="tmPromptModal" class="modal" style="z-index: 10005;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <div class="modal-title" style="color: #000;">穿越系统提示词</div>
                <div style="font-size: 12px; color: #666; margin-bottom: 12px;">此处的指令将全局作用于时空节点生成与后续剧情续写中。</div>
                <textarea id="tmCustomPromptInput" class="modal-textarea" placeholder="例如：少一些心理描写，多一些动作细节；或者改变文章基调为黑暗惊悚风..." style="min-height: 120px; background: #f9f9f9; border: 1px solid #eee; width: 100%; box-sizing: border-box;"></textarea>
                <div class="modal-buttons" style="margin-top: 15px;">
                    <button class="modal-btn cancel" onclick="doujinHideModal('tmPromptModal')" style="background:#f0f0f0; color:#666;">取消</button>
                    <button class="modal-btn confirm" onclick="tm_saveCustomPrompt()" style="background:#000; color:white;">保存设置</button>
                </div>
            </div>
        </div>

        <!-- 模态框：1. 选择书籍 -->
        <div id="tmSelectBookModal" class="modal" style="z-index: 10000;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <div class="modal-title" style="color: #000;">选择要穿越的同人文</div>
                <div id="tmBookGrid" class="tm-book-grid"></div>
                <div class="modal-buttons" style="margin-top: 15px;">
                    <button class="modal-btn cancel" onclick="doujinHideModal('tmSelectBookModal')" style="background:#f0f0f0; color:#666;">取消</button>
                </div>
            </div>
        </div>

        <!-- 模态框：2. 选择身份 -->
        <div id="tmSelectRoleModal" class="modal" style="z-index: 10001;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <div class="modal-title" style="color: #000;">选择你的穿越身份</div>
                <div id="tmRoleList" style="max-height: 50vh; overflow-y: auto; padding: 5px;">
                    <!-- 动态生成 -->
                </div>
                <div id="tmCustomRoleInputBox" style="display:none; margin-top: 10px;">
                    <input type="text" id="tmCustomRoleInput" class="modal-input" placeholder="输入自定义身份(如：男主的恶毒继妹)" style="margin:0; background: #f5f5f5;">
                </div>
                <div class="modal-buttons" style="margin-top: 15px;">
                    <button class="modal-btn cancel" onclick="doujinHideModal('tmSelectRoleModal')" style="background:#f0f0f0; color:#666;">上一步</button>
                    <button class="modal-btn confirm" onclick="tm_confirmRole()" style="background:#000; color:white;">生成降落节点</button>
                </div>
            </div>
        </div>

        <!-- 模态框：3. 选择降落节点 -->
        <div id="tmSelectNodeModal" class="modal" style="z-index: 10002;">
            <div class="modal-content" style="max-width: 400px; width: 90%;">
                <div class="modal-title" style="color: #000;">选择时空降落点</div>
                <div style="font-size:12px; color:#999; margin-bottom:15px; text-align:center;">AI已为你截取了5个关键剧情节点</div>
                <div id="tmNodeList" style="max-height: 50vh; overflow-y: auto; padding: 5px;"></div>
                <div class="modal-buttons" style="margin-top: 15px;">
                    <button class="modal-btn cancel" onclick="doujinHideModal('tmSelectNodeModal')" style="background:#f0f0f0; color:#666;">取消</button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(mountDiv);
}

// ==========================================
// 2.5 提示词控制相关函数
// ==========================================
function tm_openPromptModal() {
    // 读取保存在用户资料里的提示词，没有则为空
    document.getElementById('tmCustomPromptInput').value = userProfile.tmCustomPrompt || "";
    doujinShowModal('tmPromptModal');
}

async function tm_saveCustomPrompt() {
    const promptText = document.getElementById('tmCustomPromptInput').value.trim();
    userProfile.tmCustomPrompt = promptText;
    await saveData(); // 调用主系统保存
    doujinHideModal('tmPromptModal');
    
    if (typeof showToast === 'function') {
        showToast("穿越提示词已保存");
    } else {
        alert("穿越提示词已保存");
    }
}

// ==========================================
// 3. 核心流程：页面导航与列表渲染
// ==========================================
function tm_openRecordListScreen() {
    if (userProfile.tmRecords) {
        tm_records = userProfile.tmRecords;
    } else {
        tm_records = [];
    }
    
    document.querySelectorAll('#doujinForumApp .page-container').forEach(page => page.classList.remove('active'));
    document.getElementById('tmListScreen').classList.add('active');
    
    const topHeader = document.querySelector('#doujinForumApp .top-header');
    const bottomNav = document.querySelector('#doujinForumApp .bottom-nav');
    if (topHeader) topHeader.style.display = 'none';
    if (bottomNav) bottomNav.classList.add('hidden');
    
    tm_renderRecordList();
}

function tm_backToMyPage() {
    document.getElementById('tmListScreen').classList.remove('active');
    const topHeader = document.querySelector('#doujinForumApp .top-header');
    if (topHeader) topHeader.style.display = 'block';
    doujinNavigateToPage('my-page'); 
}

function tm_renderRecordList() {
    const container = document.getElementById('tmRecordListContainer');
    container.innerHTML = '';
    
    if (tm_records.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 100px 20px; color: #999;">
                <i class="ri-book-open-line" style="font-size: 50px; opacity: 0.3; margin-bottom: 15px; display:block;"></i>
                <p>暂无穿越记录<br>点击右上角 + 开始一次时空之旅</p>
            </div>
        `;
        return;
    }

    tm_records.sort((a, b) => new Date(b.lastUpdate) - new Date(a.lastUpdate)).forEach(record => {
        const item = document.createElement('div');
        item.className = 'tm-record-card';
        
        let roleStr = record.roleInfo.type === 'left' || record.roleInfo.type === 'right' 
            ? `附身: ${record.roleInfo.name}` 
            : `身份: ${record.roleInfo.name}`;
            
        const lastLog = record.storyLog[record.storyLog.length - 1];
        const preview = lastLog ? lastLog.content.substring(0, 40).replace(/<[^>]+>/g, '') + '...' : '等待进入...';

        item.innerHTML = `
            <div class="tm-delete-btn" onclick="tm_deleteRecord(event, '${record.id}')"><i class="ri-delete-bin-line" style="font-size:18px;"></i></div>
            <div class="tm-card-title">《${record.bookTitle}》</div>
            <div class="tm-card-role">${roleStr}</div>
            <div class="tm-card-node"><strong>降落点：</strong>${record.nodeInfo.title}</div>
            <div style="font-size: 14px; color: #666; margin-bottom: 10px; font-style: italic; line-height:1.5;">"${preview}"</div>
            <div class="tm-card-meta">
                <span>更新于: ${new Date(record.lastUpdate).toLocaleString('zh-CN', {month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit'})}</span>
                <span style="color: #000; font-weight:bold;">继续剧情 <i class="ri-arrow-right-s-line" style="vertical-align:middle;"></i></span>
            </div>
        `;
        item.onclick = () => tm_continueRecord(record.id);
        container.appendChild(item);
    });
}

async function tm_deleteRecord(e, recordId) {
    e.stopPropagation();
    if (!confirm("确定要删除这条穿越记录吗？")) return;
    
    tm_records = tm_records.filter(r => r.id !== recordId);
    userProfile.tmRecords = tm_records;
    await saveData();
    tm_renderRecordList();
}

// ==========================================
// 4. 核心流程：新建穿越 -> 选书 -> 选身份 -> 选节点
// ==========================================
function tm_openSelectBookModal() {
    tm_tempBookId = null;
    const grid = document.getElementById('tmBookGrid');
    grid.innerHTML = '';
    
    if (!doujin_bookshelf || doujin_bookshelf.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:#999; font-size:13px;">书架上还没有书哦，<br>请先去论坛找本书加入书架。</div>';
    } else {
        doujin_bookshelf.forEach(book => {
            const coverUrl = book.customCover || book.author.avatarImage || 'https://via.placeholder.com/150x210/ccc/ffffff?text=NOVEL';
            const item = document.createElement('div');
            item.className = 'tm-book-item';
            item.innerHTML = `
                <img src="${coverUrl}">
                <div class="tm-book-title">${book.title}</div>
            `;
            item.onclick = () => {
                tm_tempBookId = book.id;
                doujinHideModal('tmSelectBookModal');
                tm_openSelectRoleModal(book);
            };
            grid.appendChild(item);
        });
    }
    doujinShowModal('tmSelectBookModal');
}

function tm_openSelectRoleModal(book) {
    tm_tempRoleType = null;
    tm_tempCustomIdentity = "";
    document.getElementById('tmCustomRoleInputBox').style.display = 'none';
    document.getElementById('tmCustomRoleInput').value = '';
    
    let leftName = "左位主角 (攻/男主)";
    let rightName = "右位主角 (受/女主)";
    if (book.cpName && book.cpName.includes('x')) {
        const parts = book.cpName.split('x');
        leftName = parts[0].trim();
        rightName = parts[1].trim();
    } else if (book.cpName) {
        leftName = book.cpName;
    }

    const list = document.getElementById('tmRoleList');
    list.innerHTML = `
        <div class="tm-role-btn" data-type="left" data-name="${leftName}">
            <strong>魂穿：${leftName}</strong>
            <span>替代原著${leftName}，以TA的视角体验后续剧情。</span>
        </div>
        <div class="tm-role-btn" data-type="right" data-name="${rightName}">
            <strong>魂穿：${rightName}</strong>
            <span>替代原著${rightName}，以TA的视角体验后续剧情。</span>
        </div>
        <div class="tm-role-btn" data-type="third_random" data-name="随机路人甲">
            <strong>天降：随机路人</strong>
            <span>AI将为你随机分配一个文中的路人或配角身份。</span>
        </div>
        <div class="tm-role-btn" data-type="third_custom" data-name="自定义">
            <strong>天降：自定义身份</strong>
            <span>自己设定身份，强行乱入原著世界。</span>
        </div>
    `;

    list.querySelectorAll('.tm-role-btn').forEach(btn => {
        btn.onclick = () => {
            list.querySelectorAll('.tm-role-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            tm_tempRoleType = btn.dataset.type;
            
            if (tm_tempRoleType === 'third_custom') {
                document.getElementById('tmCustomRoleInputBox').style.display = 'block';
            } else {
                document.getElementById('tmCustomRoleInputBox').style.display = 'none';
            }
        };
    });

    doujinShowModal('tmSelectRoleModal');
}

async function tm_confirmRole() {
    if (!tm_tempRoleType) return alert("请先选择一个身份");
    
    if (tm_tempRoleType === 'third_custom') {
        tm_tempCustomIdentity = document.getElementById('tmCustomRoleInput').value.trim();
        if (!tm_tempCustomIdentity) return alert("请输入自定义身份！");
    }

    const book = doujin_bookshelf.find(b => b.id === tm_tempBookId);
    if (!book) return alert("书籍数据异常");

    doujinHideModal('tmSelectRoleModal');
    await tm_generateNodes(book);
}

// 调用 API 生成 5 个关键节点 (全量原著读取 + 返回锚点)
async function tm_generateNodes(book) {
    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiKey) return alert("请先配置API");
    
    // 【核心修改】：应用设置中的自定义温度
    const customTemp = parseFloat(settings.apiTemperature) || 0.8;

    doujinShowModal('tmSelectNodeModal');
    const list = document.getElementById('tmNodeList');
    list.innerHTML = '<div style="text-align:center; padding:40px 20px;"><div class="loading-spinner" style="border-top-color:#000; margin:0 auto 15px;"></div><p style="color:#333; font-weight:bold;">时空雷达全量扫描中...</p><p style="font-size:11px; color:#999; margin-top:8px;">(原著较长时耗时稍久，请耐心等待)</p></div>';

    let bookContent = book.fulltext || "";
    if (book.chapters && book.chapters.length > 0) {
        bookContent = book.chapters.map(c => c.content).join('\n\n');
    }

    // 【核心修改】：注入用户设定的提示词
    const userCustomPrompt = userProfile.tmCustomPrompt ? `\n【【【用户自定义系统指令 (最高执行级)】】】:\n${userProfile.tmCustomPrompt}\n` : "";

    const prompt = `
    【任务】：你是一个同人文剧情分析系统。请根据提供的《${book.title}》的完整小说正文，提取出 **5个** 适合玩家穿越进去的关键剧情节点（如开局、转折点、高潮、矛盾爆发点等）。

    【原著信息】:
    - CP/主角：${book.cpName}
    - 简介：${book.synopsis}
    - 原著完整正文：
      ${bookContent}
      
    ${userCustomPrompt}

    【要求】:
    1. 节点必须具体，有场景感。
    2. 必须返回纯净的 JSON 数组，包含5个对象。
    3. **【核心要求】**：每个对象必须包含一个 \`anchor_text\` 字段。这个字段的值必须是该节点发生前，**原著正文里原原本本、一字不差的一句话或一小段话（大概20-50字）**。系统将依靠这段话来截取前情提要。

    【JSON格式】:
    [
      { 
        "title": "节点名称(如: 雨夜初遇)", 
        "desc": "节点背景描述(50字以内)",
        "anchor_text": "原文中的原话，用于定位该节点在正文中的准确位置"
      },
      ...
    ]
    `;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: customTemp })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        const jsonMatch = data.choices[0].message.content.match(/\[[\s\S]*\]/);
        if (!jsonMatch) throw new Error("JSON解析失败");
        
        const nodes = JSON.parse(jsonMatch[0]);
        
        list.innerHTML = '';
        nodes.forEach(node => {
            const item = document.createElement('div');
            item.className = 'tm-node-item';
            item.innerHTML = `<div class="tm-node-title">${node.title}</div><div class="tm-node-desc">${node.desc}</div>`;
            item.onclick = () => tm_initGameSession(book, node);
            list.appendChild(item);
        });

    } catch (e) {
        console.error(e);
        list.innerHTML = `<div style="color:red; text-align:center; padding: 20px; line-height:1.5;">扫描失败: ${e.message}<br><br><span style="font-size:12px; color:#666;">(若提示Token超限，请更换支持大上下文的模型)</span></div>`;
    }
}

// ==========================================
// 5. 游戏引擎：初始化与剧情生成
// ==========================================
async function tm_initGameSession(book, node) {
    doujinHideModal('tmSelectNodeModal');

    let roleInfo = { type: tm_tempRoleType, name: "" };
    const selectedBtn = document.querySelector(`.tm-role-btn[data-type="${tm_tempRoleType}"]`);
    
    if (tm_tempRoleType === 'third_custom') {
        roleInfo.name = tm_tempCustomIdentity;
    } else if (tm_tempRoleType === 'third_random') {
        roleInfo.name = "随机未知配角/路人甲";
    } else {
        roleInfo.name = selectedBtn ? selectedBtn.dataset.name : "主角";
    }

    // --- 截取前情提要 ---
    let bookContent = book.fulltext || "";
    if (book.chapters && book.chapters.length > 0) {
        bookContent = book.chapters.map(c => c.content).join('\n\n');
    }

    let preContext = "";
    if (node.anchor_text) {
        const matchIndex = bookContent.indexOf(node.anchor_text);
        if (matchIndex !== -1) {
            // 找到了精准匹配的锚点，截取从头到锚点结束的所有内容
            preContext = bookContent.substring(0, matchIndex + node.anchor_text.length);
        } else {
            // 兜底：如果AI乱编的锚点找不到，随便截取前2000字
            preContext = bookContent.substring(0, 2000) + "\n\n...";
        }
    } else {
        preContext = bookContent.substring(0, 2000) + "\n\n...";
    }

    const newSession = {
        id: `tm_${Date.now()}`,
        bookId: book.id,
        bookTitle: book.title,
        bookContent: bookContent, // 存全量用于后续参考
        preContext: preContext,   // 存截取的前情用于渲染
        bookSynopsis: book.synopsis,
        cpName: book.cpName,
        roleInfo: roleInfo,
        nodeInfo: node,
        storyLog: [],
        readIndex: 0,     // 记录用户的阅读进度
        lastUpdate: new Date().toISOString()
    };

    if (!userProfile.tmRecords) userProfile.tmRecords = [];
    userProfile.tmRecords.unshift(newSession);
    tm_records = userProfile.tmRecords;
    await saveData();

    tm_currentSession = newSession;
    tm_enterPlayScreen(true);
}

async function tm_continueRecord(recordId) {
    const record = tm_records.find(r => r.id === recordId);
    if (!record) return;
    
    tm_currentSession = record;
    tm_enterPlayScreen(false);
}

function tm_enterPlayScreen(isNew) {
    document.getElementById('tmListScreen').classList.remove('active');
    const playScreen = document.getElementById('tmPlayScreen');
    playScreen.classList.add('active');
    document.querySelector('.phone').classList.add('status-bar-hidden');
    
    tm_applySavedBg();

    const contentBox = document.getElementById('tmContentBox');
    
    // 【核心修复】：抢救可能存在的输入框节点
    const inputContainer = document.getElementById('tmInlineInputContainer');
    if (inputContainer && inputContainer.parentNode === contentBox) {
        document.getElementById('tmPlayArea').appendChild(inputContainer);
    }
    
    contentBox.innerHTML = '';
    tm_textQueue = [];
    if (inputContainer) {
        inputContainer.style.display = 'none';
    }

    tm_isGenerating = false;

    // 1. 先无缝渲染所有的前情提要
    if (tm_currentSession.preContext) {
        const preParas = tm_currentSession.preContext.split('\n').filter(p => p.trim() !== '');
        preParas.forEach(pText => {
            const p = document.createElement('div');
            p.className = 'tm-paragraph original-text'; 
            p.innerHTML = pText;
            contentBox.appendChild(p);
        });
        
        // 插入时空降落分割线
        contentBox.innerHTML += `
            <div class="tm-transmigrate-divider">
                <span></span>
                <i class="ri-meteor-line"></i> 意识降临点
                <span></span>
            </div>
        `;
    }

    if (typeof tm_currentSession.readIndex === 'undefined') {
        tm_currentSession.readIndex = tm_currentSession.storyLog ? tm_currentSession.storyLog.length : 0;
    }

    // 2. 判断是继续旧档还是新开局
    if (!isNew && tm_currentSession.storyLog && tm_currentSession.storyLog.length > 0) {
        
        tm_currentSession.storyLog.forEach((log, index) => {
            if (index < tm_currentSession.readIndex) {
                const p = document.createElement('div');
                p.className = `tm-paragraph visible ${log.isUser ? 'user-action' : ''}`;
                if (log.isUser) {
                    p.innerHTML = `“${log.content.replace(/\n/g, '<br>')}”`;
                } else {
                    p.innerHTML = log.content.replace(/\n/g, '<br>');
                }
                contentBox.appendChild(p);
            } else {
                tm_textQueue.push(log.content);
            }
        });
        
        if (tm_textQueue.length > 0) {
            document.getElementById('tmTapHint').style.display = 'block';
            document.getElementById('tmTapHint').innerHTML = '点击屏幕继续阅读...';
        } else {
            const inputContainer = document.getElementById('tmInlineInputContainer');
            contentBox.appendChild(inputContainer); 
            inputContainer.style.display = 'block';
            document.getElementById('tmTapHint').style.display = 'none';
        }
        
        setTimeout(() => {
            const area = document.getElementById('tmPlayArea');
            area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
        }, 100);

    } else {
        // 新游戏
        tm_callAIGenerateStory("start", "");
    }
}

function tm_exitPlayScreen() {
    document.getElementById('tmPlayScreen').classList.remove('active');
    document.querySelector('.phone').classList.remove('status-bar-hidden');
    
    tm_currentSession = null; 
    tm_isGenerating = false; 
    
    tm_openRecordListScreen(); 
}

// --- 背景设置相关逻辑 ---
function tm_toggleSettings(e) {
    if(e) e.stopPropagation();
    const panel = document.getElementById('tmSettingsPanel');
    panel.style.display = panel.style.display === 'block' ? 'none' : 'block';
}

function tm_changeBg(value, type) {
    const playArea = document.getElementById('tmPlayArea');
    if (type === 'color') {
        playArea.style.backgroundColor = value;
        playArea.style.backgroundImage = 'none';
        if(value === '#1a1a1a') {
            playArea.style.color = '#ccc';
        } else {
            playArea.style.color = '#333';
        }
    } else if (type === 'image') {
        playArea.style.backgroundImage = `url('${value}')`;
        playArea.style.backgroundSize = 'cover';
        playArea.style.backgroundPosition = 'center';
        playArea.style.backgroundColor = 'transparent';
        playArea.style.color = '#333'; 
    }
    
    userProfile.tmBackground = { value, type };
    saveData();

    document.querySelectorAll('.tm-bg-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.style.background === value || btn.style.backgroundColor === value) {
            btn.classList.add('active');
        }
    });
}

function tm_applySavedBg() {
    const bgConfig = userProfile.tmBackground || { value: '#F2EBE1', type: 'color' };
    tm_changeBg(bgConfig.value, bgConfig.type);
}

function tm_handleBgUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imageUrl = e.target.result;
            tm_changeBg(imageUrl, 'image');
        };
        reader.readAsDataURL(file);
    }
    event.target.value = '';
}

// --- 核心：调用 AI 续写 (绝对原著文风克隆版) ---
async function tm_callAIGenerateStory(actionType, userActionText) {
    tm_isGenerating = true;
    
    // UI 反馈
    document.getElementById('tmInlineInputContainer').style.display = 'none';
    document.getElementById('tmTapHint').style.display = 'block';
    document.getElementById('tmTapHint').innerHTML = '<i class="ri-loader-4-line fa-spin"></i> 时空连结中...';
    document.getElementById('tmTapHint').onclick = null; 

    const session = tm_currentSession;
    const settings = await dbManager.get('apiSettings', 'settings');
    
    // 【核心修改】：应用设置中的自定义温度
    const customTemp = parseFloat(settings.apiTemperature) || 0.9;
    
    let historyContext = "";
    if (session.storyLog.length > 0) {
        historyContext = session.storyLog.map(log => {
            return log.isUser ? `【我的行动】: ${log.content}` : log.content;
        }).join('\n\n');
    }

    // --- 【核心防混淆修改】身份视角铁律 ---
    let perspectiveRule = "";
    let observerRule = ""; // 旁观者规则

    if (session.roleInfo.type === 'left' || session.roleInfo.type === 'right') {
        perspectiveRule = `【身份设定】：你现在的身份是原著主角之一的【${session.roleInfo.name}】。`;
        observerRule = `【剧情聚焦】：作为主角，你是世界的中心，请以“你”的第二人称视角亲历和改变原著剧情。`;
    } else {
        perspectiveRule = `【身份设定】：你现在的身份是原著中本不存在的变数/路人：【${session.roleInfo.name}】。你是一个完全独立的个体，**绝对不是**原著男女主！`;
        observerRule = `【旁观者铁律】：作为路人，你的默认状态是“旁观者”。
    - 如果用户的行动没有主动招惹主角团，请生动描写主角们按照原著轨迹（或受蝴蝶效应影响）在别处或你眼前发生的剧情，而你只是在旁边看戏、吃瓜或过自己的日常。
    - **绝对禁止**在用户没有主动干涉的情况下，强行让原著主角跑来和你产生深度交集。
    - **绝对禁止**将“你（用户）”的身份与原著男女主混淆！你就是你，主角是主角。`;
    }

    let taskInstruction = "";
    if (actionType === 'start') {
        taskInstruction = `这是你穿越降落后的**第一幕**。请紧接上方【原著前情提要】的最后一句话，描写“你”在【${session.nodeInfo.title}】（${session.nodeInfo.desc}）这个时间节点睁开眼时的场景、身体感受，以及周围原著角色的初始反应。不需要用户做任何事，只需极具沉浸感地铺垫好当下的处境，把剧情交到用户手里。`;
    } else {
        taskInstruction = `用户刚刚采取了行动：【${userActionText}】。请严格根据原著设定和原著角色的性格，合理且细腻地描写该行动引发的后果、原著角色（特别是CP另一方）的反应以及环境氛围的微妙变化。`;
    }

    // 【核心修改】：获取用户设定的提示词并注入
    const userCustomPrompt = userProfile.tmCustomPrompt ? `\n【【【用户自定义系统指令 (最高执行级)】】】:\n${userProfile.tmCustomPrompt}\n` : "";

    const prompt = `
    【模式】: 沉浸式同人小说文字互动。
    
    【原著信息 (绝对依据，人物性格、背景设定必须严格参考此文本)】:
    - 书名: 《${session.bookTitle}》
    - CP: ${session.cpName}
    - 简介: ${session.bookSynopsis}
    - 【重要参考：原著前情提要 (刚刚发生的事情)】:
      ...${session.preContext.substring(Math.max(0, session.preContext.length - 1500))} 
      (注：以上是用户穿越前最后一刻的原文片段)
    
    【穿越设定】:
    - 降落节点: ${session.nodeInfo.title} (${session.nodeInfo.desc})
    ${perspectiveRule}
    ${observerRule}

    【当前穿越剧情完整记录 (这是你和用户共同创造的全部新时间线)】:
    ${historyContext || '(刚开局，无新历史)'}

    【本次任务】:
    ${taskInstruction}
    ${userCustomPrompt}

    【【【创作铁律 (必须严格遵守)】】】:
    1. **【最高铁律：文风克隆与去八股】**：你的叙述方式、用词习惯、环境渲染手法，必须与上方的【原著前情提要】高度一致。**严禁使用任何网文八股词汇、矫情废话或AI套话（如“眼底泛起涟漪”、“倒吸一口凉气”、“岁月静好”、“深邃的眼眸”、“如雕刻般”、“不知为何”、“嘴角勾起一抹弧度”等）**，请使用自然、真实、具有文学感和贴合语境的描写，拒绝平庸的AI流水线套路！
    2. **【身份清醒铁律】**：时刻牢记设定的【身份设定】。如果用户是路人，绝不能把用户的行动写成主角的行动，必须严格区分“你”和原著角色的立场。
    3. **人称视角**：描写用户的行为和感受时，**必须且只能使用第二人称“你”**。
    4. **OOC警告**：原著角色的性格绝对不能崩坏，必须与原著中的人物表现高度一致。
    5. **记忆连贯**：请严格根据【当前穿越剧情完整记录】推进故事，绝对不要遗忘或无视前面发生的任何情节。
    6. **节奏控制**：将生成的剧情拆分为 **3到6个自然段落**，便于用户点击阅读，保持呼吸感。
    7. **留白等待**：段落的最后，必须制造一个情节悬念、一个对方抛出的问题、或一个需要做出抉择的停顿，等待用户的下一步行动。**绝对不要替用户做决定、替用户说话或描写用户后续的动作**。

    【输出格式】：
    返回纯净的 JSON 对象，包含 \`segments\` 数组（存放剧情段落）。
    {
      "segments": ["第一段细腻的场景描写...", "第二段对方的眼神和动作...", "第三段充满张力的停顿..."]
    }
    `;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: customTemp })
        });
        
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("JSON解析失败");
        
        const result = JSON.parse(jsonMatch[0]);
        
        if (result.segments && result.segments.length > 0) {
            result.segments.forEach(seg => {
                session.storyLog.push({ content: seg, isUser: false });
                if (tm_currentSession && tm_currentSession.id === session.id) {
                    tm_textQueue.push(seg);
                }
            });
            session.lastUpdate = new Date().toISOString();
            await saveData();
            
            if (tm_currentSession && tm_currentSession.id === session.id) {
                document.getElementById('tmTapHint').innerHTML = '点击屏幕继续阅读...';
                tm_handleTap(); 
            }
        }
        
    } catch (e) {
        console.error(e);
        if (tm_currentSession && tm_currentSession.id === session.id) {
            const hintEl = document.getElementById('tmTapHint');
            hintEl.innerHTML = `<span style="color:red; background: rgba(255,255,255,0.8); padding: 5px 10px; border-radius: 5px; cursor: pointer; display: inline-block;">时空乱流干扰(${e.message})，点击重试</span>`;
            hintEl.onclick = (ev) => {
                ev.stopPropagation(); 
                hintEl.onclick = null;
                tm_callAIGenerateStory(actionType, userActionText);
            };
        } else {
            if (actionType === 'continue' && session.storyLog.length > 0) {
                const lastLog = session.storyLog[session.storyLog.length - 1];
                if (lastLog.isUser && lastLog.content === userActionText) {
                    session.storyLog.pop();
                    session.readIndex = Math.max(0, session.readIndex - 1);
                    saveData();
                }
            }
        }
    } finally {
        if (tm_currentSession && tm_currentSession.id === session.id) {
            tm_isGenerating = false;
        }
    }
}

// --- 6. 界面交互：点击与输入 ---

function tm_handleTap(e) {
    if (e && (e.target.closest('#tmInlineInputContainer') || e.target.closest('#tmSettingsPanel') || e.target.closest('.nav-btn') || e.target.closest('#tmTapHint'))) {
        return; 
    }
    
    if (tm_isGenerating) return; 
    
    // 隐藏可能开着的设置面板
    document.getElementById('tmSettingsPanel').style.display = 'none';
    
    if (tm_textQueue.length > 0) {
        const text = tm_textQueue.shift();
        const contentBox = document.getElementById('tmContentBox');
        
        const p = document.createElement('div');
        p.className = 'tm-paragraph';
        p.innerHTML = text.replace(/\n/g, '<br>');
        contentBox.appendChild(p);
        
        void p.offsetWidth; 
        p.classList.add('visible');
        
        if (typeof tm_currentSession.readIndex === 'undefined') {
            tm_currentSession.readIndex = 0;
        }
        tm_currentSession.readIndex++;
        saveData(); // 异步保存进度
        
        const area = document.getElementById('tmPlayArea');
        setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);

        if (tm_textQueue.length === 0) {
            document.getElementById('tmTapHint').style.display = 'none';
            
            const inputContainer = document.getElementById('tmInlineInputContainer');
            contentBox.appendChild(inputContainer);
            inputContainer.style.display = 'block';
            
            setTimeout(() => {
                document.getElementById('tmActionInput').focus();
                area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
            }, 300);
        }
    }
}

function tm_submitAction(e) {
    if(e) e.stopPropagation();
    
    const input = document.getElementById('tmActionInput');
    const text = input.value.trim();
    if (!text) return;

    document.getElementById('tmInlineInputContainer').style.display = 'none';
    
    const contentBox = document.getElementById('tmContentBox');
    const p = document.createElement('div');
    p.className = 'tm-paragraph user-action visible';
    p.innerHTML = `“${text.replace(/\n/g, '<br>')}”`;
    contentBox.appendChild(p);
    
    const area = document.getElementById('tmPlayArea');
    setTimeout(() => area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' }), 100);

    tm_currentSession.storyLog.push({ content: text, isUser: true });
    
    if (typeof tm_currentSession.readIndex === 'undefined') {
        tm_currentSession.readIndex = 0;
    }
    tm_currentSession.readIndex++;
    saveData();
    
    input.value = '';
    input.style.height = 'auto'; 

    tm_callAIGenerateStory("continue", text);
}

// ==========================================
// 初始化执行
// ==========================================
setTimeout(tm_injectUI, 1000);