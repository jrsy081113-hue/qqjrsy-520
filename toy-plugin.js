/**
 * 智能玩具控制插件 (Toy Plugin) - 终极多协议盲狙暴力破解版
 * 包含：永久免密验证、全局通道嗅探、防阻塞延迟、11种主流机器码轰炸
 */

(function() {
    // ==========================================
    // 1. 动态注入 HTML 和 CSS (不污染主文件)
    // ==========================================
    
    const toyStyles = `
        /* 强制提升这两个弹窗的层级 */
        #toyPasswordModal { z-index: 99998 !important; }
        #toyControlModal { z-index: 99999 !important; }

        /* 【核心修复】：强制提升主系统所有提示弹窗的层级，确保它们永远在最顶端！ */
        #alertModal, #confirmModal { z-index: 100005 !important; }
        #toast-notification { z-index: 100005 !important; }

        /* 玩具控制面板专属样式 */
        .toy-control-panel {
            text-align: center;
            padding: 10px 0;
        }
        .toy-status-box {
            background: #f9f9f9;
            border-radius: 12px;
            padding: 15px;
            margin-bottom: 20px;
            border: 1px solid #eee;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .toy-status-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background-color: #ccc;
            margin-right: 8px;
            display: inline-block;
            transition: all 0.3s;
        }
        .toy-status-dot.connected {
            background-color: #07c160;
            box-shadow: 0 0 8px rgba(7, 193, 96, 0.5);
        }
        .toy-visualizer {
            width: 80px;
            height: 80px;
            margin: 0 auto 20px;
            background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
            border-radius: 40% 60% 70% 30% / 40% 50% 60% 50%;
            box-shadow: 0 10px 20px rgba(255, 154, 158, 0.3);
            transition: filter 0.1s ease;
        }
        /* 震动动画 */
        @keyframes toyVibrate {
            0% { transform: translate(0, 0) scale(1); }
            20% { transform: translate(-2px, 2px) scale(1.02); }
            40% { transform: translate(-2px, -2px) scale(0.98); }
            60% { transform: translate(2px, 2px) scale(1.02); }
            80% { transform: translate(2px, -2px) scale(0.98); }
            100% { transform: translate(0, 0) scale(1); }
        }
        .toy-slider-group {
            margin-bottom: 20px;
            text-align: left;
        }
        .toy-slider-group label {
            display: flex;
            justify-content: space-between;
            font-size: 14px;
            color: #333;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .toy-slider {
            width: 100%;
            -webkit-appearance: none;
            height: 6px;
            background: #eee;
            border-radius: 3px;
            outline: none;
        }
        .toy-slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: #fff;
            border: 3px solid #ff4d4f;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            cursor: pointer;
        }
        .toy-pattern-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 20px;
        }
        .toy-pattern-btn {
            padding: 10px 5px;
            border: 1px solid #eee;
            background: #fff;
            border-radius: 8px;
            font-size: 12px;
            color: #666;
            cursor: pointer;
            transition: all 0.2s;
        }
        .toy-pattern-btn.active {
            background: #fff0f0;
            border-color: #ff4d4f;
            color: #ff4d4f;
            font-weight: bold;
        }
        .wechat-dark-mode .toy-status-box { background: #2c2c2e; border-color: #444; color:#fff; }
        .wechat-dark-mode .toy-slider-group label { color: #ddd; }
        .wechat-dark-mode .toy-slider { background: #444; }
        .wechat-dark-mode .toy-pattern-btn { background: #2c2c2e; border-color: #444; color: #ccc; }
        .wechat-dark-mode .toy-pattern-btn.active { background: #3a1c1e; border-color: #ff4d4f; color: #ff4d4f; }
    `;

    const toyHTML = `
        <!-- 1. 密码输入弹窗 -->
        <div id="toyPasswordModal" class="modal">
            <div class="modal-content" style="max-width: 300px; border-radius: 20px;">
                <div class="modal-title" style="color: #ff4d4f; border-bottom: none;">设备安全认证</div>
                <div style="font-size: 12px; color: #999; text-align: center; margin-bottom: 15px;">
                    请输入私密控制密码
                </div>
                <input type="password" class="modal-input" id="toyPwdInput" placeholder="输入密码" style="text-align: center; letter-spacing: 5px; font-size: 20px; background: #f5f5f5;" maxlength="4">
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button class="modal-btn modal-btn-cancel" onclick="closeToyPasswordModal()">取消</button>
                    <button class="modal-btn modal-btn-confirm" style="background-color: #ff4d4f; color: #fff; border: none;" onclick="verifyToyPassword()">连接</button>
                </div>
            </div>
        </div>

        <!-- 2. 玩具主控面板弹窗 -->
        <div id="toyControlModal" class="modal">
            <div class="modal-content" style="width: 90%; max-width: 360px; border-radius: 24px;">
                <div class="modal-title" style="border-bottom: none;">远程设备控制</div>
                
                <div class="toy-control-panel">
                    <!-- 状态显示 -->
                    <div class="toy-status-box">
                        <div style="display:flex; align-items:center; font-size:14px; font-weight:bold;">
                            <span class="toy-status-dot" id="toyStatusDot"></span>
                            <span id="toyStatusText">等待连接设备...</span>
                        </div>
                        <button class="bw-chip-btn" id="toyConnectBtn" style="margin:0; border-color:#ff4d4f; color:#ff4d4f;" onclick="startBluetoothConnection()">
                            <i class="ri-bluetooth-connect-line"></i> 搜索
                        </button>
                    </div>

                    <!-- 震动可视化球 -->
                    <div class="toy-visualizer" id="toyVisualizer"></div>

                    <!-- 强度控制 -->
                    <div class="toy-slider-group">
                        <label>
                            <span>震动强度 (Speed)</span>
                            <span id="toySpeedValue" style="color:#ff4d4f;">0%</span>
                        </label>
                        <input type="range" class="toy-slider" id="toySpeedSlider" min="0" max="100" value="0" oninput="updateToySpeed(this.value)">
                    </div>

                    <!-- 频率/模式控制 -->
                    <div class="toy-slider-group">
                        <label><span>节奏模式 (Pattern)</span></label>
                        <div class="toy-pattern-grid">
                            <button class="toy-pattern-btn active" onclick="setToyPattern('constant', this)">持续 (Constant)</button>
                            <button class="toy-pattern-btn" onclick="setToyPattern('pulse', this)">脉冲 (Pulse)</button>
                            <button class="toy-pattern-btn" onclick="setToyPattern('wave', this)">波浪 (Wave)</button>
                        </div>
                    </div>
                </div>

                <div class="modal-buttons" style="margin-top: 10px;">
                    <button class="modal-btn modal-btn-cancel" onclick="closeToyControlModal()" style="width: 100%;">关闭面板</button>
                </div>
            </div>
        </div>
    `;

    // 注入 CSS 和 HTML
    const styleTag = document.createElement('style');
    styleTag.innerHTML = toyStyles;
    document.head.appendChild(styleTag);
    document.body.insertAdjacentHTML('beforeend', toyHTML);


    // ==========================================
    // 2. 核心逻辑变量
    // ==========================================
    
    let bluetoothDevice = null;
    let activeCharacteristics = []; // 存储所有可用的写入通道
    
    let currentSpeed = 0;
    let currentPattern = 'constant';
    let vibrationInterval = null;

    // 加入更多厂商的专属服务 UUID (增加了杰士邦、迷姬常用的 Nordic UART，以及标准128位格式防拦截)
    const TOY_SERVICES = [
        '50300001-0023-4bd4-bbd5-a6920e4c5653', // Lovense
        '78667579-2868-4bd0-a8ce-f6018d456340', // Magic Motion
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART (迷姬、杰士邦及大量国产常用)
        '0000fff0-0000-1000-8000-00805f9b34fb', // 国产公版 FFF0
        '0000ffe0-0000-1000-8000-00805f9b34fb', // 国产公版 FFE0
        '0000fee0-0000-1000-8000-00805f9b34fb', // 国产公版 FEE0
        '0000ff00-0000-1000-8000-00805f9b34fb', // 国产公版 FF00 (部分雷霆)
        '00001802-0000-1000-8000-00805f9b34fb'  // 旧版防丢器兼容
    ];

    // ==========================================
    // 3. UI 交互函数 (暴露给全局)
    // ==========================================

    window.openToyPasswordModal = function() {
        // 关闭底部的加号菜单
        if (typeof hideFunctionMenus === 'function') hideFunctionMenus();
        
        // 检查本地存储，看是否已经验证过密码
        if (localStorage.getItem('jrsy_toy_authenticated') === 'true') {
            // 如果验证过了，直接打开面板，跳过密码
            openToyControlModal();
        } else {
            // 如果没验证过，清空输入框并显示密码弹窗
            document.getElementById('toyPwdInput').value = '';
            document.getElementById('toyPasswordModal').classList.add('show');
        }
    };

    window.closeToyPasswordModal = function() {
        document.getElementById('toyPasswordModal').classList.remove('show');
    };

    window.verifyToyPassword = function() {
        const pwd = document.getElementById('toyPwdInput').value;
        if (pwd === '3700') {
            // 密码正确，存入本地存储，永久免密
            localStorage.setItem('jrsy_toy_authenticated', 'true');
            
            closeToyPasswordModal();
            setTimeout(() => {
                openToyControlModal();
            }, 100);
        } else {
            // 借用主文件的 showAlert
            if (typeof showAlert === 'function') {
                showAlert('密码错误，无法验证设备！');
            } else {
                alert('密码错误，无法验证设备！');
            }
            document.getElementById('toyPwdInput').value = '';
        }
    };

    window.openToyControlModal = function() {
        document.getElementById('toyControlModal').classList.add('show');
        // 初始化滑块
        document.getElementById('toySpeedSlider').value = 0;
        updateToySpeed(0);
    };

    window.closeToyControlModal = function() {
        document.getElementById('toyControlModal').classList.remove('show');
        // 关闭时强制停止玩具
        updateToySpeed(0);
        document.getElementById('toySpeedSlider').value = 0;
    };

    window.updateToySpeed = function(val) {
        currentSpeed = parseInt(val);
        document.getElementById('toySpeedValue').textContent = currentSpeed + '%';
        
        // 视觉效果同步
        const visualizer = document.getElementById('toyVisualizer');
        if (currentSpeed > 0) {
            const dur = 1.1 - (currentSpeed / 100); 
            visualizer.style.animation = `toyVibrate ${dur}s infinite linear`;
            visualizer.style.filter = `brightness(${1 + (currentSpeed/200)})`;
        } else {
            visualizer.style.animation = 'none';
            visualizer.style.filter = 'brightness(1)';
        }

        // 发送指令给硬件
        applyVibrationToDevice();
    };

    window.setToyPattern = function(pattern, btnElement) {
        currentPattern = pattern;
        
        // 更新按钮 UI
        document.querySelectorAll('.toy-pattern-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
        
        // 重新应用震动
        applyVibrationToDevice();
    };

    // ==========================================
    // 4. Web Bluetooth API (防阻塞延迟 & 全频道版)
    // ==========================================

    window.startBluetoothConnection = async function() {
        if (!navigator.bluetooth) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                if (typeof showAlert === 'function') {
                    showAlert("🍎 苹果 iOS 系统原生限制：不支持网页直连蓝牙。\n\n请前往 App Store 免费下载【Bluefy】浏览器，用它打开本网页即可完美连接！");
                } else {
                    alert("苹果iOS请下载 Bluefy 浏览器打开本网页！");
                }
            } else {
                if (typeof showAlert === 'function') showAlert("您的浏览器不支持蓝牙功能，已开启虚拟演示。建议使用 Android 版 Chrome。");
            }
            simulateConnection();
            return;
        }

        try {
            document.getElementById('toyStatusText').textContent = "正在搜索蓝牙...";
            document.getElementById('toyConnectBtn').innerHTML = '<i class="ri-loader-4-line fa-spin"></i> 搜索中';

            // 请求连接：全开权限
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: TOY_SERVICES
            });

            document.getElementById('toyStatusText').textContent = "正在握手...";
            const server = await bluetoothDevice.gatt.connect();
            bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

            // 【核心修复】：加上 800 毫秒延迟！给国产芯片一点反应时间，防止 No Services found 报错
            await new Promise(resolve => setTimeout(resolve, 800));

            document.getElementById('toyStatusText').textContent = "正在扫描可用通道...";
            activeCharacteristics = [];

            // 获取设备暴露的所有主服务
            const services = await server.getPrimaryServices();
            
            // 遍历所有服务，找出所有具备“写”权限的特征值 (盲狙核心)
            for (const service of services) {
                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        activeCharacteristics.push(char);
                    }
                }
            }

            if (activeCharacteristics.length > 0) {
                console.log(`[Toy Connected] 成功找到 ${activeCharacteristics.length} 个可写通道。`);
                onConnected(bluetoothDevice.name);
            } else {
                throw new Error("设备已连接，但未开放任何控制通道。请确认官方APP已彻底退清后台！");
            }

        } catch (error) {
            console.error("蓝牙连接失败:", error);
            document.getElementById('toyStatusText').textContent = "连接失败";
            document.getElementById('toyConnectBtn').innerHTML = '<i class="ri-bluetooth-connect-line"></i> 搜索';
            
            if (typeof showAlert === 'function' && !error.message.includes("cancelled")) {
                showAlert("连接失败：\n" + error.message);
            }
            bluetoothDevice = null;
        }
    };

    function onConnected(deviceName) {
        document.getElementById('toyStatusDot').classList.add('connected');
        document.getElementById('toyStatusText').textContent = `已连接: ${deviceName || '智能设备'}`;
        
        const btn = document.getElementById('toyConnectBtn');
        btn.innerHTML = '<i class="ri-link-unlink-m"></i> 断开';
        btn.onclick = disconnectToy;
        
        if (typeof showToast === 'function') showToast("设备连接成功，通道已绑定");
    }

    function onDisconnected() {
        document.getElementById('toyStatusDot').classList.remove('connected');
        document.getElementById('toyStatusText').textContent = `等待连接设备...`;
        
        const btn = document.getElementById('toyConnectBtn');
        btn.innerHTML = '<i class="ri-bluetooth-connect-line"></i> 搜索';
        btn.onclick = startBluetoothConnection;
        
        bluetoothDevice = null;
        activeCharacteristics = [];
    }

    function disconnectToy() {
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
        }
        onDisconnected();
    }

    function simulateConnection() {
        setTimeout(() => { onConnected("虚拟演示设备"); }, 1500);
    }

    // ==========================================
    // 5. 硬件通信引擎 (终极暴力破解发包器)
    // ==========================================

    function applyVibrationToDevice() {
        if (vibrationInterval) {
            clearInterval(vibrationInterval);
            vibrationInterval = null;
        }

        if (currentSpeed === 0) {
            sendBluetoothCommand(0);
            return;
        }

        if (currentPattern === 'constant') {
            sendBluetoothCommand(currentSpeed);
        } else if (currentPattern === 'pulse') {
            let isOn = true;
            vibrationInterval = setInterval(() => {
                sendBluetoothCommand(isOn ? currentSpeed : 0);
                isOn = !isOn;
            }, 500); 
        } else if (currentPattern === 'wave') {
            let waveSpeed = 0;
            let direction = 1;
            vibrationInterval = setInterval(() => {
                waveSpeed += direction * (currentSpeed / 10);
                if (waveSpeed >= currentSpeed) { waveSpeed = currentSpeed; direction = -1; }
                if (waveSpeed <= 0) { waveSpeed = 0; direction = 1; }
                sendBluetoothCommand(Math.round(waveSpeed));
            }, 100); 
        }
    }

    async function sendBluetoothCommand(speedValue) {
        if (activeCharacteristics.length === 0) {
            console.log(`[Toy Virtual] 虚拟震动 -> ${speedValue}%`);
            return;
        }

        // 杰士邦、迷姬等国产品牌马达等级通常是 0-10 级，海外多为 0-20 级
        let speed10 = Math.round(speedValue / 10); 
        let speed20 = Math.round(speedValue / 5);
        if (speed10 > 10) speed10 = 10;
        if (speed20 > 20) speed20 = 20;
        if (speed10 < 0) speed10 = 0;
        if (speed20 < 0) speed20 = 0;

        // 【核心破解区】：市面 99% 国产无加密玩具的机器码字典合集
        const payloads = [
            // 1. 杰士邦/迷姬 常用格式 A (0x55开头，最经典方案)
            new Uint8Array([0x55, 0x04, speed10, 0x00, 0x00, 0xFF]),
            new Uint8Array([0x55, 0x06, speed10, 0x00, 0x00, 0xFF]),

            // 2. 杰士邦/迷姬 常用格式 B (0xCC 0xAA 开头)
            new Uint8Array([0xCC, 0xAA, speed10, 0x00, 0x00, 0xFF]),

            // 3. 常见公版芯片 (0xAA 0x55 开头，带动态校验和)
            new Uint8Array([0xAA, 0x55, 0x01, 0x02, speed10, (0x01 + 0x02 + speed10) & 0xFF]),
            new Uint8Array([0xAA, 0x55, 0x03, speed10, (0x03 + speed10) & 0xFF]),

            // 4. 极简串口指令 (单字节/双字节，部分老款迷姬使用)
            new Uint8Array([speed10]),
            new Uint8Array([0x01, speed10]),
            new Uint8Array([0x02, 0x01, speed10]),

            // 5. 魔动 Magic Motion 专属指令
            new Uint8Array([0x0B, 0xFF, 0x04, 0x0A, 0x55, 0x54, 0x00, 0x00, 0x00, speed10, 0x00]),

            // 6. 纯文本指令 (Lovense 及 部分走 Nordic UART 的新款国产品牌)
            new TextEncoder().encode(`Vibrate:${speed20};`),
            new TextEncoder().encode(`Motor:${speed10};`),
            new TextEncoder().encode(`vibration:${speed10};`)
        ];

        // 暴力轰炸：把所有子弹打进所有找到的通道里
        for (const char of activeCharacteristics) {
            for (const payload of payloads) {
                try {
                    // 优先使用无回执模式，防止快速滑动时蓝牙通道堵塞
                    if (char.properties.writeWithoutResponse) {
                        await char.writeValueWithoutResponse(payload);
                    } else if (char.properties.write) {
                        await char.writeValue(payload);
                    }
                } catch (e) {
                    // 发送失败直接忽略，因为该通道可能不接收这种格式的指令
                }
                
                // 【极其关键】：每发一种指令，强制停顿 15 毫秒。
                // 蓝牙芯片处理速度很慢，如果瞬间灌入 11 个包会直接死机断连！
                await new Promise(r => setTimeout(r, 15)); 
            }
        }
    }

})();
