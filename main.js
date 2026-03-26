/**
 * 知識大亂鬥 - 貓狗大戰
 * 回合制 Q&A 物理拋物線遊戲
 * 專為大型觸控螢幕設計
 */

// ==================== 資源管理 ====================
// 所有圖片資源集中於此，方便後續抽換
const ASSETS = {
    // 貓咪陣營圖片（可替換為自訂圖片）
    // 使用 emoji 作為備用方案，以 data URI 或外部圖片為主
    cat: {
        idle: 'https://em-content.zobj.net/source/twitter/376/cat-face_1f431.png',       // 貓咪站立
        attack: 'https://em-content.zobj.net/source/twitter/376/cat-face_1f431.png',     // 貓咪攻擊
        hurt: 'https://em-content.zobj.net/source/twitter/376/cat-face_1f431.png',       // 貓咪受傷
        projectile: 'https://em-content.zobj.net/source/twitter/376/fish_1f41f.png'      // 貓咪投擲物（魚）
    },
    // 狗狗陣營圖片（可替換為自訂圖片）
    dog: {
        idle: 'https://em-content.zobj.net/source/twitter/376/dog-face_1f436.png',       // 狗狗站立
        attack: 'https://em-content.zobj.net/source/twitter/376/dog-face_1f436.png',     // 狗狗攻擊
        hurt: 'https://em-content.zobj.net/source/twitter/376/dog-face_1f436.png',       // 狗狗受傷
        projectile: 'https://em-content.zobj.net/source/twitter/376/bone_1f9b4.png'      // 狗狗投擲物（骨頭）
    },
    // 背景與場景
    background: 'https://picsum.photos/1920/1080?blur=2',  // 遊戲背景（模糊風景）
    ground: '#3d5a3d',  // 地面顏色
    // 特效
    explosion: 'https://em-content.zobj.net/source/twitter/376/collision_1f4a5.png',     // 爆炸效果
    shield: 'https://em-content.zobj.net/source/twitter/376/shield_1f6e1-fe0f.png'       // 護盾效果
};

// ==================== 遊戲設定常數 ====================
const CONFIG = {
    // 血量設定
    MAX_HP: 100,

    // 物理參數
    GRAVITY: 0.4,              // 重力加速度（降低讓拋物線更遠）
    MAX_POWER: 45,             // 最大發射力道（大幅提升）
    POWER_MULTIPLIER: 0.25,    // 拖拽距離轉力道係數（提升拖拽靈敏度）

    // 傷害計算
    BASE_DAMAGE: 15,           // 基礎傷害
    MAX_DAMAGE: 30,            // 最大傷害（命中中心）
    HIT_RADIUS: 80,            // 命中判定半徑

    // 道具效果
    ITEMS: {
        double: { name: '加倍傷害', multiplier: 2 },
        heal: { name: '恢復血量', amount: 30 },
        shield: { name: '護盾', blocksOne: true }
    },

    // 中間圍牆設定
    WALL: {
        WIDTH: 40,             // 圍牆寬度
        HEIGHT_RATIO: 0.45,    // 圍牆高度（相對於畫面高度的比例）
        COLOR: '#8B4513',      // 圍牆顏色（棕色磚牆）
        BORDER_COLOR: '#5D3A1A' // 圍牆邊框顏色
    },

    // 動畫
    PROJECTILE_SIZE: 40,       // 投擲物大小
    CHARACTER_SIZE: 120,       // 角色大小
    TRAJECTORY_DOTS: 25        // 軌跡預測點數（增加以顯示更長軌跡）
};

// ==================== 遊戲狀態 ====================
const GameState = {
    INIT: 'INIT',                 // 初始畫面（上傳題庫）
    TEAM_SELECT: 'TEAM_SELECT',   // 選擇陣營
    READY: 'READY',               // 準備回合
    QUESTION: 'QUESTION',         // 答題階段
    ATTACK: 'ATTACK',             // 拖拽攻擊階段
    PROJECTILE: 'PROJECTILE',     // 投擲物飛行中
    HIT: 'HIT',                   // 擊中結算
    GAME_OVER: 'GAME_OVER'        // 遊戲結束
};

// ==================== 遊戲核心類別 ====================
class Game {
    constructor() {
        // Canvas 相關
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');

        // 遊戲狀態
        this.state = GameState.INIT;
        this.questions = [];           // 題庫
        this.currentQuestionIndex = 0; // 當前題目索引
        this.currentTurn = 1;          // 當前回合玩家 (1 或 2)

        // 玩家資料
        this.players = {
            1: {
                team: null,            // 'cat' 或 'dog'
                hp: CONFIG.MAX_HP,
                x: 0,
                y: 0,
                items: { double: 1, heal: 1, shield: 1 },
                hasShield: false,
                activeItem: null,      // 當前啟用的道具
                animation: null,       // 動畫狀態：'hurt', 'taunt', null
                animationFrame: 0,     // 動畫幀數
                animationDuration: 0   // 動畫持續時間
            },
            2: {
                team: null,
                hp: CONFIG.MAX_HP,
                x: 0,
                y: 0,
                items: { double: 1, heal: 1, shield: 1 },
                hasShield: false,
                activeItem: null,
                animation: null,
                animationFrame: 0,
                animationDuration: 0
            }
        };

        // 投擲物狀態
        this.projectile = {
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            owner: null
        };

        // 拖拽狀態
        this.drag = {
            active: false,
            startX: 0,
            startY: 0,
            currentX: 0,
            currentY: 0
        };

        // 特效
        this.effects = [];

        // 圖片快取
        this.images = {};

        // 初始化
        this.init();
    }

    // ==================== 初始化 ====================
    init() {
        this.setupCanvas();
        this.loadImages();
        this.setupEventListeners();
        this.gameLoop();
    }

    setupCanvas() {
        // 設定 Canvas 為全螢幕
        const resize = () => {
            this.canvas.width = window.innerWidth;
            this.canvas.height = window.innerHeight;
            this.updatePlayerPositions();
        };
        window.addEventListener('resize', resize);
        resize();
    }

    updatePlayerPositions() {
        // 玩家1 在左側，玩家2 在右側
        const groundY = this.canvas.height - 100;
        this.players[1].x = this.canvas.width * 0.15;
        this.players[1].y = groundY - CONFIG.CHARACTER_SIZE / 2;
        this.players[2].x = this.canvas.width * 0.85;
        this.players[2].y = groundY - CONFIG.CHARACTER_SIZE / 2;
    }

    loadImages() {
        // 預載入所有圖片，加入載入失敗的備用方案
        const loadImage = (key, url, fallbackEmoji) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                this.images[key] = img;
                this.images[key].loaded = true;
            };
            img.onerror = () => {
                // 載入失敗時使用 emoji 備用
                this.images[key] = { emoji: fallbackEmoji, loaded: false };
            };
            img.src = url;
            this.images[key] = img;
            this.images[key].fallbackEmoji = fallbackEmoji;
        };

        loadImage('cat_idle', ASSETS.cat.idle, '🐱');
        loadImage('cat_projectile', ASSETS.cat.projectile, '🐟');
        loadImage('dog_idle', ASSETS.dog.idle, '🐶');
        loadImage('dog_projectile', ASSETS.dog.projectile, '🦴');
        loadImage('shield', ASSETS.shield, '🛡️');
        loadImage('explosion', ASSETS.explosion, '💥');

        // 設定陣營選擇畫面的圖片
        const catImg = document.getElementById('cat-select-img');
        const dogImg = document.getElementById('dog-select-img');
        catImg.src = ASSETS.cat.idle;
        dogImg.src = ASSETS.dog.idle;
        catImg.onerror = () => { catImg.style.display = 'none'; catImg.parentElement.insertAdjacentHTML('afterbegin', '<span style="font-size:100px">🐱</span>'); };
        dogImg.onerror = () => { dogImg.style.display = 'none'; dogImg.parentElement.insertAdjacentHTML('afterbegin', '<span style="font-size:100px">🐶</span>'); };
    }

    // ==================== 事件監聽 ====================
    setupEventListeners() {
        // Excel 上傳
        document.getElementById('excel-upload').addEventListener('change', (e) => this.handleExcelUpload(e));

        // 開始遊戲按鈕
        document.getElementById('start-btn').addEventListener('click', () => this.startGame());

        // 陣營選擇
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.selectTeam(e.currentTarget.dataset.team));
        });

        // 答題選項
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.answerQuestion(e.currentTarget.dataset.option));
        });

        // 道具按鈕 - 使用事件委派確保正確處理
        document.querySelectorAll('.item-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.useItem(btn);
            });
            // 觸控支援
            btn.addEventListener('touchend', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.useItem(btn);
            });
        });

        // 重新開始
        document.getElementById('restart-btn').addEventListener('click', () => this.restart());

        // Canvas 觸控/滑鼠事件
        this.setupCanvasEvents();
    }

    setupCanvasEvents() {
        // 統一處理觸控和滑鼠事件
        const getPointerPos = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            if (e.touches) {
                return {
                    x: e.touches[0].clientX - rect.left,
                    y: e.touches[0].clientY - rect.top
                };
            }
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        // 開始拖拽
        const startDrag = (e) => {
            if (this.state !== GameState.ATTACK) return;
            e.preventDefault();

            const pos = getPointerPos(e);
            const player = this.players[this.currentTurn];

            // 檢查是否點擊在角色附近
            const dist = Math.hypot(pos.x - player.x, pos.y - player.y);
            if (dist < CONFIG.CHARACTER_SIZE) {
                this.drag.active = true;
                this.drag.startX = player.x;
                this.drag.startY = player.y;
                this.drag.currentX = pos.x;
                this.drag.currentY = pos.y;
            }
        };

        // 拖拽中
        const moveDrag = (e) => {
            if (!this.drag.active) return;
            e.preventDefault();

            const pos = getPointerPos(e);
            this.drag.currentX = pos.x;
            this.drag.currentY = pos.y;
        };

        // 結束拖拽（發射）
        const endDrag = (e) => {
            if (!this.drag.active) return;
            e.preventDefault();

            this.drag.active = false;
            this.launchProjectile();
        };

        // 滑鼠事件
        this.canvas.addEventListener('mousedown', startDrag);
        this.canvas.addEventListener('mousemove', moveDrag);
        this.canvas.addEventListener('mouseup', endDrag);
        this.canvas.addEventListener('mouseleave', endDrag);

        // 觸控事件
        this.canvas.addEventListener('touchstart', startDrag, { passive: false });
        this.canvas.addEventListener('touchmove', moveDrag, { passive: false });
        this.canvas.addEventListener('touchend', endDrag, { passive: false });
        this.canvas.addEventListener('touchcancel', endDrag, { passive: false });
    }

    // ==================== Excel 處理 ====================
    handleExcelUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const errorEl = document.getElementById('upload-error');
        const fileNameEl = document.getElementById('file-name');
        const startBtn = document.getElementById('start-btn');

        errorEl.textContent = '';
        fileNameEl.textContent = '';

        // 檢查檔案類型
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            errorEl.textContent = '❌ 請上傳 Excel 檔案 (.xlsx 或 .xls)';
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 讀取第一個工作表
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                // 解析題目（跳過標題列）
                this.questions = [];
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    if (row.length >= 6 && row[0]) {
                        this.questions.push({
                            question: row[0],
                            options: {
                                A: row[1] || '',
                                B: row[2] || '',
                                C: row[3] || '',
                                D: row[4] || ''
                            },
                            answer: (row[5] || '').toString().toUpperCase().trim()
                        });
                    }
                }

                if (this.questions.length === 0) {
                    errorEl.textContent = '❌ 找不到有效題目，請確認格式是否正確';
                    return;
                }

                // 打亂題目順序
                this.shuffleQuestions();

                fileNameEl.textContent = `✅ ${file.name} (${this.questions.length} 題)`;
                startBtn.disabled = false;

            } catch (err) {
                console.error('Excel 解析錯誤:', err);
                errorEl.textContent = '❌ 檔案解析失敗，請確認格式是否正確';
            }
        };

        reader.onerror = () => {
            errorEl.textContent = '❌ 檔案讀取失敗';
        };

        reader.readAsArrayBuffer(file);
    }

    shuffleQuestions() {
        for (let i = this.questions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.questions[i], this.questions[j]] = [this.questions[j], this.questions[i]];
        }
    }

    // ==================== 遊戲流程 ====================
    startGame() {
        this.switchScreen('init-screen', 'team-select-screen');
        this.state = GameState.TEAM_SELECT;
        document.querySelector('.player-indicator').textContent = '玩家 1 請選擇';
    }

    selectTeam(team) {
        if (this.players[1].team === null) {
            // 玩家1 選擇
            this.players[1].team = team;
            document.querySelector('.player-indicator').textContent = '玩家 2 請選擇';
        } else {
            // 玩家2 選擇（不能選和玩家1一樣的）
            if (team === this.players[1].team) {
                // 自動選另一個陣營
                this.players[2].team = (team === 'cat') ? 'dog' : 'cat';
            } else {
                this.players[2].team = team;
            }

            // 進入遊戲
            this.switchScreen('team-select-screen', 'game-screen');
            this.state = GameState.READY;
            this.currentTurn = 1;
            this.updateItemsUI();
            this.startTurn();
        }
    }

    startTurn() {
        // 重置當前玩家的啟用道具
        this.players[this.currentTurn].activeItem = null;

        // 更新回合提示
        const indicator = document.getElementById('turn-indicator');
        const teamName = this.players[this.currentTurn].team === 'cat' ? '貓咪隊' : '狗狗隊';
        indicator.textContent = `🎯 玩家 ${this.currentTurn} (${teamName}) 的回合`;

        // 更新道具欄可用狀態
        this.updateItemsUI();

        // 短暫延遲後顯示題目
        setTimeout(() => {
            this.showQuestion();
        }, 1000);
    }

    showQuestion() {
        this.state = GameState.QUESTION;

        // 重要：狀態變更後更新道具按鈕
        this.updateItemsUI();

        // 如果題目用完，重新打亂
        if (this.currentQuestionIndex >= this.questions.length) {
            this.shuffleQuestions();
            this.currentQuestionIndex = 0;
        }

        const q = this.questions[this.currentQuestionIndex];

        // 更新題目視窗內容
        const teamName = this.players[this.currentTurn].team === 'cat' ? '貓咪隊' : '狗狗隊';
        document.getElementById('question-player').textContent = `玩家 ${this.currentTurn} (${teamName}) 答題`;
        document.getElementById('question-text').textContent = q.question;

        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach(btn => {
            const opt = btn.dataset.option;
            btn.textContent = `${opt}. ${q.options[opt]}`;
            btn.className = 'option-btn'; // 重置樣式
            btn.disabled = false;
        });

        document.getElementById('answer-feedback').textContent = '';
        document.getElementById('answer-feedback').className = 'answer-feedback';

        // 顯示題目視窗
        document.getElementById('question-modal').classList.add('active');
    }

    answerQuestion(selected) {
        if (this.state !== GameState.QUESTION) return;

        const q = this.questions[this.currentQuestionIndex];
        const correct = q.answer === selected;
        const feedbackEl = document.getElementById('answer-feedback');

        // 禁用所有選項
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.option === q.answer) {
                btn.classList.add('correct');
            } else if (btn.dataset.option === selected && !correct) {
                btn.classList.add('wrong');
            }
        });

        if (correct) {
            feedbackEl.textContent = '✅ 答對了！獲得攻擊權！';
            feedbackEl.className = 'answer-feedback correct';

            // 延遲後進入攻擊階段
            setTimeout(() => {
                document.getElementById('question-modal').classList.remove('active');
                this.state = GameState.ATTACK;
                this.updateItemsUI(); // 重要：更新道具按鈕狀態
                document.getElementById('turn-indicator').textContent =
                    `🎮 玩家 ${this.currentTurn} 拖拽角色來攻擊！`;
                this.currentQuestionIndex++;
            }, 1500);

        } else {
            feedbackEl.textContent = `❌ 答錯了！正確答案是 ${q.answer}`;
            feedbackEl.className = 'answer-feedback wrong';

            // 延遲後換對手回合
            setTimeout(() => {
                document.getElementById('question-modal').classList.remove('active');
                this.currentQuestionIndex++;
                this.switchTurn();
            }, 2000);
        }
    }

    switchTurn() {
        this.currentTurn = this.currentTurn === 1 ? 2 : 1;
        this.state = GameState.READY;
        this.startTurn();
    }

    // ==================== 攻擊系統 ====================
    launchProjectile() {
        const player = this.players[this.currentTurn];

        // 計算發射向量（反向，拖拽越遠力道越大）
        const dx = this.drag.startX - this.drag.currentX;
        const dy = this.drag.startY - this.drag.currentY;
        const distance = Math.hypot(dx, dy);

        if (distance < 20) return; // 拖拽太短，不發射

        // 計算力道（有上限）
        let power = Math.min(distance * CONFIG.POWER_MULTIPLIER, CONFIG.MAX_POWER);

        // 計算發射角度
        const angle = Math.atan2(dy, dx);

        // 設定投擲物初始狀態
        this.projectile.active = true;
        this.projectile.x = player.x;
        this.projectile.y = player.y - CONFIG.CHARACTER_SIZE * 0.3;
        this.projectile.vx = Math.cos(angle) * power;
        this.projectile.vy = Math.sin(angle) * power;
        this.projectile.owner = this.currentTurn;

        this.state = GameState.PROJECTILE;
        document.getElementById('turn-indicator').textContent = '🚀 發射！';
    }

    updateProjectile() {
        if (!this.projectile.active) return;

        // 套用重力
        this.projectile.vy += CONFIG.GRAVITY;

        // 更新位置
        this.projectile.x += this.projectile.vx;
        this.projectile.y += this.projectile.vy;

        // 檢查是否撞到圍牆
        if (this.checkWallCollision()) {
            this.handleWallHit();
            return;
        }

        // 檢查是否擊中對手
        const target = this.projectile.owner === 1 ? this.players[2] : this.players[1];
        const dist = Math.hypot(
            this.projectile.x - target.x,
            this.projectile.y - target.y
        );

        if (dist < CONFIG.HIT_RADIUS) {
            this.handleHit(dist);
            return;
        }

        // 檢查是否出界
        const groundY = this.canvas.height - 50;
        if (this.projectile.y > groundY ||
            this.projectile.x < -100 ||
            this.projectile.x > this.canvas.width + 100) {
            this.handleMiss();
        }
    }

    // 檢查投擲物是否撞到圍牆
    checkWallCollision() {
        const wall = this.getWallBounds();
        const p = this.projectile;
        const size = CONFIG.PROJECTILE_SIZE / 2;

        // 檢查投擲物邊界是否與圍牆重疊
        return (
            p.x + size > wall.x &&
            p.x - size < wall.x + wall.width &&
            p.y + size > wall.y &&
            p.y - size < wall.y + wall.height
        );
    }

    // 處理撞牆
    handleWallHit() {
        this.projectile.active = false;
        this.state = GameState.HIT;

        // 在撞牆位置顯示爆炸效果
        this.addEffect(this.projectile.x, this.projectile.y, 'wall_hit');

        document.getElementById('turn-indicator').textContent = '💥 撞到圍牆了！';

        setTimeout(() => {
            this.switchTurn();
        }, 1200);
    }

    handleHit(distance) {
        this.projectile.active = false;
        this.state = GameState.HIT;

        const attacker = this.players[this.currentTurn];
        const targetNum = this.currentTurn === 1 ? 2 : 1;
        const target = this.players[targetNum];

        // 計算傷害（距離越近傷害越高）
        const accuracy = 1 - (distance / CONFIG.HIT_RADIUS);
        let damage = CONFIG.BASE_DAMAGE + (CONFIG.MAX_DAMAGE - CONFIG.BASE_DAMAGE) * accuracy;
        damage = Math.round(damage);

        // 檢查攻擊者是否有加倍傷害
        if (attacker.activeItem === 'double') {
            damage *= CONFIG.ITEMS.double.multiplier;
            attacker.activeItem = null;
        }

        // 檢查目標是否有護盾
        if (target.hasShield) {
            damage = 0;
            target.hasShield = false;
            document.getElementById('turn-indicator').textContent = '🛡️ 護盾擋住了攻擊！';
            this.addEffect(target.x, target.y, 'shield');
        } else {
            target.hp = Math.max(0, target.hp - damage);
            document.getElementById('turn-indicator').textContent =
                `💥 命中！造成 ${damage} 點傷害！`;
            this.addEffect(target.x, target.y, 'explosion');

            // 觸發受傷動畫
            this.triggerAnimation(targetNum, 'hurt');
        }

        // 延遲後檢查遊戲是否結束
        setTimeout(() => {
            if (target.hp <= 0) {
                this.endGame();
            } else {
                this.switchTurn();
            }
        }, 1500);
    }

    handleMiss() {
        this.projectile.active = false;
        this.state = GameState.HIT;

        document.getElementById('turn-indicator').textContent = '💨 沒有命中...';

        // 觸發對手嘲諷動畫
        const targetNum = this.currentTurn === 1 ? 2 : 1;
        this.triggerAnimation(targetNum, 'taunt');

        setTimeout(() => {
            this.switchTurn();
        }, 1500);
    }

    // 觸發角色動畫
    triggerAnimation(playerNum, animationType) {
        const player = this.players[playerNum];
        player.animation = animationType;
        player.animationFrame = 0;
        player.animationDuration = animationType === 'hurt' ? 60 : 90; // 幀數
    }

    // 更新角色動畫
    updateAnimations() {
        for (let p = 1; p <= 2; p++) {
            const player = this.players[p];
            if (player.animation) {
                player.animationFrame++;
                if (player.animationFrame >= player.animationDuration) {
                    player.animation = null;
                    player.animationFrame = 0;
                }
            }
        }
    }

    // ==================== 道具系統 ====================
    useItem(btn) {
        const player = parseInt(btn.dataset.player);
        const item = btn.dataset.item;

        // 只能在自己的回合使用道具
        if (player !== this.currentTurn) return;

        // 只能在答題或攻擊階段使用
        if (this.state !== GameState.QUESTION && this.state !== GameState.ATTACK) return;

        const playerData = this.players[player];

        // 檢查是否還有此道具
        if (playerData.items[item] <= 0) return;

        // 使用道具
        playerData.items[item]--;

        switch (item) {
            case 'double':
                // 加倍傷害（標記，等攻擊時套用）
                playerData.activeItem = 'double';
                document.getElementById('turn-indicator').textContent = '⚔️ 下次攻擊傷害加倍！';
                break;

            case 'heal':
                // 立即恢復血量
                playerData.hp = Math.min(CONFIG.MAX_HP, playerData.hp + CONFIG.ITEMS.heal.amount);
                document.getElementById('turn-indicator').textContent =
                    `💚 恢復了 ${CONFIG.ITEMS.heal.amount} HP！`;
                break;

            case 'shield':
                // 啟用護盾（擋下一次攻擊）
                playerData.hasShield = true;
                document.getElementById('turn-indicator').textContent = '🛡️ 護盾已啟用！';
                break;
        }

        this.updateItemsUI();
    }

    updateItemsUI() {
        for (let p = 1; p <= 2; p++) {
            const player = this.players[p];
            const bar = document.getElementById(`p${p}-items`);

            bar.querySelectorAll('.item-btn').forEach(btn => {
                const item = btn.dataset.item;
                const count = player.items[item];
                const countEl = btn.querySelector('.item-count');

                countEl.textContent = count;
                btn.disabled = count <= 0 || p !== this.currentTurn ||
                    (this.state !== GameState.QUESTION && this.state !== GameState.ATTACK);

                // 顯示啟用狀態
                btn.classList.toggle('active',
                    (item === 'double' && player.activeItem === 'double') ||
                    (item === 'shield' && player.hasShield)
                );
            });
        }
    }

    // ==================== 特效系統 ====================
    addEffect(x, y, type) {
        this.effects.push({
            x, y, type,
            frame: 0,
            maxFrames: 30
        });
    }

    updateEffects() {
        this.effects = this.effects.filter(effect => {
            effect.frame++;
            return effect.frame < effect.maxFrames;
        });
    }

    // ==================== 遊戲結束 ====================
    endGame() {
        this.state = GameState.GAME_OVER;

        const winner = this.players[1].hp > 0 ? 1 : 2;
        const teamName = this.players[winner].team === 'cat' ? '🐱 貓咪隊' : '🐶 狗狗隊';

        document.getElementById('winner-team').textContent = `玩家 ${winner} ${teamName} 獲勝！`;
        document.getElementById('gameover-modal').classList.add('active');
    }

    restart() {
        // 重置遊戲狀態
        this.players = {
            1: {
                team: null,
                hp: CONFIG.MAX_HP,
                x: this.players[1].x,
                y: this.players[1].y,
                items: { double: 1, heal: 1, shield: 1 },
                hasShield: false,
                activeItem: null,
                animation: null,
                animationFrame: 0,
                animationDuration: 0
            },
            2: {
                team: null,
                hp: CONFIG.MAX_HP,
                x: this.players[2].x,
                y: this.players[2].y,
                items: { double: 1, heal: 1, shield: 1 },
                hasShield: false,
                activeItem: null,
                animation: null,
                animationFrame: 0,
                animationDuration: 0
            }
        };

        this.projectile.active = false;
        this.effects = [];
        this.currentQuestionIndex = 0;
        this.shuffleQuestions();

        // 關閉遊戲結束視窗
        document.getElementById('gameover-modal').classList.remove('active');

        // 回到陣營選擇
        this.switchScreen('game-screen', 'team-select-screen');
        this.state = GameState.TEAM_SELECT;
        document.querySelector('.player-indicator').textContent = '玩家 1 請選擇';
    }

    // ==================== 畫面渲染 ====================
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 清除畫面
        ctx.clearRect(0, 0, w, h);

        // 繪製背景漸層
        const gradient = ctx.createLinearGradient(0, 0, 0, h);
        gradient.addColorStop(0, '#87CEEB');   // 天空藍
        gradient.addColorStop(0.6, '#98D8C8'); // 淺綠
        gradient.addColorStop(1, '#3d5a3d');   // 地面綠
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        // 繪製地面
        const groundY = h - 100;
        ctx.fillStyle = '#2d4a2d';
        ctx.fillRect(0, groundY, w, 100);

        // 繪製草地紋理
        ctx.strokeStyle = '#4a7a4a';
        ctx.lineWidth = 2;
        for (let i = 0; i < w; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, groundY);
            ctx.lineTo(i + 10, groundY - 15);
            ctx.stroke();
        }

        // 繪製中間圍牆
        this.drawWall();

        // 繪製血條
        this.drawHealthBar(1);
        this.drawHealthBar(2);

        // 繪製角色
        this.drawCharacter(1);
        this.drawCharacter(2);

        // 繪製護盾效果
        if (this.players[1].hasShield) {
            this.drawShieldAura(this.players[1]);
        }
        if (this.players[2].hasShield) {
            this.drawShieldAura(this.players[2]);
        }

        // 繪製拖拽軌跡預測
        if (this.drag.active && this.state === GameState.ATTACK) {
            this.drawTrajectory();
        }

        // 繪製投擲物
        if (this.projectile.active) {
            this.drawProjectile();
        }

        // 繪製特效
        this.drawEffects();
    }

    drawHealthBar(playerNum) {
        const ctx = this.ctx;
        const player = this.players[playerNum];
        const barWidth = 200;
        const barHeight = 25;
        const x = playerNum === 1 ? 100 : this.canvas.width - 300;
        const y = 30;

        // 背景
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, barWidth, barHeight);

        // 血量
        const hpPercent = player.hp / CONFIG.MAX_HP;
        const hpColor = hpPercent > 0.5 ? '#4ade80' : hpPercent > 0.25 ? '#fbbf24' : '#ef4444';
        ctx.fillStyle = hpColor;
        ctx.fillRect(x, y, barWidth * hpPercent, barHeight);

        // 邊框
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, barWidth, barHeight);

        // 文字
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 16px Microsoft JhengHei';
        ctx.textAlign = 'center';
        ctx.fillText(`P${playerNum}: ${player.hp}/${CONFIG.MAX_HP}`, x + barWidth / 2, y + 18);

        // 陣營標示
        if (player.team) {
            const teamEmoji = player.team === 'cat' ? '🐱' : '🐶';
            ctx.font = '24px sans-serif';
            ctx.fillText(teamEmoji, x - 30, y + 22);
        }
    }

    drawCharacter(playerNum) {
        const ctx = this.ctx;
        const player = this.players[playerNum];

        if (!player.team) return;

        const imgKey = `${player.team}_idle`;
        const img = this.images[imgKey];
        const size = CONFIG.CHARACTER_SIZE;

        // 計算動畫偏移和效果
        let offsetX = 0;
        let offsetY = 0;
        let scale = 1;
        let rotation = 0;
        let tint = null;

        if (player.animation === 'hurt') {
            // 受傷動畫：抖動 + 紅色閃爍
            const progress = player.animationFrame / player.animationDuration;
            const shake = Math.sin(player.animationFrame * 0.8) * 15 * (1 - progress);
            offsetX = shake;
            offsetY = Math.abs(shake) * 0.3;
            tint = `rgba(255, 0, 0, ${0.5 * (1 - progress)})`;
        } else if (player.animation === 'taunt') {
            // 嘲諷動畫：跳躍 + 旋轉
            const progress = player.animationFrame / player.animationDuration;
            const bounce = Math.sin(progress * Math.PI * 3) * 20;
            offsetY = -Math.abs(bounce);
            rotation = Math.sin(progress * Math.PI * 4) * 0.15;
            scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
        }

        // 翻轉玩家2的角色（面向左邊）
        ctx.save();

        // 應用動畫變換
        const drawX = player.x + offsetX;
        const drawY = player.y + offsetY;

        // 檢查圖片是否成功載入
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.translate(drawX, drawY);
            ctx.rotate(rotation);
            ctx.scale(playerNum === 2 ? -scale : scale, scale);
            ctx.drawImage(img, -size / 2, -size / 2, size, size);

            // 受傷紅色覆蓋
            if (tint) {
                ctx.fillStyle = tint;
                ctx.fillRect(-size / 2, -size / 2, size, size);
            }
        } else {
            // 備用方案：繪製 emoji
            let emoji = player.team === 'cat' ? '🐱' : '🐶';

            // 動畫時改變表情
            if (player.animation === 'hurt') {
                emoji = player.team === 'cat' ? '🙀' : '😵';
            } else if (player.animation === 'taunt') {
                emoji = player.team === 'cat' ? '😸' : '😜';
            }

            ctx.translate(drawX, drawY);
            ctx.rotate(rotation);
            ctx.scale(playerNum === 2 ? -scale : scale, scale);
            ctx.font = `${size * 0.8}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 0, 0);
        }
        ctx.restore();

        // 嘲諷時顯示文字泡泡
        if (player.animation === 'taunt') {
            this.drawTauntBubble(player, playerNum);
        }

        // 受傷時顯示傷害數字效果
        if (player.animation === 'hurt' && player.animationFrame < 30) {
            ctx.fillStyle = '#ff4444';
            ctx.font = 'bold 24px Microsoft JhengHei';
            ctx.textAlign = 'center';
            const floatY = player.y - size / 2 - 30 - player.animationFrame;
            ctx.globalAlpha = 1 - (player.animationFrame / 30);
            ctx.fillText('💢', player.x, floatY);
            ctx.globalAlpha = 1;
        }

        // 在攻擊階段高亮當前玩家
        if (this.state === GameState.ATTACK && playerNum === this.currentTurn) {
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 4;
            ctx.setLineDash([10, 5]);
            ctx.beginPath();
            ctx.arc(player.x, player.y, size / 2 + 10, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }
    }

    // 繪製嘲諷文字泡泡
    drawTauntBubble(player, playerNum) {
        const ctx = this.ctx;
        const progress = player.animationFrame / player.animationDuration;

        // 隨機嘲諷文字
        const taunts = ['哈哈！', '太遜了！', '打不到～', '再試試！', '遜斃了！'];
        const tauntIndex = Math.floor(player.animationFrame / 20) % taunts.length;
        const taunt = taunts[tauntIndex];

        // 泡泡位置
        const bubbleX = player.x + (playerNum === 1 ? 70 : -70);
        const bubbleY = player.y - CONFIG.CHARACTER_SIZE / 2 - 40;

        // 繪製泡泡
        ctx.globalAlpha = Math.min(1, (1 - progress) * 2);

        // 泡泡背景
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(bubbleX, bubbleY, 50, 25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 泡泡尾巴
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.moveTo(bubbleX + (playerNum === 1 ? -30 : 30), bubbleY + 15);
        ctx.lineTo(player.x + (playerNum === 1 ? 30 : -30), player.y - CONFIG.CHARACTER_SIZE / 2 + 10);
        ctx.lineTo(bubbleX + (playerNum === 1 ? -20 : 20), bubbleY + 20);
        ctx.fill();

        // 文字
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px Microsoft JhengHei';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(taunt, bubbleX, bubbleY);

        ctx.globalAlpha = 1;
    }

    drawShieldAura(player) {
        const ctx = this.ctx;
        const time = Date.now() / 500;
        const radius = CONFIG.CHARACTER_SIZE / 2 + 20 + Math.sin(time) * 5;

        ctx.strokeStyle = `rgba(100, 200, 255, ${0.5 + Math.sin(time) * 0.2})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        // 護盾圖示
        const img = this.images.shield;
        if (img.complete) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(img, player.x - 30, player.y - 80, 60, 60);
            ctx.globalAlpha = 1;
        }
    }

    drawTrajectory() {
        const ctx = this.ctx;
        const player = this.players[this.currentTurn];

        // 計算拖拽向量
        const dx = this.drag.startX - this.drag.currentX;
        const dy = this.drag.startY - this.drag.currentY;
        const distance = Math.hypot(dx, dy);

        if (distance < 20) return;

        // 繪製拉力線
        ctx.strokeStyle = '#ff6b6b';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - CONFIG.CHARACTER_SIZE * 0.3);
        ctx.lineTo(this.drag.currentX, this.drag.currentY);
        ctx.stroke();
        ctx.setLineDash([]);

        // 計算發射參數
        let power = Math.min(distance * CONFIG.POWER_MULTIPLIER, CONFIG.MAX_POWER);
        const angle = Math.atan2(dy, dx);

        // 繪製力道指示
        const powerPercent = (power / CONFIG.MAX_POWER) * 100;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Microsoft JhengHei';
        ctx.textAlign = 'center';
        ctx.fillText(`力道: ${Math.round(powerPercent)}%`, player.x, player.y - CONFIG.CHARACTER_SIZE - 20);

        // 繪製軌跡預測點
        const startX = player.x;
        const startY = player.y - CONFIG.CHARACTER_SIZE * 0.3;
        let vx = Math.cos(angle) * power;
        let vy = Math.sin(angle) * power;
        let px = startX;
        let py = startY;

        // 取得圍牆邊界
        const wall = this.getWallBounds();
        let hitWall = false;

        for (let i = 0; i < CONFIG.TRAJECTORY_DOTS; i++) {
            // 模擬物理
            vy += CONFIG.GRAVITY;
            px += vx;
            py += vy;

            // 檢查是否會撞牆
            const size = CONFIG.PROJECTILE_SIZE / 2;
            if (px + size > wall.x && px - size < wall.x + wall.width &&
                py + size > wall.y && py - size < wall.y + wall.height) {
                hitWall = true;
            }

            // 繪製點（越遠越透明，撞牆後變紅色）
            const alpha = 1 - (i / CONFIG.TRAJECTORY_DOTS);
            ctx.globalAlpha = alpha * 0.8;

            if (hitWall) {
                ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
                ctx.beginPath();
                ctx.arc(px, py, 7, 0, Math.PI * 2);
                ctx.fill();
                // 撞牆後停止繪製
                break;
            } else {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.beginPath();
                ctx.arc(px, py, 5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1;

        // 如果會撞牆，顯示警告
        if (hitWall) {
            ctx.fillStyle = '#ff6b6b';
            ctx.font = 'bold 16px Microsoft JhengHei';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ 會撞牆！', player.x, player.y - CONFIG.CHARACTER_SIZE - 45);
        }
    }

    drawProjectile() {
        const ctx = this.ctx;
        const team = this.players[this.projectile.owner].team;
        const img = this.images[`${team}_projectile`];
        const size = CONFIG.PROJECTILE_SIZE;

        // 旋轉效果
        const rotation = Date.now() / 100;

        ctx.save();
        ctx.translate(this.projectile.x, this.projectile.y);
        ctx.rotate(rotation);

        // 檢查圖片是否成功載入
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        } else {
            // 備用方案：繪製 emoji
            const emoji = team === 'cat' ? '🐟' : '🦴';
            ctx.font = `${size}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(emoji, 0, 0);
        }
        ctx.restore();
    }

    // 取得圍牆邊界
    getWallBounds() {
        const w = this.canvas.width;
        const h = this.canvas.height;
        const groundY = h - 100;
        const wallWidth = CONFIG.WALL.WIDTH;
        const wallHeight = groundY * CONFIG.WALL.HEIGHT_RATIO;

        return {
            x: (w - wallWidth) / 2,
            y: groundY - wallHeight,
            width: wallWidth,
            height: wallHeight
        };
    }

    // 繪製中間圍牆
    drawWall() {
        const ctx = this.ctx;
        const wall = this.getWallBounds();

        // 繪製磚牆效果
        ctx.fillStyle = CONFIG.WALL.COLOR;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

        // 繪製磚塊紋理
        ctx.strokeStyle = CONFIG.WALL.BORDER_COLOR;
        ctx.lineWidth = 2;

        const brickHeight = 20;
        const brickWidth = wall.width;

        for (let row = 0; row < wall.height / brickHeight; row++) {
            const y = wall.y + row * brickHeight;

            // 水平線
            ctx.beginPath();
            ctx.moveTo(wall.x, y);
            ctx.lineTo(wall.x + wall.width, y);
            ctx.stroke();

            // 垂直線（交錯排列）
            if (row % 2 === 0) {
                ctx.beginPath();
                ctx.moveTo(wall.x + wall.width / 2, y);
                ctx.lineTo(wall.x + wall.width / 2, y + brickHeight);
                ctx.stroke();
            }
        }

        // 圍牆邊框
        ctx.strokeStyle = '#3D2314';
        ctx.lineWidth = 4;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

        // 圍牆頂部裝飾
        ctx.fillStyle = '#654321';
        ctx.fillRect(wall.x - 5, wall.y - 10, wall.width + 10, 15);
        ctx.strokeStyle = '#3D2314';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x - 5, wall.y - 10, wall.width + 10, 15);
    }

    drawEffects() {
        const ctx = this.ctx;

        this.effects.forEach(effect => {
            const progress = effect.frame / effect.maxFrames;
            const alpha = 1 - progress;
            const scale = 1 + progress;
            const size = 80 * scale;

            ctx.globalAlpha = alpha;

            if (effect.type === 'explosion') {
                const img = this.images.explosion;
                if (img && img.complete && img.naturalWidth > 0) {
                    ctx.drawImage(img, effect.x - size / 2, effect.y - size / 2, size, size);
                } else {
                    // 備用方案：繪製 emoji
                    ctx.font = `${size}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('💥', effect.x, effect.y);
                }
            } else if (effect.type === 'wall_hit') {
                // 撞牆特效 - 磚塊碎片
                ctx.font = `${size * 0.8}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('🧱', effect.x, effect.y);
                // 煙霧效果
                ctx.fillStyle = `rgba(150, 150, 150, ${alpha * 0.5})`;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, size * 0.6, 0, Math.PI * 2);
                ctx.fill();
            } else if (effect.type === 'shield') {
                ctx.strokeStyle = '#64b5f6';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.arc(effect.x, effect.y, size / 2, 0, Math.PI * 2);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
        });
    }

    // ==================== 遊戲主迴圈 ====================
    gameLoop() {
        // 更新遊戲邏輯
        if (this.state === GameState.PROJECTILE) {
            this.updateProjectile();
        }
        this.updateEffects();
        this.updateAnimations();

        // 渲染畫面（只在遊戲畫面時）
        if (this.state !== GameState.INIT && this.state !== GameState.TEAM_SELECT) {
            this.render();
        }

        requestAnimationFrame(() => this.gameLoop());
    }

    // ==================== 工具函數 ====================
    switchScreen(from, to) {
        document.getElementById(from).classList.remove('active');
        document.getElementById(to).classList.add('active');
    }
}

// ==================== 啟動遊戲 ====================
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game();
});
