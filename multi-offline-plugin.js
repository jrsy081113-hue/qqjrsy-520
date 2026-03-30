/**
 * 多人线下模式插件 V6 - 操作逻辑对齐版
 * 修复重回请求逻辑，新增每层剧情的编辑按钮，移除顶部美化入口
 */

const MultiOfflinePlugin = {
    isActive: false,
    currentGroupId: null,
    activeThoughts: {}, 
    abortController: null,

    init() {
        this.injectStyle();
        this.injectHTML();
        this.observeMenu();
    },

    injectStyle() {
        const style = document.createElement('style');
        style.id = 'mo-plugin-style-v5';
        style.textContent = `
            #multiOfflineScreen { background: #f2f2f2; z-index: 2500; display: none; flex-direction: column; position: fixed; top: 0; left: 0; width: 100%; height: 100%; }
            #multiOfflineScreen.active { display: flex; }
            
            /* 【核心修复】强制提升主程序弹窗层级 */
            .modal.show { z-index: 3000 !important; } 

            .mo-nav-bar { height: 44px; padding-top: env(safe-area-inset-top); background: #fff; border-bottom: 1px solid #e0e0e0; display: flex; align-items: center; justify-content: space-between; padding: 0 10px; position: sticky; top: 0; z-index: 100; }
            .mo-nav-right { display: flex; gap: 0px; align-items: center; }
            #moContentArea { flex: 1; overflow-y: auto; padding: 15px; background: transparent; padding-bottom: 80px; }

            /* 卡片与楼层样式 */
            .mo-card { background: #fff; border-radius: 12px; padding: 15px; margin-bottom: 15px; box-shadow: 0 2px 5px rgba(0,0,0,0.03); border: 1px solid #f0f0f0; }
            .mo-card-meta-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px dashed #eee; padding-bottom: 8px; }
            .mo-floor-tag { background: #000; color: #fff; padding: 1px 5px; border-radius: 4px; font-size: 10px; font-family: monospace; }
            
            /* 多头像与心声显示 */
            .mo-avatar-row { display: flex; gap: 10px; padding: 5px 2px 12px 2px; overflow-x: auto; margin-bottom: 10px; scrollbar-width: none; }
            .mo-avatar-item { width: 44px; height: 44px; border-radius: 50%; background-size: cover; background-position: center; border: 1px solid #eee; cursor: pointer; transition: all 0.2s; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background-color: #f5f5f5; font-size: 16px; font-weight: bold; color: #999; }
            .mo-avatar-item.active { border-color: #000; transform: translateY(-3px); box-shadow: 0 4px 8px rgba(0,0,0,0.1); }

            .mo-thought-zone { background: #f9f9f9; border-radius: 8px; padding: 10px; margin-bottom: 12px; border-left: 3px solid #000; }
            .mo-thought-header { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px; font-weight: normal; }
            
            .mo-card-meta-row span { font-weight: normal !important; }
            .mo-meta-left { display: flex; align-items: center; gap: 8px; }
            .mo-meta-left span:last-child { font-size: 12px !important; font-weight: normal !important; color: #999 !important; line-height: 1; }
            .mo-thought-header { font-weight: normal !important; }
            .mo-thought-header span { font-weight: normal !important; }

            /* HTML 小剧场容器 */
            .mo-html-container { margin-top: 10px; padding: 10px; background: #fff; border-radius: 8px; border: 1px solid #eee; overflow: hidden; }

            .mo-text-content { font-size: 16px; line-height: 1.8; color: #333; text-align: justify; white-space: pre-wrap; }
            .mo-bottom-bar { background: #fff; padding: 10px 15px; padding-bottom: calc(10px + env(safe-area-inset-bottom)); display: flex; align-items: flex-end; gap: 10px; border-top: 1px solid #e0e0e0; }
            .mo-input { flex: 1; background: #f5f5f5; border: none; border-radius: 20px; padding: 10px 15px; font-size: 15px; resize: none; max-height: 100px; outline: none; }

            /* 呼吸的请求中状态 */
            .ri-stop-circle-line { font-size: 24px; animation: moPulse 1.5s infinite; }
            @keyframes moPulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        `;
        document.head.appendChild(style);
    },

    injectHTML() {
        const div = document.createElement('div');
        div.id = 'multiOfflineScreen';
        div.className = 'page';
        // 去掉了“美化”入口
        div.innerHTML = `
            <div class="mo-nav-bar">
                <button class="nav-btn" onclick="MultiOfflinePlugin.exit()"><i class="ri-arrow-left-s-line"></i></button>
                <div class="nav-title" id="moTitle">多人剧场</div>
                <div class="mo-nav-right">
                    <button class="nav-btn" onclick="MultiOfflinePlugin.openSettings()"><i class="ri-settings-3-line"></i></button>
                </div>
            </div>
            <div id="moContentArea"></div>
            <div class="mo-bottom-bar">
                <button class="offline-btn secondary" onclick="MultiOfflinePlugin.regenerate()"><i class="ri-refresh-line"></i></button>
                <textarea id="moInput" class="mo-input" rows="1" placeholder="发送行动..."></textarea>
                <button id="moSendBtn" class="offline-btn primary" onclick="MultiOfflinePlugin.handleSend()">
                    <i class="ri-send-plane-fill" id="moSendIcon"></i>
                </button>
            </div>
        `;
        document.querySelector('.phone .screen').appendChild(div);
    },

    openSettings() {
        if (typeof openOfflineSettings === 'function') {
            currentChatFriendId = this.currentGroupId; 
            openOfflineSettings();
        }
    },

    observeMenu() {
        const observer = new MutationObserver(() => {
            const menu = document.querySelector('#chatFunctions .function-menu');
            if (menu && !menu.querySelector('.btn-multi-offline')) {
                const friend = friends.find(f => f.id === currentChatFriendId);
                if (friend && friend.isGroup) {
                    const btn = document.createElement('div');
                    btn.className = 'function-item btn-multi-offline';
                    btn.onclick = () => this.enter(currentChatFriendId);
                    btn.innerHTML = `<div class="function-icon"><i class="ri-team-line"></i></div><div class="function-label">多人线下</div>`;
                    menu.appendChild(btn);
                }
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    },

    enter(groupId) {
        this.isActive = true;
        this.currentGroupId = groupId;
        hideFunctionMenus();
        setActivePage('multiOfflineScreen');
        this.renderHistory();
    },

    exit() {
        this.isActive = false;
        if (this.abortController) { this.abortController.abort(); this.abortController = null; }
        const icon = document.getElementById('moSendIcon');
        if (icon) icon.className = 'ri-send-plane-fill';
        
        backToChat();
        renderInitialMessages();
    },

    async getDeepContext(group) {
        const offlineSet = group.offlineSettings || {}; 

        const boundBookIds = new Set(group.worldBookIds || []);
        (group.boundFolderIds ||[]).forEach(fId => {
            worldBooks.forEach(wb => { if(wb.folderId === fId) boundBookIds.add(wb.id); });
        });
        const worldContext = Array.from(boundBookIds).map(id => {
            const wb = worldBooks.find(b => b.id === id);
            return wb ? `[${wb.name}]: ${wb.content}` : '';
        }).join('\n');

        const preset = offlineContentPresets.find(p => p.id === offlineSet.contentPresetId) || { content: "无" };
        const style = writingStyles.find(s => s.id === (offlineSet.writingStyleId || offlineModeSettings.writingStyleId));
        const opening = openingStatements.find(o => o.id === (offlineSet.openingStatementId || offlineModeSettings.openingStatementId));

        const charPerson = offlineSet.charPerson || "third";
        const userPerson = offlineSet.userPerson || "second";
        const skit = skits.find(s => s.id === offlineSet.skitId);

        const aiMembers = group.members.filter(id => id !== userProfile.id).map(id => getAuthorById(id));
        const memberProfiles = aiMembers.map(m => {
            const mems = (characterMemories[m.id] ||[]).slice(-3).map(mem => mem.content).join(';');
            return `- ${m.name}: ${m.role}。私聊关系参考：${mems}`;
        }).join('\n');

        return {
            worldContext,
            preset: preset.content,
            writingStyle: style ? style.content : "细腻的小说叙述",
            opening: opening ? opening.content : "无",
            charPerson,
            userPerson,
            skit: skit ? skit.content : null,
            charCount: offlineSet.charCount || 1000,
            memberProfiles
        };
    },

    renderHistory() {
        const container = document.getElementById('moContentArea');
        container.innerHTML = '';
        const history = chatHistories[this.currentGroupId] ||[];
        const group = friends.find(g => g.id === this.currentGroupId);
        const aiMembers = group.members.filter(id => id !== userProfile.id).map(id => getAuthorById(id));
        
        let floor = 0;
        history.forEach(msg => {
            if (!msg.isOfflineMessage) return;
            floor++;

            const card = document.createElement('div');
            card.className = 'mo-card';
            
            const time = new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            
            // 加入编辑按钮
            const metaHtml = `
                <div class="mo-card-meta-row">
                    <div class="mo-meta-left">
                        <span class="mo-floor-tag">#${floor}</span>
                        <span>${time}</span>
                    </div>
                    <div style="display:flex; gap:15px; align-items:center;">
                        <i class="ri-edit-2-line" title="编辑" onclick="MultiOfflinePlugin.editMsg('${msg.id}')" style="cursor:pointer; color:#ccc; transition:color 0.2s;" onmouseover="this.style.color='#000'" onmouseout="this.style.color='#ccc'"></i>
                        <i class="ri-delete-bin-line" title="删除" onclick="MultiOfflinePlugin.deleteMsg('${msg.id}')" style="cursor:pointer; color:#ccc; transition:color 0.2s;" onmouseover="this.style.color='#ff3b30'" onmouseout="this.style.color='#ccc'"></i>
                    </div>
                </div>`;

            if (msg.type === 'sent') {
                const myAvatar = userProfile.avatarImage ? `style="background-image:url('${userProfile.avatarImage}')"` : '';
                card.innerHTML = `${metaHtml}<div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;"><div class="mo-avatar-item" ${myAvatar}>${userProfile.avatarImage ? '' : '我'}</div><span style="font-size:14px; font-weight:normal;">${userProfile.name} </span></div><div class="mo-text-content">${msg.content}</div>`;
            } else {
                let storyAndHtml = msg.content;
                let heartsVoiceData = null;

                const hvSplit = msg.content.split('[HEARTS_VOICE_SEPARATOR]');
                if (hvSplit.length > 1) {
                    storyAndHtml = hvSplit[0];
                    try { heartsVoiceData = JSON.parse(hvSplit[1]); } catch(e){}
                }

                const skitSplit = storyAndHtml.split('[HTML_SKIT_SEPARATOR]');
                const storyContent = skitSplit[0].trim();
                const htmlContent = skitSplit.length > 1 ? skitSplit[1].trim() : null;

                const charDataMap = {};
                if (heartsVoiceData && heartsVoiceData.characters) {
                    heartsVoiceData.characters.forEach(c => charDataMap[c.name] = c);
                }

                let avatarHtml = aiMembers.map((m, i) => {
                    const avatar = m.avatarImage ? `style="background-image:url('${m.avatarImage}')"` : '';
                    const name = m.remark || m.name;
                    return `<div class="mo-avatar-item ${i === 0 ? 'active' : ''}" onclick="MultiOfflinePlugin.switchChar(this, '${msg.id}', '${name}')" ${avatar}>${m.avatarImage ? '' : name[0]}</div>`;
                }).join('');

                const firstCharName = aiMembers[0].remark || aiMembers[0].name;
                const activeData = charDataMap[firstCharName] || { emoji: "...", favorability: "??", thought: "AI未返回该角色心声数据" };

                let skitHtml = '';
                if (htmlContent) {
                    skitHtml = `<div class="mo-html-container">${htmlContent}</div>`;
                }

                card.innerHTML = `
                    ${metaHtml}
                    <div class="mo-avatar-row">${avatarHtml}</div>
                    <div class="mo-thought-zone" id="thought-${msg.id}">
                        <div class="mo-thought-header"><span>${firstCharName} ${activeData.emoji || ''}</span><span style="color:#ff69b4">好感: ${activeData.favorability}</span></div>
                        <div class="mo-thought-body" id="text-${msg.id}">“${activeData.thought}”</div>
                    </div>
                    <div class="mo-text-content">${storyContent.replace(/\n/g, '<br>')}</div>
                    ${skitHtml}
                `;
                this.activeThoughts[msg.id] = charDataMap;
                if(htmlContent) this.executeScripts(card);
            }
            container.appendChild(card);
        });
        container.scrollTop = container.scrollHeight;
    },

    executeScripts(container) {
        const scripts = container.querySelectorAll('script');
        scripts.forEach(s => {
            const newScript = document.createElement('script');
            newScript.textContent = s.textContent;
            document.body.appendChild(newScript);
            document.body.removeChild(newScript);
        });
    },

    // 剧情编辑弹窗
    editMsg(id) {
        const history = chatHistories[this.currentGroupId] ||[];
        const msg = history.find(m => m.id === id);
        if (!msg) return;

        const modal = document.getElementById('offlineEditModal');
        if (!modal) return;
        const textarea = document.getElementById('offlineEditTextarea');
        textarea.value = msg.content;
        
        // 绑定新的保存事件，防止和私聊线下的保存冲突
        const confirmBtn = modal.querySelector('.modal-btn-confirm');
        const cancelBtn = modal.querySelector('.modal-btn-cancel');
        
        confirmBtn.onclick = async () => {
            msg.content = textarea.value;
            await saveData(); 
            this.renderHistory();
            modal.classList.remove('show');
            if (typeof showToast === 'function') showToast("剧情已修改");
        };

        cancelBtn.onclick = () => {
            modal.classList.remove('show');
        };

        modal.classList.add('show');
    },

    async deleteMsg(id) {
        showConfirm("删除此楼剧情？", async (yes) => {
            if(!yes) return;
            chatHistories[this.currentGroupId] = chatHistories[this.currentGroupId].filter(m => m.id !== id);
            await saveData();
            this.renderHistory();
        });
    },

    switchChar(el, msgId, charName) {
        const dataMap = this.activeThoughts[msgId] || {};
        const charData = dataMap[charName] || { emoji: "...", favorability: "??", thought: "该角色本次无心声" };
        el.parentElement.querySelectorAll('.mo-avatar-item').forEach(item => item.classList.remove('active'));
        el.classList.add('active');
        const zone = document.getElementById(`thought-${msgId}`);
        zone.querySelector('.mo-thought-header').innerHTML = `<span>${charName} ${charData.emoji || ''}</span><span style="color:#ff69b4">好感: ${charData.favorability}</span>`;
        zone.querySelector('.mo-thought-body').textContent = `“${charData.thought}”`;
    },

    // 对齐私聊模式的发送与中断逻辑
    async handleSend() {
        const icon = document.getElementById('moSendIcon');
        const input = document.getElementById('moInput');

        if (icon.classList.contains('ri-send-plane-fill')) {
            const text = input.value.trim();
            if (!text) return;

            await saveChatMessage(this.currentGroupId, 'sent', text, '', null, 'text', true);
            input.value = '';
            this.renderHistory();

            // 发送后变成小圆圈，并请求AI
            icon.className = 'ri-stop-circle-line';
            this.requestAI();
        } else {
            // 如果正在请求，点击就中止
            if (this.abortController) {
                this.abortController.abort();
                this.abortController = null;
                if (typeof showToast === 'function') showToast("已停止生成");
            }
            icon.className = 'ri-send-plane-fill';
            aiReplyingSet.delete(this.currentGroupId);
        }
    },

    // 底栏最左边的重回按钮
    async regenerate() {
        if (aiReplyingSet.has(this.currentGroupId)) {
            if (typeof showToast === 'function') showToast("AI正在回复中...");
            return;
        }

        const history = chatHistories[this.currentGroupId] ||[];
        if (history.length > 0) {
            const lastMsg = history[history.length - 1];
            // 只撤销最后一条是AI发的回复
            if (lastMsg.type === 'received') {
                history.pop();
                await saveData();
                this.renderHistory();
            }
        }
        
        // 变成等待的小圆点
        const icon = document.getElementById('moSendIcon');
        if (icon) {
            icon.className = 'ri-stop-circle-line';
        }
        
        // 强制向AI索要进度
        this.requestAI();
    },

    async requestAI() {
        aiReplyingSet.add(this.currentGroupId);

        const settings = await dbManager.get('apiSettings', 'settings') || {};
        const group = friends.find(g => g.id === this.currentGroupId);
        const history = chatHistories[this.currentGroupId] ||[];
        const lastAction = history.slice().reverse().find(m => m.type === 'sent' && m.isOfflineMessage)?.content || "等待对方反应";
        
        const ctx = await this.getDeepContext(group);

        let personInstruction = `- 描述角色时，使用${ctx.charPerson === 'third' ? '第三人称(他/她)' : (ctx.charPerson === 'second' ? '第二人称(你)' : '第一人称(我)')}\n`;
        personInstruction += `- 提到用户 "${userProfile.name}" 时，使用${ctx.userPerson === 'second' ? '第二人称(你)' : '第三人称(用户名字)'}`;

        const recentHistory = history.slice(-30); 
        let chatHistoryContext = '';
        if (recentHistory.length > 0) {
            chatHistoryContext = recentHistory.map(m => {
                const senderName = m.type === 'sent' ? userProfile.name : (getAuthorById(m.senderId)?.name || '群成员');
                
                let cleanContent = m.content || '';
                
                if (m.contentType !== 'text') {
                    cleanContent = `[${m.contentType}]`;
                } else if (m.isOfflineMessage && m.type === 'received') {
                    const hvSplit = m.content.split('[HEARTS_VOICE_SEPARATOR]');
                    let storyAndHtml = hvSplit[0];
                    const skitSplit = storyAndHtml.split('[HTML_SKIT_SEPARATOR]');
                    cleanContent = skitSplit[0].trim();
                }
                
                let prefix = '';
                if (m.isOfflineMessage) {
                    prefix = m.type === 'sent' ? '(线下行动)' : '(线下剧情)';
                } else {
                    prefix = '(线上群聊)';
                }
                
                return `[${prefix}] ${senderName}: ${cleanContent}`;
            }).join('\n\n');
        } else {
            chatHistoryContext = '(无历史记录，请根据开场设定主动开始一段故事。)';
        }

        const prompt = `
【模式】: 多人线下剧场 (晋江/番茄风格)
扮演群聊“${group.name}”中的AI角色。
你的创作逻辑必须是：【读取角色性格】→【代入角色动机】→【基于人设产生反应】。
不要为了推进剧情而让角色妥协，要让剧情为角色的性格服务。故事重心必须严格围绕用户的最新行动。

【情报库】
- 世界观：${ctx.worldContext}
- 剧情规则：${ctx.preset}
- 【角色灵魂核心：性格、身份背景与近期私密记忆】：\n${ctx.memberProfiles}

- 开场设定：${ctx.opening}

【【【最高记忆铁律：承上启下！！！】】】
你需要回应的、最近的实时线上群聊与线下剧情记录如下：
---
${chatHistoryContext}
---
你**必须**仔细阅读并融合**以上历史记录**，你的续写**必须**与所有上文内容紧密相连，做到人设一致、情节连贯、逻辑自洽。**严禁遗忘**前面发生的剧情。

【【最高指令：用户的当前行动】】
>>> ${lastAction} <<<

【创作铁律】
0. **人设至上 (SUPREMACY)**：你不是在写通俗小说，而是在进行深度角色扮演。所有角色的回应、神态、甚至用词习惯必须100%符合其性格设定。严禁出现OOC（不符合人设）。
1. **角色扮演**: 必须以回应用户指令为核心。严禁描写或代替用户言行。
2. **叙事要求**: ${personInstruction}。字数限制：${ctx.charCount}字。
3. **文风**: ${ctx.writingStyle}。多描写心理、神态、环境。
${ctx.skit ? `【小剧场指令】: ${ctx.skit}` : ''}

【输出格式铁律 (必须包含两个分隔符)】
你的回复必须严格遵循以下结构：
正文内容(纯文本)...[HTML_SKIT_SEPARATOR]
${ctx.skit ? '此处按指令生成HTML交互代码' : '无'}[HEARTS_VOICE_SEPARATOR]
{
  "characters":[
    { "name": "角色名", "emoji": "(颜文字)", "favorability": "数值/100 (感官描述)", "thought": "此处严禁复读正文！必须描写该性格角色在此时此刻最真实、最符合人设的内心潜台词。" }
  ]
}
`;

        this.abortController = new AbortController();
        try {
            const response = await fetch(`${settings.apiUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: 1.0 }),
                signal: this.abortController.signal
            });
            const result = await response.json();
            await saveChatMessage(this.currentGroupId, 'received', result.choices[0].message.content, '', null, 'text', true);
            this.renderHistory();
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log("多人线下生成已被中断");
            } else {
                console.error(e);
            }
        } finally {
            const icon = document.getElementById('moSendIcon');
            if (icon) {
                icon.className = 'ri-send-plane-fill'; // 恢复状态
            }
            aiReplyingSet.delete(this.currentGroupId);
            this.abortController = null;
        }
    }
};

MultiOfflinePlugin.init();
