/**
 * 智能玩具控制插件 (Toy Plugin) - 终极多协议适配 & iOS支持版
 * 包含：密码验证、Web Bluetooth 蓝牙连接、多品牌协议嗅探、震动频率/强度控制
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
    let bluetoothCharacteristic = null;
    
    let currentSpeed = 0;
    let currentPattern = 'constant';
    let vibrationInterval = null;

    // 智能多品牌协议配置
    let detectedProtocol = 'unknown'; 
    const TOY_SERVICES = {
        LOVENSE: '50300001-0023-4bd4-bbd5-a6920e4c5653',
        MAGIC_MOTION: '78667579-2868-4bd0-a8ce-f6018d456340',
        GENERIC_FFF0: 0xFFF0,
        GENERIC_FFE0: 0xFFE0
    };

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
    // 4. Web Bluetooth API (多品牌智能适配版)
    // ==========================================

    window.startBluetoothConnection = async function() {
        if (!navigator.bluetooth) {
            // 专门针对 iOS 设备的拦截与提示
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            
            if (isIOS) {
                if (typeof showAlert === 'function') {
                    showAlert("苹果 iOS 系统原生浏览器不支持蓝牙控制。\n\n🍏 请前往 App Store 免费下载【Bluefy】浏览器，用它打开本网页即可完美连接！");
                } else {
                    alert("苹果 iOS 系统原生浏览器不支持蓝牙控制。\n请前往 App Store 下载【Bluefy】浏览器打开本网页！");
                }
            } else {
                if (typeof showAlert === 'function') {
                    showAlert("您的浏览器不支持 Web Bluetooth API。\n建议使用安卓 Chrome 或 Edge 浏览器。\n(已开启模拟演示模式)");
                }
            }
            simulateConnection();
            return;
        }

        try {
            document.getElementById('toyStatusText').textContent = "正在搜索蓝牙...";
            document.getElementById('toyConnectBtn').innerHTML = '<i class="ri-loader-4-line fa-spin"></i> 搜索中';

            // 1. 请求连接：把所有可能用到的服务 UUID 都声明
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true, 
                optionalServices: [
                    TOY_SERVICES.LOVENSE, 
                    TOY_SERVICES.MAGIC_MOTION, 
                    TOY_SERVICES.GENERIC_FFF0, 
                    TOY_SERVICES.GENERIC_FFE0,
                    '00001802-0000-1000-8000-00805f9b34fb' // 兼容旧版或标准设备
                ]
            });

            document.getElementById('toyStatusText').textContent = "正在连接服务...";
            const server = await bluetoothDevice.gatt.connect();
            bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

            document.getElementById('toyStatusText').textContent = "正在识别设备协议...";
            
            // 2. 智能嗅探与通道建立
            bluetoothCharacteristic = null;
            detectedProtocol = 'unknown';

            // 尝试 A：Lovense (小怪兽/逗豆鸟等海外版)
            try {
                const service = await server.getPrimaryService(TOY_SERVICES.LOVENSE);
                bluetoothCharacteristic = await service.getCharacteristic('50300002-0023-4bd4-bbd5-a6920e4c5653');
                detectedProtocol = 'LOVENSE';
            } catch(e) { console.log("Not Lovense protocol"); }

            // 尝试 B：Magic Motion (魔动)
            if (!bluetoothCharacteristic) {
                try {
                    const service = await server.getPrimaryService(TOY_SERVICES.MAGIC_MOTION);
                    bluetoothCharacteristic = await service.getCharacteristic('7866757a-2868-4bd0-a8ce-f6018d456340');
                    detectedProtocol = 'MAGIC_MOTION';
                } catch(e) { console.log("Not Magic Motion protocol"); }
            }

            // 尝试 C：国产公版 FFF0 (雷霆、司沃康、各种白牌)
            if (!bluetoothCharacteristic) {
                try {
                    const service = await server.getPrimaryService(TOY_SERVICES.GENERIC_FFF0);
                    // 通常 FFF2 或 FFF1 是写入通道
                    try { bluetoothCharacteristic = await service.getCharacteristic(0xFFF2); } 
                    catch(e) { bluetoothCharacteristic = await service.getCharacteristic(0xFFF1); }
                    detectedProtocol = 'GENERIC_FFF0';
                } catch(e) { console.log("Not FFF0 protocol"); }
            }

            // 尝试 D：串口透传 FFE0
            if (!bluetoothCharacteristic) {
                try {
                    const service = await server.getPrimaryService(TOY_SERVICES.GENERIC_FFE0);
                    bluetoothCharacteristic = await service.getCharacteristic(0xFFE1);
                    detectedProtocol = 'GENERIC_FFE0';
                } catch(e) { console.log("Not FFE0 protocol"); }
            }

            // 3. 判断是否嗅探成功
            if (bluetoothCharacteristic) {
                console.log(`[Toy Connected] 成功识别协议: ${detectedProtocol}`);
                onConnected(bluetoothDevice.name);
            } else {
                throw new Error("设备已连接，但无法识别其通信通道。该玩具可能使用了未知的私有加密协议。");
            }

        } catch (error) {
            console.error("蓝牙连接/嗅探失败:", error);
            document.getElementById('toyStatusText').textContent = "连接失败或未开放通道";
            document.getElementById('toyConnectBtn').innerHTML = '<i class="ri-bluetooth-connect-line"></i> 搜索';
            
            if (typeof showAlert === 'function') {
                // 如果是用户主动取消，不弹长报错
                if (error.message.includes("User cancelled")) return;
                showAlert("连接失败：\n" + error.message);
            }
            bluetoothDevice = null;
        }
    };

    function onConnected(deviceName) {
        document.getElementById('toyStatusDot').classList.add('connected');
        document.getElementById('toyStatusText').textContent = `已连接: ${deviceName || '智能玩具'}`;
        
        const btn = document.getElementById('toyConnectBtn');
        btn.innerHTML = '<i class="ri-link-unlink-m"></i> 断开';
        btn.onclick = disconnectToy;
        
        if (typeof showToast === 'function') showToast("设备连接成功");
    }

    function onDisconnected() {
        document.getElementById('toyStatusDot').classList.remove('connected');
        document.getElementById('toyStatusText').textContent = `等待连接设备...`;
        
        const btn = document.getElementById('toyConnectBtn');
        btn.innerHTML = '<i class="ri-bluetooth-connect-line"></i> 搜索';
        btn.onclick = startBluetoothConnection;
        
        bluetoothDevice = null;
        bluetoothCharacteristic = null;
        detectedProtocol = 'unknown';
    }

    function disconnectToy() {
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bluetoothDevice.gatt.disconnect();
        }
        onDisconnected();
    }

    function simulateConnection() {
        setTimeout(() => {
            onConnected("虚拟演示设备");
        }, 1500);
    }

    // ==========================================
    // 5. 硬件通信引擎 (多协议翻译器)
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
        } 
        else if (currentPattern === 'pulse') {
            let isOn = true;
            vibrationInterval = setInterval(() => {
                sendBluetoothCommand(isOn ? currentSpeed : 0);
                isOn = !isOn;
            }, 500); 
        } 
        else if (currentPattern === 'wave') {
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
        if (!bluetoothCharacteristic) {
            console.log(`[Toy Virtual] 虚拟震动 -> ${speedValue}% (协议: ${detectedProtocol})`);
            return;
        }

        try {
            // 将 0-100 的百分比转换为 0-20 的硬件等级 (绝大多数玩具是20级或10级)
            let hardwareSpeed = Math.round(speedValue / 5); 
            if (hardwareSpeed > 20) hardwareSpeed = 20;
            if (hardwareSpeed < 0) hardwareSpeed = 0;

            let commandArray;

            // 智能路由：根据嗅探到的品牌协议，发送不同的指令包
            switch (detectedProtocol) {
                case 'LOVENSE':
                    // Lovense 协议：发送纯文本 "Vibrate:级别;"
                    const cmdString = `Vibrate:${hardwareSpeed};`;
                    commandArray = new TextEncoder().encode(cmdString);
                    break;

                case 'MAGIC_MOTION':
                    // 魔动协议：11字节十六进制数组，第9位是速度
                    let mmSpeed = Math.round(speedValue / 10); // 0-10
                    commandArray = new Uint8Array([0x0B, 0xFF, 0x04, 0x0A, 0x55, 0x54, 0x00, 0x00, 0x00, mmSpeed, 0x00]);
                    break;

                case 'GENERIC_FFF0':
                case 'GENERIC_FFE0':
                default:
                    // 国产通用协议：通常是简单的十六进制包
                    let genericSpeed = Math.round(speedValue / 10); // 0-10
                    let checksum = (0x03 + genericSpeed) & 0xFF;
                    commandArray = new Uint8Array([0xAA, 0x55, 0x03, genericSpeed, checksum]);
                    break;
            }

            // 优先使用 writeValueWithoutResponse，不等待设备回执，防止连续滑动时数据堵塞报错
            if (bluetoothCharacteristic.properties.writeWithoutResponse) {
                await bluetoothCharacteristic.writeValueWithoutResponse(commandArray);
            } else {
                await bluetoothCharacteristic.writeValue(commandArray);
            }
            
        } catch (error) {
            console.error("发送震动指令失败:", error);
        }
    }

})();
