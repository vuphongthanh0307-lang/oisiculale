const express = require('express');
const mineflayer = require('mineflayer');
const readline = require('readline');

// ==========================================
// BĂNG DÍNH 3 LỚP: DÁN MỒM LỖI CHUNK NGỨA MẮT
// ==========================================
const originalLog = console.log;
console.log = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalLog.apply(console, args);
};
const originalWarn = console.warn;
console.warn = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalWarn.apply(console, args);
};
const originalError = console.error;
console.error = function(...args) {
    if (typeof args[0] === 'string' && args[0].includes('Ignoring block entities')) return;
    originalError.apply(console, args);
};

const RECONNECT_DELAY = 40000; 

const app = express();
const port = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot oisiculale đang Câu Cá VIP Pro!'));
app.listen(port, () => console.log(`[Web] Server đang chạy trên port ${port}`));

process.on('uncaughtException', (err) => console.log('[Khiên Bất Tử] Chặn lỗi:', err.message));
process.on('unhandledRejection', (err) => console.log('[Khiên Bất Tử] Lỗi Promise:', err.message));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const randomSleep = (min, max) => sleep(Math.floor(Math.random() * (max - min + 1) + min));

// TRẠNG THÁI GỐC CỦA BOT
let botState = 'DISCONNECTED'; 
let currentBot; 
let isLoggingIn = false; 
let isGUIOpen = false; 
let failCount = 0;
let isSonarKick = false; 
let rotateInterval = null; 

function createBot() {
    const bot = mineflayer.createBot({
        host: 'aemine.vn',
        port: 25565,
        username: 'oisiculale', 
        version: '1.12.2',
        viewDistance: 'tiny',      
        checkTimeoutInterval: 60000,
        respawn: false
    });

    currentBot = bot; 
    bot.isRecasting = false;     
    bot.isFishingActive = false; 

    bot.once('login', () => {
        bot._client.on('disconnect', (packet) => {
            try {
                const reason = JSON.stringify(packet.reason);
                if (reason.includes('xác minh') || reason.includes('thành công')) {
                    isSonarKick = true;
                }
            } catch (e) {}
        });
    });

    bot.on('message', (jsonMsg) => {
        if (jsonMsg.toAnsi) originalLog('[Chat] ' + jsonMsg.toAnsi());
        else originalLog('[Chat] ' + jsonMsg.toString());
    });

    bot.on('spawn', async () => {
        if (!isLoggingIn) { 
            isLoggingIn = true;
            console.log('[Hub] Đã kết nối, chuẩn bị đăng nhập...');
            await sleep(2000);
            bot.chat('/dn Windvu2193'); 
            console.log('[Hub] Đã gửi lệnh login! Đang nghe ngóng...');
            botState = 'FIRST_LOGIN';
        }
    });

    // ===================================================
    // GIÁM SÁT PHAO CÂU: BỎ CẢNH BÁO & KIỂM TRA VA CHẠM
    // ===================================================
    let bobberEntity = null;

    bot.on('entitySpawn', (entity) => {
        if (entity.name === 'fishing_bobber' || entity.name === 'fishing_hook' || entity.displayName === 'Fishing Float') {
            if (entity.position.distanceTo(bot.entity.position) < 3) {
                bobberEntity = entity;

                setTimeout(() => {
                    if (!bobberEntity || botState !== 'FARMING' || !bot._client) return;

                    const pos = bobberEntity.position;

                    // 1. Kiểm tra va chạm trực tiếp với thực thể/item
                    const hitEntity = Object.values(bot.entities).find(e => {
                        if (e.id === bot.entity.id || e.id === bobberEntity.id) return false;

                        const isTargetType = e.type === 'player' || 
                                             e.type === 'mob' || 
                                             e.name === 'item' || 
                                             e.type === 'item' || 
                                             e.displayName === 'Item';

                        if (!isTargetType) return false;

                        const dx = e.position.x - pos.x;
                        const dz = e.position.z - pos.z;
                        const horizontalDist = Math.sqrt(dx * dx + dz * dz);
                        const dy = pos.y - e.position.y; 

                        if (e.type === 'player' || e.type === 'mob') {
                            return horizontalDist < 1.2 && dy >= -0.5 && dy <= 2.2;
                        }

                        return e.position.distanceTo(pos) < 1.0;
                    });

                    // 2. Kiểm tra xem phao có ở trong nước không
                    const blockCurrent = bot.blockAt(pos);
                    const blockBelow = bot.blockAt(pos.offset(0, -1, 0));

                    if (!blockCurrent || !blockBelow) {
                        console.log('[Câu Cá] Chunks chưa load hoàn chỉnh, tạm bỏ qua kiểm tra nước...');
                        return;
                    }

                    const isWater = (b) => b && b.name && b.name.toLowerCase().includes('water');
                    const inWater = isWater(blockCurrent) || isWater(blockBelow);

                    if (hitEntity) {
                        const targetName = hitEntity.username || hitEntity.displayName || hitEntity.name || 'Không rõ';
                        console.log(`>>> [CẢNH BÁO] Phao dính vào thực thể/vật phẩm: ${targetName}! Đang thu cần quăng lại gấp...`);
                        bot.isRecasting = true; 
                        try {
                            bot.activateItem(); 
                        } catch (e) {
                            console.log('Lỗi khi thu cần:', e.message);
                        }
                    } else if (!inWater) {
                        const blockName = blockBelow ? blockBelow.name : (blockCurrent ? blockCurrent.name : 'Không khí');
                        console.log(`>>> [CẢNH BÁO] Phao rơi nhầm chỗ (${blockName})! Thu cần quăng lại gấp...`);
                        bot.isRecasting = true; 
                        try {
                            bot.activateItem(); 
                        } catch (e) {
                            console.log('Lỗi khi thu cần:', e.message);
                        }
                    } else {
                        console.log('[Câu Cá] Phao đã tiếp nước chuẩn xác!');
                    }
                }, 1500);
            }
        }
    });

    bot.on('entityGone', (entity) => {
        if (bobberEntity && entity.id === bobberEntity.id) {
            bobberEntity = null;
        }
    });

    bot.on('messagestr', (message) => {
        const lowerMsg = message.toLowerCase();

        if (lowerMsg.includes('/captcha')) {
            const match = message.match(/\/captcha\s+([a-zA-Z0-9]+)/i);
            if (match) {
                console.log(`[Bảo Mật] Server đòi Captcha! Đang tự động nhập: /captcha ${match[1]} ...`);
                setTimeout(() => bot.chat(`/captcha ${match[1]}`), 1000); 
            }
        }

        if (lowerMsg.includes('đăng nhập bằng lệnh: /dn') || lowerMsg.includes('vui lòng đăng nhập')) {
            setTimeout(() => bot.chat('/dn Windvu2193'), 1500); 
        }

        // ==============================================================
        // [FIX LỖI MỚI]: BỎ CHẾ ĐỘ RUNG LẮC 20HZ LÀM VĂNG GAME
        // ==============================================================
        if (lowerMsg.includes('sonar') && lowerMsg.includes('xác minh')) {
            console.log('>>> [Anti-Bot] Bị Sonar soi! Đứng im như tượng đá, cấm nhúc nhích...');
            bot.clearControlStates();
            botState = 'WAIT_AUTO';
            isSonarKick = true; 
            // Không gửi gói tin rung lắc (jitter) nữa để pass Sonar an toàn.
        }

        if (message.includes('/pt join')) {
            const match = message.match(/\/pt join (\S+)/);
            if (match) {
                console.log(`[Party] Phát hiện lời mời: ${match[1]}! Đang join...`);
                setTimeout(() => bot.chat(`/party join ${match[1]}`), 500);
            }
        }

        if (lowerMsg.includes('kicked from') || lowerMsg.includes('bảo trì') || lowerMsg.includes('đã đóng')) {
            console.log('[Hệ Thống] Phát hiện bị ném ra Sảnh! Dọn dẹp tàn dư và lôi la bàn ra đục lỗ...');
            botState = 'IN_HUB'; 
            bot.isFishingActive = false; 
            bot.isRecasting = false; 
            if (rotateInterval) { clearInterval(rotateInterval); rotateInterval = null; }
            try { bot.activateItem(); } catch (e) {} 
        }

        const isKilledByPlayer = message.includes(bot.username) && 
                                 (lowerMsg.includes('slain by') || 
                                 lowerMsg.includes('slained by') || 
                                 lowerMsg.includes('giết'));
        if (isKilledByPlayer) {
            console.log('[RÚT LUI KHẨN CẤP] Bị Giết! Nằm im chờ server kick AFK...');
            bot.isFishingActive = false;
            bot.isRecasting = false;
            if (rotateInterval) { clearInterval(rotateInterval); rotateInterval = null; }
        }

        if (lowerMsg.includes('vừa tham gia máy chủ') && lowerMsg.includes(bot.username.toLowerCase())) {
            if (botState !== 'FARMING') {
                console.log(`[Mắt Thần] ĐÃ LỌT VÀO CỤM CHƠI! Thanh tẩy trạng thái, Xách cần đi câu!`);
                botState = 'FARMING';
                
                bot.isFishingActive = false;     
                bot.isRecasting = false;         
                bot.clearControlStates();        
                if (rotateInterval) { clearInterval(rotateInterval); rotateInterval = null; }
                
                startFishingProcess(bot);
            }
        }
    });

    setInterval(() => {
        if (!currentBot || !currentBot.inventory) return;
        if (botState === 'FARMING' || botState === 'WAIT_AUTO') return; 

        const items = currentBot.inventory.items();
        const hasCompass = items.some(i => i.name === 'compass');

        if (hasCompass) {
            botState = 'IN_HUB'; 
            if (!isGUIOpen) {
                console.log('[Hub] Đang cầm La Bàn Sảnh! Tiến hành click Menu...');
                currentBot.setQuickBarSlot(4);
                currentBot.activateItem();
            }
        } 
    }, 3000); 

    bot.on('windowOpen', async (window) => {
        if (isGUIOpen || botState === 'WAIT_AUTO') return; 
        isGUIOpen = true; 
        try {
            console.log('[Menu] Đang mở GUI...');
            await sleep(2000);
            await bot.clickWindow(20, 0, 0); 
            await sleep(2000);
            await bot.clickWindow(14, 0, 0); 
            console.log('[Menu] Đã click xong! Chờ bế vào cụm...');
        } catch (err) {
            console.log('Lỗi click GUI:', err.message);
        } finally {
            isGUIOpen = false; 
        }
    });

    bot.on('kicked', (reason) => {
        let reasonStr = '';
        try { reasonStr = JSON.stringify(reason); } 
        catch (e) { reasonStr = reason.toString(); }
        
        if (reasonStr.toLowerCase().includes('xác minh') || reasonStr.toLowerCase().includes('thành công') || reasonStr.toLowerCase().includes('vượt qua')) {
            console.log('>>> [Anti-Bot] Đã đọc được bảng "XÁC MINH THÀNH CÔNG" từ server!');
            isSonarKick = true; 
        } else {
            console.log(`[BỊ KICK] Lý do khác: ${reasonStr}`);
        }
    });

    bot.on('death', () => {
        bot.clearControlStates();
        bot.isFishingActive = false;
        bot.isRecasting = false;
        if (rotateInterval) { clearInterval(rotateInterval); rotateInterval = null; }

        if (botState !== 'FARMING') {
            setTimeout(() => bot.respawn(), 2000);
        } else {
            console.log('[CẢNH BÁO] Bot bị giết! Nằm phơi xác...');
        }
    });

    bot.on('end', () => {
        console.log('[SERVER] Đã bị văng hẳn khỏi cụm máy chủ!');
        isLoggingIn = false;
        botState = 'DISCONNECTED'; 
        bot.isFishingActive = false;
        bot.isRecasting = false;

        if (rotateInterval) { clearInterval(rotateInterval); rotateInterval = null; }

        if (isSonarKick) {
            isSonarKick = false; 
            failCount = 0; 
            console.log(`[Anti-Bot] Đang chờ 12 giây để server cập nhật danh sách...`);
            
            let waitTime = 12;
            const countdownInterval = setInterval(() => {
                console.log(`... Đang đếm ngược: ${waitTime} giây nữa sẽ vô lại ...`);
                waitTime--;
                if (waitTime <= 0) {
                    clearInterval(countdownInterval);
                    console.log(`[Anti-Bot] Hết giờ! Phi thẳng vô lượm lúa!!!`);
                    createBot();
                }
            }, 1000); 
            return; 
        }

        if (bot.isDoiServer) {
            console.log('[Dỗi Server] Nghỉ chơi 3 giây rồi log vô lại liền!');
            setTimeout(createBot, 3000); 
            return;
        }

        failCount++;
        if (failCount >= 5) {
            console.log(`[BÁO ĐỘNG] Rớt mạng ${failCount} lần! Ngủ đông 1 tiếng...`);
            failCount = 0; 
            setTimeout(createBot, 40000); 
            return;
        }
        console.log(`[Mất mạng] Lần rớt thứ ${failCount}. Đợi vào lại...`);
        setTimeout(createBot, RECONNECT_DELAY);
    });
}

async function startFishingProcess(bot) {
    if (bot.isFishingActive) return; 
    bot.isFishingActive = true;
    
    let missCount = 0; 

    try {
        // [CẢI TIẾN LÕI] Cuộn chuột về ô số 1 một lần duy nhất lúc mới vào game
        bot.setQuickBarSlot(0); 
        await sleep(2000);
        
        console.log('[Câu Cá] Đang phi về bãi (/home)...');
        bot.chat('/home'); 
        await sleep(6000); 

        console.log('[Câu Cá] Tới hồ rồi! Bật môtơ tự động xoay và móc giun...');
        await sleep(2000); 

        if (rotateInterval) clearInterval(rotateInterval);
        rotateInterval = setInterval(() => {
            if (botState === 'FARMING' && bot && bot.entity && bot.isFishingActive) {
                const speed = 20; 
                const radChange = (speed * Math.PI / 180) * 0.1;
                bot.look(bot.entity.yaw - radChange, bot.entity.pitch, false);
            }
        }, 50); 

        while (botState === 'FARMING' && bot.isFishingActive && bot._client) {
            // [CẢI TIẾN LÕI] Ép con bot lăn chuột vào ô số 1 liên tục, tuyệt đối không dùng lệnh equip()
            bot.setQuickBarSlot(0);

            // Kiểm tra xem món đồ đang cầm trên tay có đúng là cần câu không (Lỡ cần gãy)
            if (!bot.heldItem || bot.heldItem.name !== 'fishing_rod') {
                console.log('>>> [Hết Cần] Ô đầu tiên không phải là cần câu (Có thể đã gãy)! Đứng ngáp chờ...');
                await sleep(10000);
                continue; 
            }

            try {
                await randomSleep(300, 800); 

                console.log(`[Câu Cá] 🎣 Đang quăng mồi... Chờ cá cắn! (Đã hụt: ${missCount}/10)`);
                await bot.fish(); 
                
                console.log('[Câu Cá] 🐟 LỤM CÁ! Dính rồi! Đang gỡ cá...');
                failCount = 0; 
                missCount = 0; 
                
                await randomSleep(800, 1800); 

            } catch (err) {
                if (bot.isRecasting) {
                    bot.isRecasting = false; 
                    console.log('[Câu Cá] Thu cần xong. Chuẩn bị quăng lại ngay lập tức...');
                    await sleep(500); 
                } else {
                    missCount++; 
                    
                    if (missCount >= 10) {
                        console.log('>>> [CẢNH BÁO] ❌ Hụt cá 10 lần liên tiếp! Reset nhân phẩm...');
                        bot.isDoiServer = true; 
                        bot.quit(); 
                        break; 
                    } else {
                        console.log(`[Câu Cá] ⚠️ Hụt cá lần ${missCount}! Chờ xíu rồi quăng lại...`);
                        await randomSleep(1500, 2500); 
                    }
                }
            }
        }

    } catch (err) {
        console.log('[Câu Cá] Lỗi Kịch Bản:', err.message);
    } finally {
        bot.isFishingActive = false; 
    }
}

let lastChatTime = 0;
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.on('line', async (input) => {
    if (!currentBot) {
        console.log('[Lỗi] Bot chưa vào game, không nhận lệnh được!');
        return;
    }

    const rawInput = input.trim();
    if (!rawInput) return;

    try {
        if (rawInput.startsWith('/')) {
            currentBot.chat(rawInput);
            console.log(`[Bot Đã Gõ Lệnh]: ${rawInput}`);
            return;
        }

        const now = Date.now();
        if (now - lastChatTime < 1500) {
            console.log('>>> [CẢNH BÁO] Chat chậm thôi nha!');
            return;
        }
        lastChatTime = now;
        currentBot.chat(rawInput); 
        console.log(`[Đã Chat]: ${rawInput}`);

    } catch (error) {
        console.log('>>> [Lỗi]:', error.message);
    }
});

createBot();
