/**
 * 智能玩具控制插件 (Toy Plugin) - 终极多协议盲狙适配 & iOS支持版
 * 包含：永久免密验证、Web Bluetooth 蓝牙连接、全局服务嗅探、震动频率/强度控制
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
    // 2. 核心逻辑变量 (多协议适配版)
    // ==========================================
    
    let bluetoothDevice = null;
    let activeCharacteristics = []; // 存储所有嗅探到的可写通道
    let detectedProtocol = 'unknown'; // 记录识别出的玩具品牌协议
    
    let currentSpeed = 0;
    let currentPattern = 'constant';
    let vibrationInterval = null;

    // 加入更多厂商的专属服务 UUID (增加了杰士邦、迷姬常用的 Nordic UART)
    const TOY_SERVICES = [
        '50300001-0023-4bd4-bbd5-a6920e4c5653', // Lovense
        '78667579-2868-4bd0-a8ce-f6018d456340', // Magic Motion
        '6e400001-b5a3-f393-e0a9-e50e24dcca9e', // Nordic UART (迷姬、杰士邦及大量国产常用)
        0xFFF0, // 国产公版 A
        0xFFE0, // 国产公版 B
        0xFEE0, // 其他公版
        '00001802-0000-1000-8000-00805f9b34fb'  // 旧版兼容
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
    // 4. Web Bluetooth API (终极盲狙万能适配版)
    // ==========================================

    window.startBluetoothConnection = async function() {
        if (!navigator.bluetooth) {
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            if (isIOS) {
                if (typeof showAlert === 'function') showAlert("苹果 iOS 必须使用【Bluefy】浏览器打开本网页才能连接蓝牙玩具！\n(请前往 App Store 免费下载 Bluefy 浏览器)");
                else alert("苹果iOS请下载 Bluefy 浏览器打开！");
            } else {
                if (typeof showAlert === 'function') showAlert("您的浏览器不支持 Web Bluetooth API。\n建议使用安卓 Chrome 或 Edge 浏览器。\n(已开启虚拟演示)");
            }
            simulateConnection();
            return;
        }

        try {
            document.getElementById('toyStatusText').textContent = "正在搜索蓝牙...";
            document.getElementById('toyConnectBtn').innerHTML = '<i class="ri-loader-4-line fa-spin"></i> 搜索中';

            // 1. 请求连接
            bluetoothDevice = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: TOY_SERVICES
            });

            document.getElementById('toyStatusText').textContent = "正在连接服务...";
            const server = await bluetoothDevice.gatt.connect();
            bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

            document.getElementById('toyStatusText').textContent = "正在扫描可用通道...";
            
            activeCharacteristics = [];
            detectedProtocol = 'GENERIC'; // 默认走万能通道

            // 2. 获取设备暴露的所有主服务
            const services = await server.getPrimaryServices();
            
            // 3. 遍历所有服务，找出所有具备“写”权限的特征值 (盲狙核心)
            for (const service of services) {
                // 如果精确匹配到特定服务，打个专属标签优化指令
                if (service.uuid === '50300001-0023-4bd4-bbd5-a6920e4c5653') detectedProtocol = 'LOVENSE';
                if (service.uuid === '78667579-2868-4bd0-a8ce-f6018d456340') detectedProtocol = 'MAGIC_MOTION';

                const characteristics = await service.getCharacteristics();
                for (const char of characteristics) {
                    // 只要这个通道允许我们塞数据进去 (write 或 writeWithoutResponse)
                    if (char.properties.write || char.properties.writeWithoutResponse) {
                        activeCharacteristics.push(char);
                    }
                }
            }

            if (activeCharacteristics.length > 0) {
                console.log(`[Toy Connected] 成功找到 ${activeCharacteristics.length} 个可写通道。协议判定: ${detectedProtocol}`);
                onConnected(bluetoothDevice.name);
            } else {
                throw new Error("设备已连接，但未开放任何控制通道，可能是封闭式私有加密玩具。");
            }

        } catch (error) {
            console.error("蓝牙连接/嗅探失败:", error);
            document.getElementById('toyStatusText').textContent = "连接失败/未授权";
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
        
        if (typeof showToast === 'function') showToast("设备连接并扫轨成功");
    }

    function onDisconnected() {
        document.getElementById('toyStatusDot').classList.remove('connected');
        document.getElementById('toyStatusText').textContent = `等待连接设备...`;
        
        const btn = document.getElementById('toyConnectBtn');
        btn.innerHTML = '<i class="ri-bluetooth-connect-line"></i> 搜索';
        btn.onclick = startBluetoothConnection;
        
        bluetoothDevice = null;
        activeCharacteristics = [];
        detectedProtocol = 'unknown';
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
    // 5. 硬件通信引擎 (万能多重轰炸发送器)
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
            console.log(`[Toy Virtual] 虚拟震动 -> ${speedValue}% (未检测到真实设备)`);
            return;
        }

        // 速度转换计算
        let speed20 = Math.round(speedValue / 5);  // 0-20 级 (Lovense标准)
        let speed10 = Math.round(speedValue / 10); // 0-10 级 (国产标准)
        if (speed20 > 20) speed20 = 20;
        if (speed10 > 10) speed10 = 10;
        if (speed20 < 0) speed20 = 0;
        if (speed10 < 0) speed10 = 0;

        let payloads = [];

        // 智能分配子弹：根据嗅探到的协议，构建指令包
        if (detectedProtocol === 'LOVENSE') {
            payloads.push(new TextEncoder().encode(`Vibrate:${speed20};`));
        } 
        else if (detectedProtocol === 'MAGIC_MOTION') {
            payloads.push(new Uint8Array([0x0B, 0xFF, 0x04, 0x0A, 0x55, 0x54, 0x00, 0x00, 0x00, speed10, 0x00]));
        } 
        else {
            // 【万能盲狙模式】：将杰士邦、迷姬、雷霆等最常用的 5 种指令打包全部发送
            
            // 1. 国产公版A (杰士邦/迷姬部分型号常用，带头部55和尾部FF)
            payloads.push(new Uint8Array([0x55, 0x04, speed10, 0x00, 0x00, 0xFF]));
            
            // 2. 国产公版B (0xAA 0x55 开头，带校验和)
            let checksum = (0x03 + speed10) & 0xFF;
            payloads.push(new Uint8Array([0xAA, 0x55, 0x03, speed10, checksum]));
            
            // 3. 极简单字节/双字节控制 (某些老旧或白牌型号)
            payloads.push(new Uint8Array([speed10]));
            payloads.push(new Uint8Array([0x01, speed10]));
            
            // 4. 纯文本模式 (部分 Nordic UART 透传型号，如某些迷姬和逗豆鸟仿品)
            payloads.push(new TextEncoder().encode(`Vibrate:${speed20};`));
            payloads.push(new TextEncoder().encode(`Motor:${speed10};`));
        }

        // 核心：将所有指令包通过所有扫描到的通道发出去！
        // 玩具会自动过滤掉它解析不了的数据包，而执行正确的那个。
        for (const char of activeCharacteristics) {
            for (const data of payloads) {
                try {
                    // 优先使用不需等待响应的发送方式，大幅提升滑动时的流畅度，防阻塞报错
                    if (char.properties.writeWithoutResponse) {
                        await char.writeValueWithoutResponse(data);
                    } else if (char.properties.write) {
                        await char.writeValue(data);
                    }
                } catch (e) {
                    // 忽略发送失败的报错（有些通道本来就不收特定指令）
                }
            }
        }
    }

})();
