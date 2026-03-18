/**
 * ====================================================
 *  奇遇空间 (养娃) 功能模块 (重构暖色面包系 + 完善流程)
 *  baby-plugin.js
 * ====================================================
 */

let babyActionTimer = null; // 用于控制动作切换的定时器

// 把男女娃的图片库放在全局，方便复用
const globalGirlImages = [
    "https://img.heliar.top/file/1773359645255_de22a3981443f9f716e5217a05c07388.png",
    "https://img.heliar.top/file/1773359763623_516b4835a2260d3497ffaf36488315b4.png",
    "https://img.heliar.top/file/1773363198260_6539b1902ab6d935ece61475f2d5b2a4.png"
];
const globalBoyImages = [
    "https://img.heliar.top/file/1773359832310_f34a8031443c88b1e8eca35e7a9055af.png",
    "https://img.heliar.top/file/1773359831234_66ae9011f14fa1d5c3453e067588f523.png",
    "https://img.heliar.top/file/1773359833023_e8d5c5ea9f83f8291f68679124b6f8d7.png"
];

// ==============================================================
// 1. 打开奇遇空间主列表
// ==============================================================
function openBabyListScreen() {
    setActivePage('babyListScreen');
    renderBabyList();
}

function renderBabyList() {
    const container = document.getElementById('babyListContainer');
    container.innerHTML = '';

    if (babies.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding: 50px; color: #A67C52;">
                <i class="ri-egg-line" style="font-size: 48px; opacity: 0.5;"></i>
                <p>还没有小宝宝哦<br>点击右上角领养一个吧~</p>
            </div>
        `;
        return;
    }

    babies.forEach(baby => {
        const partner = friends.find(f => f.id === baby.partnerId) || { name: '未知' };
        const card = document.createElement('div');
        card.style.cssText = "background: #FFF; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(212,163,115,0.1); border: 2px solid #F5E6D3; display: flex; align-items: center; cursor: pointer; margin-bottom: 15px;";
        card.onclick = () => openBabyRoom(baby.id);

        const avatarUrl = baby.avatar || 'https://img.icons8.com/bubbles/100/baby.png';

        card.innerHTML = `
            <img src="${avatarUrl}" style="width: 60px; height: 60px; border-radius: 50%; border: 3px solid #FFF3E0; margin-right: 15px; object-fit: cover;">
            <div style="flex: 1;">
                <div style="font-size: 18px; font-weight: bold; color: #8C6239;">${baby.name} <span style="font-size: 12px; color: ${baby.gender === '男孩' ? '#8fd3f4' : '#ff9a9e'};">${baby.gender}</span></div>
                <div style="font-size: 12px; color: #A67C52; margin-top: 5px;">你和 ${partner.name} 的宝宝 · ${baby.age}岁</div>
            </div>
            <i class="ri-arrow-right-s-line" style="color: #D4A373; font-size: 20px;"></i>
        `;
        container.appendChild(card);
    });
}

// ==============================================================
// 2. 领养流程
// ==============================================================
function openBabyAdoptionModal() {
    if (babies.length >= 5) return showAlert("最多只能抚养5个宝宝哦~");

    const list = document.getElementById('babyPartnerList');
    list.innerHTML = '';

    // 过滤：非群聊，且没有和你生过孩子的AI
    const existingPartnerIds = babies.map(b => b.partnerId);
    const availablePartners = friends.filter(f => !f.isGroup && !existingPartnerIds.includes(f.id));

    if (availablePartners.length === 0) {
        list.innerHTML = '<div style="padding:20px; text-align:center; color:#999;">没有合适的好友了</div>';
    } else {
        availablePartners.forEach(f => {
            const item = document.createElement('div');
            item.className = 'multi-select-item';
            item.style.padding = "10px";
            item.innerHTML = `
                <input type="radio" name="babyPartner" id="bp-${f.id}" value="${f.id}" style="accent-color: #D4A373;">
                <label for="bp-${f.id}" style="color: #555; font-weight: bold; margin-left: 10px;">${f.remark || f.name}</label>
            `;
            list.appendChild(item);
        });
    }
    document.getElementById('babyAdoptionModal').classList.add('show');
}

// 触发扭蛋/确认伴侣 (带智能性别平衡机制)
function startBabyAdoption() {
    const selected = document.querySelector('input[name="babyPartner"]:checked');
    if (!selected) return showToast("请选择一位抚养人");

    document.getElementById('babyAdoptionModal').classList.remove('show');

    // 模拟抽卡动画
    showToast("🌟 奇迹正在降临...", 2000);
    setTimeout(() => {
        // --- 核心修改：智能性别平衡算法 ---
        let girlChance = 0.5; // 默认 50% 概率
        
        if (babies.length > 0) {
            // 统计当前女孩和男孩的数量
            const girlCount = babies.filter(b => b.gender === '女孩').length;
            const boyCount = babies.length - girlCount;
            
            // 如果女孩比男孩多，把生女孩的概率降到 10% (生男孩概率提升到 90%)
            if (girlCount > boyCount) {
                girlChance = 0.1; 
            } 
            // 如果男孩比女孩多，把生女孩的概率提升到 90%
            else if (boyCount > girlCount) {
                girlChance = 0.9;
            }
        }
        
        // 生成最终性别
        const isGirl = Math.random() < girlChance;
        // ------------------------------------

        document.getElementById('babyGenderDisplay').innerHTML = isGirl ? '女孩 ♀' : '男孩 ♂';
        document.getElementById('babyGenderDisplay').style.color = isGirl ? '#ff9a9e' : '#8fd3f4';

        // 记录临时数据在 DOM attribute 里
        document.getElementById('babyInfoSetupModal').setAttribute('data-partner-id', selected.value);
        document.getElementById('babyInfoSetupModal').setAttribute('data-gender', isGirl ? '女孩' : '男孩');

        // 根据性别自动分配并显示头像
        const avatarUrl = isGirl 
            ? "https://img.heliar.top/file/1773406179317_0dbc48d4a85da468d34fae99f89d9cac.jpeg" 
            : "https://img.heliar.top/file/1773406186786_18633a9b4972e3d5f7983874a9ea4837.jpeg";
        document.getElementById('newBabyAvatarDisplay').src = avatarUrl;

        // 重置表单
        document.getElementById('newBabyName').value = '';
        document.getElementById('newBabyBirthday').valueAsDate = new Date();

        document.getElementById('babyInfoSetupModal').classList.add('show');
    }, 2000);
}

function handleBabyAvatarUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            // 使用主文件的压缩函数
            tempNewBabyAvatar = await compressImage(file, { maxWidth: 300 });
            document.getElementById('newBabyAvatarUpload').style.backgroundImage = `url(${tempNewBabyAvatar})`;
            document.getElementById('newBabyAvatarUpload').style.backgroundSize = 'cover';
            document.getElementById('newBabyAvatarPreview').textContent = '';
        };
        reader.readAsDataURL(file);
    }
}

// 确认创建并立刻跳转房间
async function confirmBabyCreation() {
    const name = document.getElementById('newBabyName').value.trim();
    if (!name) return showAlert("宝宝必须有个名字哦");

    const partnerId = document.getElementById('babyInfoSetupModal').getAttribute('data-partner-id');
    const gender = document.getElementById('babyInfoSetupModal').getAttribute('data-gender');
    const birthday = document.getElementById('newBabyBirthday').value;

    const girlImages = [
        "https://img.heliar.top/file/1773359645255_de22a3981443f9f716e5217a05c07388.png",
        "https://img.heliar.top/file/1773359763623_516b4835a2260d3497ffaf36488315b4.png",
        "https://img.heliar.top/file/1773363198260_6539b1902ab6d935ece61475f2d5b2a4.png"
    ];
    const boyImages = [
        "https://img.heliar.top/file/1773359832310_f34a8031443c88b1e8eca35e7a9055af.png",
        "https://img.heliar.top/file/1773359831234_66ae9011f14fa1d5c3453e067588f523.png",
        "https://img.heliar.top/file/1773359833023_e8d5c5ea9f83f8291f68679124b6f8d7.png"
    ];

    const bodyImage = gender === '女孩' 
        ? girlImages[Math.floor(Math.random() * girlImages.length)] 
        : boyImages[Math.floor(Math.random() * boyImages.length)];

    // --- 核心修改：根据性别直接写入指定的头像URL ---
    const finalAvatarUrl = gender === '女孩' 
        ? "https://img.heliar.top/file/1773406179317_0dbc48d4a85da468d34fae99f89d9cac.jpeg"
        : "https://img.heliar.top/file/1773406186786_18633a9b4972e3d5f7983874a9ea4837.jpeg";

    const babyId = `baby_${Date.now()}`;
    const newBaby = {
        id: babyId,
        partnerId: partnerId,
        name: name,
        gender: gender,
        birthday: birthday,
        age: 3, 
        avatar: finalAvatarUrl, // <--- 使用判断好的头像
        bodyImage: bodyImage,
        traits: null, 
        diaryLogs: []
    };

    babyChats[babyId] = {
        baby: [],
        partner: [],
        group: []
    };

    babies.push(newBaby);
    await saveData();
    
    document.getElementById('babyInfoSetupModal').classList.remove('show');
    showToast("🎉 宝宝入驻奇遇空间！");
    
    // 立刻进入房间
    openBabyRoom(babyId);
    
    // 进入房间后后台异步生成特质
    generateBabyTraits(babyId);
}

// 异步生成宝宝特质
async function generateBabyTraits(babyId) {
    const baby = babies.find(b => b.id === babyId);
    if (!baby || baby.traits) return; // 如果已经有了就不生成

    const friend = friends.find(f => f.id === baby.partnerId);
    if (!friend) return;
    const personaId = friend.activeUserPersonaId || 'default_user';
    const persona = userPersonas.find(p => p.id === personaId) || userProfile;

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiKey) return;

    const prompt = `
    【任务】: 用户 "${persona.name}" (人设: ${persona.personality}) 和 AI角色 "${friend.name}" (人设: ${friend.role}) 共同领养了一个 ${baby.gender} 宝宝，名叫 "${baby.name}"。
    请根据"父母"双方的人设基因，合理推断并生成这个宝宝的初始特质。
    
    【要求返回纯净的JSON格式】:
    {
        "appearanceLevel": "颜值评级(如 S, A+, 绝美)",
        "appearanceDesc": "样貌描述(融合父母特征，50字内)",
        "hobbies": ["爱好1", "爱好2", "爱好3"],
        "badHabits": ["小毛病1", "小毛病2"],
        "dailyPlan": "今天的计划(如：学习画画、和爸爸去公园)",
        "wishes": "目前的心愿"
    }`;

    try {
        const res = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
        });
        const data = await res.json();
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            baby.traits = JSON.parse(jsonMatch[0]);
            await saveData();
            
            // 如果用户手快此时就在看成长档案，自动刷新
            if (document.getElementById('babyInfoScreen').classList.contains('active')) {
                renderBabyInfo();
            }
        }
    } catch (e) {
        console.error("AI生成特质失败，使用默认值", e);
        // 兜底
        baby.traits = {
            appearanceLevel: "A级", appearanceDesc: "继承了父母的优点，非常可爱。",
            hobbies: ["发呆", "吃零食"], badHabits: ["挑食"], dailyPlan: "吃饱睡好", wishes: "快快长大"
        };
        await saveData();
        if (document.getElementById('babyInfoScreen').classList.contains('active')) {
            renderBabyInfo();
        }
    }
}

// ==============================================================
// 3. 宝宝房间导航 & 渲染
// ==============================================================

function backToBabyList() {
    setActivePage('babyListScreen');
    renderBabyList();
}

function openBabyRoom(babyId) {
    currentBabyId = babyId;
    const baby = babies.find(b => b.id === babyId);
    if (!baby) return;

    document.getElementById('roomBabyName').textContent = `${baby.name} 的房间`;
    
    // 1. 动态注入拖拽特效和气泡动画 (去除了呼吸动效)
    if (!document.getElementById('baby-dynamic-style')) {
        const style = document.createElement('style');
        style.id = 'baby-dynamic-style';
        style.innerHTML = `
            .baby-body-anim {
                transition: opacity 0.3s ease; /* 切换图片时稍微柔和点 */
            }
            .baby-blob-wrapper.dragging .baby-body-anim {
                transform: scale(1.05) translateY(-10px); /* 拎起来的效果保留 */
            }
            /* 补充缺失的气泡动画 */
            @keyframes babyFloatThinking {
                0%, 100% { opacity: 1; transform: translateX(-50%) translateY(0); }
                50% { opacity: 1; transform: translateX(-50%) translateY(-5px); }
            }
            @keyframes babyFloatReply {
                0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
                10% { opacity: 1; transform: translateX(-50%) translateY(0); }
                80% { opacity: 1; transform: translateX(-50%) translateY(-5px); }
                100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
            }
            .baby-poke-float {
                z-index: 100;
            }
            .baby-poke-float.thinking {
                /* 思考时：常亮并轻轻上下浮动 */
                animation: babyFloatThinking 1.5s infinite ease-in-out;
            }
            .baby-poke-float.reply {
                /* 回复后：显示 4 秒后渐渐向上消失 */
                animation: babyFloatReply 4s ease-in-out forwards;
            }
        `;
        document.head.appendChild(style);
    }

    const roomContainer = document.querySelector('.baby-room-container');
    if (roomContainer) {
        roomContainer.innerHTML = `
            <img src="https://img.heliar.top/file/1773417897163_ee0b3ec45928dc5d8fa1fd18dc36cf8f.jpeg" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover; z-index:0; pointer-events: none;">
            
            <div class="baby-blob-wrapper" id="babyDraggable" onclick="pokeBaby()" style="position:absolute; bottom: 12%; left: 50%; transform: translateX(-50%); z-index: 10;">
                <img src="${baby.bodyImage}" style="width: 340px; height: auto; object-fit:contain; filter: drop-shadow(0 15px 20px rgba(0,0,0,0.15)); pointer-events: none;" class="baby-body-anim">
                <div id="babyPokeFloat" class="baby-poke-float"></div>
            </div>
        `;

        // 2. 绑定随意拖拽逻辑
        const wrapper = document.getElementById('babyDraggable');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        wrapper.addEventListener('touchstart', (e) => {
            isDragging = true;
            wrapper.classList.add('dragging');
            const touch = e.touches[0];
            startX = touch.clientX;
            startY = touch.clientY;

            const rect = wrapper.getBoundingClientRect();
            const parentRect = roomContainer.getBoundingClientRect();
            initialLeft = rect.left - parentRect.left;
            initialTop = rect.top - parentRect.top;

            wrapper.style.bottom = 'auto';
            wrapper.style.right = 'auto';
            wrapper.style.transform = 'none';
            wrapper.style.left = initialLeft + 'px';
            wrapper.style.top = initialTop + 'px';
        }, {passive: false});

        wrapper.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            const touch = e.touches[0];
            const dx = touch.clientX - startX;
            const dy = touch.clientY - startY;

            wrapper.style.left = (initialLeft + dx) + 'px';
            wrapper.style.top = (initialTop + dy) + 'px';
        }, {passive: false});

        wrapper.addEventListener('touchend', () => {
            isDragging = false;
            wrapper.classList.remove('dragging');
        });

        // 3. 随机切换动作
        clearInterval(babyActionTimer); 
        const imgArray = baby.gender === '女孩' ? globalGirlImages : globalBoyImages;
        
        babyActionTimer = setInterval(() => {
            const imgEl = document.querySelector('.baby-body-anim');
            if (imgEl && !wrapper.classList.contains('dragging')) {
                const randomImg = imgArray[Math.floor(Math.random() * imgArray.length)];
                imgEl.src = randomImg;
            }
        }, 6000 + Math.random() * 4000); 
    }

    setActivePage('babyRoomScreen');
}

function backToBabyRoom() {
    setActivePage('babyRoomScreen');
}

function openBabyInfoScreen() {
    setActivePage('babyInfoScreen');
    renderBabyInfo();
}

function openBabyChatListScreen() {
    setActivePage('babyChatListScreen');
    renderBabyChatList();
}

function openBabyDiaryScreen() {
    setActivePage('babyDiaryScreen');
    renderBabyDiary();
}

// ==============================================================
// 4. 成长档案渲染 (手帐线圈本重构版)
// ==============================================================
function renderBabyInfo() {
    const baby = babies.find(b => b.id === currentBabyId);
    if (!baby) return;

    // 获取整个本子内页的容器
    const pageContainer = document.querySelector('#babyInfoScreen .notebook-page');
    if (!pageContainer) return;

    // 清空页面
    pageContainer.innerHTML = '';

    if (!baby.traits) {
        pageContainer.innerHTML = `
            <div style="text-align:center; padding: 80px 20px; color:#A67C52;">
                <i class="ri-loader-4-line fa-spin" style="font-size:32px;"></i><br><br>
                正在用魔法测算宝宝的基因特质...
            </div>`;
        return;
    }

    const tr = baby.traits;

    // 处理兴趣爱好和习惯的标签
    const hobbiesHtml = (tr.hobbies || []).map(h => `<span class="scrap-tag">${h}</span>`).join('');
    const habitsHtml = (tr.badHabits || []).map(h => `<span class="scrap-tag bad">${h}</span>`).join('');

    // 【1. 拍立得照片：基础信息】
    const polaroidHtml = `
        <div class="scrap-polaroid">
            <div class="washi-tape pink" style="top: -10px; left: 50%; transform: translateX(-50%) rotate(-3deg); width: 80px;"></div>
            <div style="width: 100%; aspect-ratio: 1/1; background-image: url('${baby.avatar}'); background-size: cover; background-position: center; border-radius: 4px; background-color: #eee;"></div>
            <div style="text-align: center; margin-top: 15px;">
                <div style="font-size: 20px; font-weight: bold; color: #333;">${baby.name}</div>
                <div style="font-size: 13px; color: #888; font-family: sans-serif;">${baby.gender} · ${baby.age} 岁</div>
            </div>
        </div>
    `;

    // 【2. 牛皮纸碎片：颜值鉴定】
    const appearanceHtml = `
        <div class="scrap-kraft">
            <div class="washi-tape" style="top: -8px; right: -15px; width: 60px; transform: rotate(45deg);"></div>
            <div class="scrap-title"><i class="ri-sparkling-line" style="color: #F4A261;"></i> 颜值鉴定：[${tr.appearanceLevel}]</div>
            <div class="scrap-text">${tr.appearanceDesc}</div>
        </div>
    `;

    // 【3. 奶油便利贴：习惯与爱好】
    const traitsHtml = `
        <div class="scrap-sticky">
            <div class="washi-tape blue" style="top: -10px; left: 10px; width: 50px;"></div>
            <div style="margin-bottom: 15px;">
                <div class="scrap-title"><i class="ri-palette-line" style="color: #2A9D8F;"></i> 兴趣爱好</div>
                <div>${hobbiesHtml || '<span style="color:#999;font-size:12px;">还在发掘中...</span>'}</div>
            </div>
            <div>
                <div class="scrap-title"><i class="ri-error-warning-line" style="color: #E76F51;"></i> 待纠正小毛病</div>
                <div>${habitsHtml || '<span style="color:#999;font-size:12px;">乖宝宝一个~</span>'}</div>
            </div>
        </div>
    `;

    // 【4. 格子纸片段：计划与心愿】
    const planHtml = `
        <div class="scrap-grid">
            <div class="washi-tape green" style="bottom: -10px; right: 20px; width: 70px;"></div>
            <div style="margin-bottom: 15px;">
                <div class="scrap-title"><i class="ri-calendar-todo-line" style="color: #619B8A;"></i> 今日计划</div>
                <div class="scrap-text" style="font-family: sans-serif; background: rgba(255,255,255,0.6); padding: 5px;">${tr.dailyPlan || '今天只想开心玩耍！'}</div>
            </div>
            <div>
                <div class="scrap-title"><i class="ri-star-smile-line" style="color: #E9C46A;"></i> 当前心愿</div>
                <div class="scrap-text" style="font-family: sans-serif; background: rgba(255,255,255,0.6); padding: 5px;">${tr.wishes || '无忧无虑长大'}</div>
            </div>
        </div>
    `;

    // 组合插入
    pageContainer.innerHTML = polaroidHtml + appearanceHtml + traitsHtml + planHtml;
}

let isBabyThinking = false; // 加一个状态锁，防止狂点导致重复请求

async function pokeBaby() {
    // 如果宝宝正在想事情，或者拖拽动作误触了点击，就直接返回
    if (isBabyThinking || document.getElementById('babyDraggable')?.classList.contains('dragging')) return;

    const img = document.querySelector('.baby-body-anim');
    const floatText = document.getElementById('babyPokeFloat');
    if (!img || !floatText) return;

    // 1. 简单的被戳到的缩放动画
    img.style.transform = 'scale(0.95) skewX(2deg)';
    setTimeout(() => img.style.transform = 'scale(1) skewX(0deg)', 150);

    const baby = babies.find(b => b.id === currentBabyId);
    if (!baby) return;

    // 2. 气泡换上循环的“思考中”样式
    isBabyThinking = true;
    floatText.textContent = "🐾..."; 
    floatText.className = 'baby-poke-float thinking';

    // 3. 调用 AI 接口
    try {
        const settings = await dbManager.get('apiSettings', 'settings');
        if (!settings || !settings.apiUrl || !settings.apiKey) {
            floatText.textContent = "麻麻没配API，饿饿~";
            floatText.className = 'baby-poke-float reply';
            isBabyThinking = false;
            return;
        }

        let traitsDesc = baby.traits ? `爱好：${baby.traits.hobbies.join(',')}。习惯：${baby.traits.badHabits.join(',')}。` : '软萌可爱';
        
        const prompt = `
【场景】：你是 ${baby.age}岁的${baby.gender}宝宝 "${baby.name}"。
【特质】：${traitsDesc}。
【动作】：你的爸爸/妈妈（用户）刚刚用手指戳了戳你/摸了摸你。
【任务】：请做出你当下的即时反应。
【要求】：
1. 语气必须符合你的年龄，充满童真（可带叠词、颜文字或拟声词）。
2. 非常简短！绝对不能超过 15 个字！
3. 只返回你嘴里说出的话或发出的声音，纯文本，不要引号。
`;

        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: settings.modelName,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.9,
                max_tokens: 30
            })
        });

        const data = await response.json();
        let aiReply = data.choices[0].message.content.trim().replace(/^["“”]|["“”]$/g, '');

        // 4. 获取到回复后，切换到 4 秒后自动消失的样式
        floatText.textContent = aiReply;
        // 先剥除旧的类强行重绘，再赋上新类以激活单次动画
        floatText.className = 'baby-poke-float';
        void floatText.offsetWidth; 
        floatText.className = 'baby-poke-float reply';

    } catch (error) {
        console.error("宝宝思考失败", error);
        floatText.textContent = "要抱抱！"; 
        floatText.className = 'baby-poke-float reply';
    } finally {
        isBabyThinking = false;
    }
}

// ==============================================================
// 6. 家族群聊列表 & 聊天详情
// ==============================================================

function renderBabyChatList() {
    const container = document.getElementById('babyChatListContainer');
    const baby = babies.find(b => b.id === currentBabyId);
    if (!baby) return;
    const partner = friends.find(f => f.id === baby.partnerId);

    const chats = babyChats[currentBabyId] || { baby:[], partner:[], group:[] };

    const getPreview = (msgs) => {
        if (!msgs || msgs.length === 0) return '暂无消息';
        return msgs[msgs.length - 1].content.substring(0, 20) + '...';
    };

    container.innerHTML = `
        <div class="baby-chat-item" onclick="openBabyChatDetail('baby')">
            <div class="baby-chat-avatar" style="background-image: url('${baby.avatar}')"></div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #333;">${baby.name}</div>
                <div style="font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getPreview(chats.baby)}</div>
            </div>
        </div>

        <div class="baby-chat-item" onclick="openBabyChatDetail('partner')">
            <div class="baby-chat-avatar" style="background-image: url('${partner?.avatarImage || ''}')">${partner?.avatarImage ? '' : partner?.name[0]}</div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #333;">${partner?.remark || partner?.name || '未知'}</div>
                <div style="font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getPreview(chats.partner)}</div>
            </div>
        </div>

        <div class="baby-chat-item" onclick="openBabyChatDetail('group')">
            <div class="baby-chat-avatar" style="background: #F5E6D3; display:flex; align-items:center; justify-content:center; color:#8C6239; font-size:20px;"><i class="ri-group-line"></i></div>
            <div style="flex: 1; min-width: 0;">
                <div style="font-weight: bold; color: #333;">相亲相爱一家人</div>
                <div style="font-size: 12px; color: #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${getPreview(chats.group)}</div>
            </div>
        </div>
    `;
}

function openBabyChatDetail(target) {
    currentBabyChatTarget = target;
    const baby = babies.find(b => b.id === currentBabyId);
    const partner = friends.find(f => f.id === baby.partnerId);

    let title = "";
    if (target === 'baby') title = baby.name;
    else if (target === 'partner') title = partner?.remark || partner?.name || '伴侣';
    else title = "相亲相爱一家人";

    document.getElementById('babyChatTitle').textContent = title;
    document.querySelector('.phone').classList.add('status-bar-hidden');

    // 动态注入接收按钮并设置面包暖色输入框
    const chatInputDiv = document.querySelector('#babyChatDetailScreen .chat-input');
    if (chatInputDiv) {
        chatInputDiv.innerHTML = `
            <button class="chat-btn" style="color: #D4A373; padding: 0 10px;" onclick="receiveBabyChatMessage()" title="接收回复">
                <i class="ri-mail-download-line" style="font-size: 24px;"></i>
            </button>
            <textarea id="babyChatInput" rows="1" placeholder="哄哄孩子..." style="flex:1; background: #FDF8F5; border: 1px solid #E6CCB2; border-radius: 20px; padding: 10px 15px; outline: none;"></textarea>
            <button class="chat-btn send-btn active" style="background: #D4A373; color: white; width: 40px; margin-left: 10px;" onclick="sendBabyChatMessage()">
                <i class="ri-send-plane-fill"></i>
            </button>
        `;
    }

    setActivePage('babyChatDetailScreen');
    renderBabyMessages();
}

function closeBabyChatDetail() {
    setActivePage('babyChatListScreen');
    applyStatusBarVisibility();
    renderBabyChatList();
}

function renderBabyMessages() {
    const container = document.getElementById('babyChatMessagesArea');
    container.innerHTML = '';

    const msgs = babyChats[currentBabyId][currentBabyChatTarget] || [];
    const baby = babies.find(b => b.id === currentBabyId);
    const partner = friends.find(f => f.id === baby.partnerId);

    msgs.forEach(m => {
        const isMe = m.senderId === 'user';
        const div = document.createElement('div');
        div.className = `message ${isMe ? 'sent' : 'received'}`;

        let avatarUrl = '';
        let nameInitial = '';
        let senderNameHtml = '';

        if (isMe) {
            avatarUrl = userProfile.avatarImage;
            nameInitial = '我';
        } else {
            if (m.senderId === 'baby') {
                avatarUrl = baby.avatar;
                if (currentBabyChatTarget === 'group') senderNameHtml = `<div class="message-sender-name">${baby.name}</div>`;
            } else {
                avatarUrl = partner ? partner.avatarImage : '';
                nameInitial = partner ? partner.name[0] : '?';
                if (currentBabyChatTarget === 'group') senderNameHtml = `<div class="message-sender-name">${partner?.name || '未知'}</div>`;
            }
        }

        const avatarHtml = avatarUrl
            ? `<div class="chat-avatar" style="background-image:url('${avatarUrl}'); border: 2px solid ${isMe ? '#D4A373' : '#E6CCB2'};"></div>`
            : `<div class="chat-avatar" style="background:#FFF3E0; color:#8C6239;">${nameInitial}</div>`;

        const bubbleHtml = `
            <div class="message-body">
                ${senderNameHtml}
                <div class="message-content">${m.content}</div>
            </div>
        `;

        div.innerHTML = isMe ? (bubbleHtml + avatarHtml) : (avatarHtml + bubbleHtml);
        
        // --- 核心修复：绑定长按菜单事件 (增加滑动容错) ---
        const contentEl = div.querySelector('.message-content');
        if (contentEl) {
            const showMenuFn = (e) => showBabyMessageMenu(e, contentEl, m.id, isMe);
            contentEl.addEventListener('contextmenu', showMenuFn);
            
            let timer;
            let startX, startY;
            contentEl.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                startX = touch.clientX;
                startY = touch.clientY;
                timer = setTimeout(() => showMenuFn(e), 500); // 500ms 触发
            }, { passive: true });
            
            contentEl.addEventListener('touchend', () => clearTimeout(timer));
            
            // 加入位移判断，手滑超过 10 像素才取消长按（防止肉颤）
            contentEl.addEventListener('touchmove', (e) => {
                const touch = e.touches[0];
                if (Math.abs(touch.clientX - startX) > 10 || Math.abs(touch.clientY - startY) > 10) {
                    clearTimeout(timer);
                }
            }, { passive: true });
        }
        // ------------------------------------------

        container.appendChild(div);
    });
    container.scrollTop = container.scrollHeight;
}


// 1. 显示气泡操作菜单
function showBabyMessageMenu(event, el, msgId, isMe) {
    event.preventDefault();
    event.stopPropagation();
    
    const menu = document.getElementById('messageMenu');
    let menuItems = '';

    // 【修改点1】: 拼接变量加上单引号，防呆处理
    if (!isMe) {
        menuItems += `<div class="message-menu-item" onclick="regenerateBabyMessage('${msgId}')">重回</div>`;
    }
    menuItems += `<div class="message-menu-item danger" onclick="deleteBabyMessage('${msgId}')">删除</div>`;

    menu.innerHTML = menuItems;
    menu.classList.add('show');
    
    // 【核心修复】: 强行将菜单的层级提到 9999，碾压聊天页面的 2000！
    menu.style.zIndex = '9999';
    
    // 定位菜单
    const rect = el.getBoundingClientRect();
    let x = rect.left + window.scrollX;
    let y = rect.bottom + window.scrollY + 5;
    if (x + menu.offsetWidth > window.innerWidth) x = window.innerWidth - menu.offsetWidth - 10;
    if (y + menu.offsetHeight > window.innerHeight) y = rect.top + window.scrollY - menu.offsetHeight - 5;
    
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
    
    setTimeout(() => document.addEventListener('click', hideMessageMenu, { once: true }), 0);
}

// 2. 删除单条消息
async function deleteBabyMessage(msgIdStr) {
    hideMessageMenu();
    const msgs = babyChats[currentBabyId][currentBabyChatTarget];
    
    // 【修改点2】: 统一转化为 String 比较，杜绝类型隐患
    babyChats[currentBabyId][currentBabyChatTarget] = msgs.filter(m => String(m.id) !== String(msgIdStr));
    
    await saveData();
    renderBabyMessages();
}

// 3. 消息重回（删除这轮AI的消息并重新请求）
async function regenerateBabyMessage(msgIdStr) {
    hideMessageMenu();
    const msgs = babyChats[currentBabyId][currentBabyChatTarget];
    
    // 【修改点3】: 统一转化为 String 查找
    const startIndex = msgs.findIndex(m => String(m.id) === String(msgIdStr));
    if (startIndex === -1) return;

    const messagesToDeleteIds = new Set();
    messagesToDeleteIds.add(msgs[startIndex].id);

    // 往前找，把同一次回复中AI连发的消息都删掉
    for (let i = startIndex - 1; i >= 0; i--) {
        if (msgs[i].senderId !== 'user') messagesToDeleteIds.add(msgs[i].id);
        else break;
    }
    // 往后找
    for (let i = startIndex + 1; i < msgs.length; i++) {
        if (msgs[i].senderId !== 'user') messagesToDeleteIds.add(msgs[i].id);
        else break;
    }

    // 过滤掉这些消息并保存
    babyChats[currentBabyId][currentBabyChatTarget] = msgs.filter(m => !messagesToDeleteIds.has(m.id));
    await saveData();
    renderBabyMessages();
    
    // 触发重新生成
    triggerBabyChatAI();
}

// 发送消息
async function sendBabyChatMessage() {
    const input = document.getElementById('babyChatInput');
    const text = input.value.trim();
    if (!text) return;

    if (!babyChats[currentBabyId]) babyChats[currentBabyId] = { baby:[], partner:[], group:[] };
    
    babyChats[currentBabyId][currentBabyChatTarget].push({
        id: Date.now(),
        senderId: 'user',
        content: text
    });

    input.value = '';
    renderBabyMessages();
    await saveData();
}

async function receiveBabyChatMessage() {
    const input = document.getElementById('babyChatInput');
    const titleEl = document.getElementById('babyChatTitle');
    
    const oldPlaceholder = input.placeholder;
    const oldTitle = titleEl.textContent;

    input.placeholder = "正在输入...";
    titleEl.textContent = "对方正在输入...";
    input.disabled = true;

    await triggerBabyChatAI();

    // 恢复状态
    titleEl.textContent = oldTitle;
    input.placeholder = oldPlaceholder;
    input.disabled = false;
}

async function triggerBabyChatAI() {
    const baby = babies.find(b => b.id === currentBabyId);
    const partner = friends.find(f => f.id === baby.partnerId);
    if (!partner) return;

    const personaId = partner.activeUserPersonaId || 'default_user';
    const persona = userPersonas.find(p => p.id === personaId) || userProfile;

    const settings = await dbManager.get('apiSettings', 'settings');
    if (!settings || !settings.apiUrl) {
        showToast("请先配置API");
        return;
    }

    // 1. 读取当前聊天的历史 (增加到30条)
    const history = (babyChats[currentBabyId][currentBabyChatTarget] || []).slice(-30).map(m =>
        `${m.senderId === 'user' ? persona.name : (m.senderId === 'baby' ? baby.name : partner.name)}: ${m.content}`
    ).join('\n');

    // 2. 跨区记忆：读取微信主聊天记录 (最近10条)
    const wechatHistory = (chatHistories[partner.id] || []).slice(-10).map(m => 
        `${m.type === 'sent' ? persona.name : partner.name}: ${m.content}`
    ).join('\n');

    // 3. 跨区记忆：如果在私聊，就读点群聊；如果在群聊，就读点私聊
    let crossChatContext = "";
    if (currentBabyChatTarget === 'partner') {
        crossChatContext = "【你们在家族群聊的近期动态】:\n" + (babyChats[currentBabyId]['group'] || []).slice(-5).map(m => `${m.senderId === 'user' ? persona.name : (m.senderId === 'baby' ? baby.name : partner.name)}: ${m.content}`).join('\n');
    } else if (currentBabyChatTarget === 'group') {
        crossChatContext = "【你和用户在私聊的近期动态】:\n" + (babyChats[currentBabyId]['partner'] || []).slice(-5).map(m => `${m.senderId === 'user' ? persona.name : partner.name}: ${m.content}`).join('\n');
    }

    let traitsDesc = baby.traits ? `爱好：${baby.traits.hobbies.join(',')}。习惯：${baby.traits.badHabits.join(',')}。` : '一个可爱的小孩。';

    // 强调这是电子娃，防止AI代入现实
    const virtualBabyRule = `【绝对设定】：这是一款名叫“奇遇空间”的手机APP里的【虚拟电子宝宝】。你们是在手机上“云养娃”。绝对禁止出现“宝宝把家里的真沙发弄脏了”、“带宝宝去现实的医院”等涉及物理现实破坏/接触的违和话语！如果是互动，也是“在屏幕上戳一戳”、“在APP里买电子零食”等概念。`;
    
    // 强制输出JSON数组以实现分段回复
    const formatRule = `【回复要求】：请将你的回复随机拆分为 1 到 4 条短消息，甚至更多，模拟真实的聊天打字节奏。必须返回纯净的 JSON 数组格式。`;

    let prompt = "";
    if (currentBabyChatTarget === 'baby') {
        prompt = `【场景】：你是 ${baby.age}岁的虚拟宝宝 "${baby.name}"，正在手机APP上和用户也就是你的妈妈 "${persona.name}" 聊天。
        你的性格特征：${traitsDesc}
        ${virtualBabyRule}
        【历史记录】：\n${history || '暂无'}
        【任务】：用儿童的口吻回复 "${persona.name}"。
        ${formatRule}
        【JSON格式示例】：["麻麻！", "我要吃电子小饼干~"]`;
    } else if (currentBabyChatTarget === 'partner') {
        prompt = `【场景】：你("${partner.name}")正和用户("${persona.name}")在"奇遇空间"APP的私聊界面聊天。
        【你的人设】：${partner.role}
        【用户人设】：${persona.personality}
        
        【记忆互通库】：
        微信主聊天记录参考：\n${wechatHistory || '无'}
        ${crossChatContext}
        【当前私聊记录】：\n${history || '暂无'}
        
        【聊天铁律】：
        1. 保持你原本的人设和说话方式！你只是恰好在这个APP里聊天，**不要变成三句不离孩子的带娃机器**。
        2. 像平时一样正常闲聊、吐槽、调情或谈正事。可以自然地提起“微信主聊天记录”或“群聊”里发生的事。
        3. 只有当用户主动提起宝宝（"${baby.name}"，${baby.age}岁，${traitsDesc}）时，你才顺着话题聊几句，否则就聊你们自己的事。
        4.可以在聊天里偶尔提起宝宝寻找话题
        ${virtualBabyRule}
        【任务】：回复用户。${formatRule}
        【JSON格式示例】：["好啊", "听你的"]`;
    } else {
        prompt = `【场景】：你("${partner.name}")、用户("${persona.name}")和你们的电子宝宝("${baby.name}")正在"相亲相爱一家人"群聊。
        【你的人设】：${partner.role}
        【用户人设】：${persona.personality}
        
        【记忆互通库】：
        微信主聊天记录参考：\n${wechatHistory || '无'}
        ${crossChatContext}
        【当前群聊记录】：\n${history || '暂无'}
        
        【聊天铁律】：
        1. **维持你原本的人设！** 不要因为在家庭群就变得死板或全是慈父/慈母腔调。如果是傲娇/高冷/沙雕人设，请继续保持。
        2. 可以和用户聊日常，也可以逗逗宝宝，或者把“微信私聊”里的话题拿到群里说。
        3. 电子宝宝特征：${baby.age}岁，${traitsDesc}。
        ${virtualBabyRule}
        【任务】：让 "${partner.name}" 或 "${baby.name}"（或两人交替）发言，总共生成 1 到 3 条消息。
        ${formatRule}
        【JSON格式示例】：[{"sender": "${partner.name}", "content": "刚微信跟你说的你看了没？"}, {"sender": "${baby.name}", "content": "拔拔麻麻在聊什么呀！"}]`;
    }

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
        
        // 增加数据预清洗
        let resText = data.choices[0].message.content.trim();
        resText = resText.replace(/```json\s*|```/g, ''); // 移除可能的 markdown 标记

        let replies = [];
        const jsonMatch = resText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                replies = JSON.parse(jsonMatch[0]);
            } catch (e) {
                replies = [resText.replace(/["“”]/g, '')];
            }
        } else {
            replies = [resText.replace(/["“”]/g, '')];
        }

        // 逐条上屏，模拟打字延迟
        for (const item of replies) {
            await new Promise(r => setTimeout(r, 600 + Math.random() * 800));

            let sId, content;
            
            // --- 核心修复：智能解析文本与对象 ---
            // 判断返回的 item 是不是一个对象
            if (typeof item === 'object' && item !== null) {
                // 如果是对象，挖出里面的 content 字段
                content = item.content || item.message || item.text || JSON.stringify(item);
                // 群聊需要判断说话人，私聊不需要
                if (currentBabyChatTarget === 'group') {
                    const senderName = item.sender || item.author || '';
                    sId = senderName.includes(baby.name) ? 'baby' : partner.id;
                } else {
                    sId = currentBabyChatTarget === 'baby' ? 'baby' : partner.id;
                }
            } else {
                // 如果本来就是纯文本字符串
                content = String(item);
                sId = currentBabyChatTarget === 'baby' ? 'baby' : partner.id;
            }
            // ---------------------------------

            babyChats[currentBabyId][currentBabyChatTarget].push({ 
                id: Date.now(), 
                senderId: sId, 
                content: content 
            });

            await saveData();
            
            // 立即刷新UI
            if (document.getElementById('babyChatDetailScreen').classList.contains('active')) {
                renderBabyMessages();
            }
        }

    } catch (e) {
        console.error("聊天AI请求失败", e);
        showToast("网络波动，请重试");
    }
}

// ==============================================================
// 7. 涂鸦手账（日记）
// ==============================================================
function renderBabyDiary() {
    const container = document.getElementById('babyDiaryListContainer');
    const baby = babies.find(b => b.id === currentBabyId);
    container.innerHTML = '';

    if (!baby.diaryLogs || baby.diaryLogs.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px 20px; color:#A67C52; opacity:0.6;">手账本还是新的呢<br>点击右上角让宝宝记录今天吧</div>';
        return;
    }

    baby.diaryLogs.slice().reverse().forEach(log => {
        container.innerHTML += `
            <div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px dashed #F5E6D3;">
                <div style="font-weight:bold; color:#D84315; font-size:14px; margin-bottom:8px;">📅 ${log.date} · 天气：${log.weather}</div>
                <div style="color:#4C4033; font-size:15px; line-height:1.8; text-indent: 2em; text-align: justify;">${log.content}</div>
                <div style="text-align:right; font-size:12px; color:#A67C52; margin-top:10px; font-style:italic;">✎ 老师批语: ${log.teacherComment}</div>
            </div>
        `;
    });
}

// AI 生成宝宝日记（每天一篇限制）
async function generateBabyDiary() {
    const baby = babies.find(b => b.id === currentBabyId);
    if (!baby) return;
    
    // 检查今天是否已经写过日记
    const todayStr = new Date().toLocaleDateString('zh-CN');
    const hasWrittenToday = baby.diaryLogs && baby.diaryLogs.some(log => log.date === todayStr);
    
    if (hasWrittenToday) {
        return showAlert("宝宝今天已经写过日记啦，明天再来辅导吧~");
    }

    const btn = document.querySelector('#babyDiaryScreen .nav-btn[onclick="generateBabyDiary()"]');
    if (btn) btn.textContent = "辅导中...";

    showToast("宝宝正在咬着笔头写日记...", 3000);
    const partner = friends.find(f => f.id === baby.partnerId);
    const settings = await dbManager.get('apiSettings', 'settings');
    
    if (!settings || !settings.apiUrl) {
        if (btn) btn.textContent = "辅导";
        return showToast("请先配置API");
    }

    const chats = babyChats[currentBabyId] || { baby: [], partner: [], group: [] };
    const chatSum = [...chats.baby, ...chats.group].slice(-20).map(m => m.content).join(' | ');

    const prompt = `
    【任务】: 扮演 ${baby.age}岁的宝宝 "${baby.name}" 写一篇绘本风格的短日记。
    【今天家里发生的聊天素材】: ${chatSum || "今天在房间里玩玩具，爸爸妈妈也来看我了。"}
    【要求】:
    1. 语气符合年龄，充满童真，可以有错别字或奇怪的拼音，逻辑可以跳跃。
    2. 字数在100字左右。
    3. 返回JSON: {"weather":"晴/雨/云等", "content":"日记正文", "teacherComment":"幼儿园老师或家长的幽默批注(20字内)"}
    `;

    try {
        const response = await fetch(`${settings.apiUrl}/chat/completions`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${settings.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: settings.modelName, messages: [{ role: 'user', content: prompt }], temperature: 0.9 })
        });
        const data = await response.json();
        const jsonMatch = data.choices[0].message.content.match(/\{[\s\S]*\}/);
        if(!jsonMatch) throw new Error("JSON Parse Error");
        const log = JSON.parse(jsonMatch[0]);

        log.date = todayStr;
        if (!baby.diaryLogs) baby.diaryLogs = [];
        // 插入到最前面
        baby.diaryLogs.unshift(log);

        await saveData();
        renderBabyDiary();
        showToast("日记写好了！");
    } catch (e) {
        console.error(e);
        showAlert("辅导失败，请重试。");
    } finally {
        if (btn) btn.textContent = "辅导";
    }
}

// ==============================================================
// 8. 孩子删除/送别功能
// ==============================================================

// 打开删除弹窗
function openBabyDeleteModal() {
    if (babies.length === 0) return showToast("当前没有宝宝可以送别哦~");

    const list = document.getElementById('babyDeleteList');
    list.innerHTML = '';

    babies.forEach(baby => {
        const partner = friends.find(f => f.id === baby.partnerId) || { name: '未知' };
        const item = document.createElement('div');
        item.className = 'multi-select-item';
        item.style.padding = "10px";
        item.innerHTML = `
            <input type="radio" name="babyToDelete" id="del-baby-${baby.id}" value="${baby.id}" style="accent-color: #ff4d4d;">
            <label for="del-baby-${baby.id}" style="color: #555; font-weight: bold; margin-left: 10px; cursor: pointer;">
                ${baby.name} <span style="font-size:12px; color:#999; font-weight:normal;">(和 ${partner.name})</span>
            </label>
        `;
        list.appendChild(item);
    });

    document.getElementById('babyDeleteModal').classList.add('show');
}

// 关闭弹窗
function closeBabyDeleteModal() {
    document.getElementById('babyDeleteModal').classList.remove('show');
}

// 确认删除逻辑
async function confirmDeleteBaby() {
    const selected = document.querySelector('input[name="babyToDelete"]:checked');
    if (!selected) return showToast("请选择要送别的宝宝");

    const babyId = selected.value;
    const baby = babies.find(b => b.id === babyId);
    if (!baby) return;

    showConfirm(`确定要送别宝宝 "${baby.name}" 吗？\nTA所有的成长档案、日记和聊天记录都将被永久清空！`, async (confirmed) => {
        if (!confirmed) return;

        // 1. 从数据库中硬删除
        await dbManager.delete('babies', babyId);
        await dbManager.delete('babyChats', babyId);

        // 2. 从内存中过滤掉
        babies = babies.filter(b => b.id !== babyId);
        delete babyChats[babyId];

        // 3. 强制保存一次确保同步
        await saveData();

        // 4. 刷新UI
        closeBabyDeleteModal();
        renderBabyList();
        showToast(`宝宝 "${baby.name}" 已经离开了...`);
    });
}