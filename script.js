const TIME_SESSIONS = ["8:00", "10:00", "12:00", "15:00", "18:00", "21:00"];
const FORMS = {
    BABY: "baby",           // 0日目
    MARU: "maru",           // 1日目
    TAMA: "tama",           // 2〜4日目
    REVERSE: "reverse",     // 反転さとし
    LEGEND: "legend",       // レジェンドYoutuber
    IDOL: "idol",           // アイドルさとし
    NORMAL: "normal",       // 普通のさとし
    SALARYMAN: "salaryman", // サラリーマンさとし
    SICK: "sick"            // 病弱さとし
};

// 初期状態
const DEFAULT_STATE = {
    day: 0,
    timeIndex: 0,
    form: FORMS.BABY,
    hunger: 3, // 最大5
    mood: 3,   // 最大5
    trust: 0,
    careMistakes: 0,
    poopCount: 0,
    isSick: false,
    enemyPresent: false,
    lightsOff: false,
    isGameOver: false,
    actionsLeft: 3,
    // --- 3ボタンUI用ステート ---
    cursorIndex: -1, // 0〜6: 選択中アイコン、-1: 未選択
    subScreen: null, // null, 'clock', 'stats', 'submenu'
    submenuIndex: 0,
    // ----------------------------
    stats: {
        playCount: 0,
        chocoCount: 0,
        onigiriCount: 0,
        blackCount: 0,
        sickIgnoredCount: 0
    }
};

let state = {};
let currentSubmenuOptions = [];

// DOM Elements
const els = {
    // スクリーンと表示領域
    lcdScreen: document.getElementById('lcd-screen'),
    mainDisplay: document.getElementById('main-display'),
    charSprite: document.getElementById('char-sprite'),
    characterBox: document.getElementById('character'),
    poopContainer: document.getElementById('poop-container'),
    sickInd: document.getElementById('sick-indicator'),
    enemyInd: document.getElementById('enemy-indicator'),
    lightsOverlay: document.getElementById('lights-overlay'),
    feedbackMsg: document.getElementById('feedback-msg'),

    // サブスクリーン
    clockScreen: document.getElementById('clock-screen'),
    statsScreen: document.getElementById('stats-screen'),
    submenuScreen: document.getElementById('submenu-screen'),
    submenuTitle: document.getElementById('submenu-title'),
    submenuOptions: document.getElementById('submenu-options'),
    gameOverScreen: document.getElementById('game-over-screen'),
    gameOverReason: document.getElementById('game-over-reason'),
    minigameScreen: document.getElementById('minigame-screen'),

    // 外部チート表示用
    extHunger: document.getElementById('ext-hunger'),
    extMood: document.getElementById('ext-mood'),
    extMistakes: document.getElementById('ext-mistakes'),
    extTrust: document.getElementById('ext-trust'),
    extMinigames: document.getElementById('ext-minigames'),

    // 時計のテキスト用
    dayDisp: document.getElementById('day-display'),
    timeDisp: document.getElementById('time-display'),

    // アイコン列
    icons: document.querySelectorAll('.icon'),

    // ハードウェアボタン
    btnA: document.getElementById('btn-a'),
    btnB: document.getElementById('btn-b'),
    btnC: document.getElementById('btn-c')
};

function init() {
    loadState();
    if (state.isGameOver) {
        showGameOver(state.isGameOverReason || "☠");
    } else {
        updateUI();
        if (state.day >= 5) {
            showFeedback(`✨ ${getFormName(state.form)} C長押しﾘｾｯﾄ`);
        }
    }
    setupEventListeners();
}

// ------ 状態管理と保存 ------
function saveState() {
    localStorage.setItem("satoshi_state", JSON.stringify(state));
}

function loadState() {
    const saved = localStorage.getItem("satoshi_state");
    if (saved) {
        state = { ...DEFAULT_STATE, ...JSON.parse(saved), stats: { ...DEFAULT_STATE.stats, ...JSON.parse(saved).stats } };
    } else {
        state = JSON.parse(JSON.stringify(DEFAULT_STATE)); // Deep copy
    }
}

function resetGame() {
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    // 幽霊を消す
    const ghost = document.getElementById('ghost-float');
    if (ghost) ghost.remove();
    saveState();
    updateUI();
}

// ------ UI更新 ------
function updateUI() {
    // アイコンのカーソル状態更新
    els.icons.forEach(icon => {
        if (parseInt(icon.dataset.index) === state.cursorIndex) {
            icon.classList.add('active');
        } else {
            icon.classList.remove('active');
        }
    });

    // 生存中は幽霊を消す
    if (!state.isGameOver) {
        const ghost = document.getElementById('ghost-float');
        if (ghost) ghost.remove();
    }

    // サブスクリーン切り替え
    els.clockScreen.classList.toggle('hidden', state.subScreen !== 'clock');
    els.statsScreen.classList.toggle('hidden', state.subScreen !== 'stats');
    els.submenuScreen.classList.toggle('hidden', state.subScreen !== 'submenu');
    els.minigameScreen.classList.toggle('hidden', state.subScreen !== 'minigame');
    els.gameOverScreen.classList.toggle('hidden', !state.isGameOver);

    if (state.isGameOver) {
        els.gameOverReason.innerHTML = state.isGameOverReason || "しんでしまった";
    }

    // 時計更新
    els.dayDisp.innerText = `📅 ${state.day}`;
    els.timeDisp.innerText = `⏰ ${TIME_SESSIONS[state.timeIndex]} (🎯${state.actionsLeft})`;

    // ステータス更新（ハートで表現）
    document.getElementById('stat-day').innerText = state.day;
    document.getElementById('stat-hunger-hearts').innerText = "🖤".repeat(state.hunger) + "🤍".repeat(5 - state.hunger);
    document.getElementById('stat-mood-hearts').innerText = "🖤".repeat(state.mood) + "🤍".repeat(5 - state.mood);

    // インジケーター類
    // els.sickInd.classList.toggle('hidden', !state.isSick); // 病院マークは非表示にする
    els.enemyInd.classList.toggle('hidden', !state.enemyPresent);
    els.lightsOverlay.classList.toggle('hidden', !state.lightsOff);

    // キャラクターの病気表現 (顔色を青く)
    els.charSprite.classList.toggle('sick-filter', state.isSick);

    // 病気時の💀パーティクル生成・表示
    const sickParticles = document.getElementById('sick-particles');
    if (sickParticles) {
        if (state.isSick) {
            sickParticles.classList.remove('hidden');
            if (sickParticles.innerHTML === '') {
                sickParticles.innerHTML = '<span>💀</span><span>💀</span><span>💀</span>';
            }
        } else {
            sickParticles.classList.add('hidden');
            sickParticles.innerHTML = '';
        }
    }

    // うんち描画
    els.poopContainer.innerHTML = '';
    for (let i = 0; i < state.poopCount; i++) {
        const poop = document.createElement('span');
        poop.innerHTML = "<img src='images/unchi.png' style='width: 48px; height: 48px; object-fit: contain;'>";
        els.poopContainer.appendChild(poop);
    }

    // サブメニュー更新
    if (state.subScreen === 'submenu') {
        els.submenuOptions.innerHTML = '';
        currentSubmenuOptions.forEach((opt, idx) => {
            const div = document.createElement('div');
            div.className = 'menu-option' + (idx === state.submenuIndex ? ' selected' : '');
            div.innerHTML = (idx === state.submenuIndex ? '▶ ' : '&nbsp;&nbsp;') + opt.label;
            els.submenuOptions.appendChild(div);
        });
    }

    // 外部時刻表示の更新
    const extDay = document.getElementById('ext-day');
    const extTime = document.getElementById('ext-time');
    if (extDay) extDay.innerText = `${state.day}日目`;
    if (extTime) extTime.innerText = TIME_SESSIONS[state.timeIndex];

    // 外部ステータス（チート）更新
    if (els.extHunger) els.extHunger.innerText = state.hunger;
    if (els.extMood) els.extMood.innerText = state.mood;
    if (els.extMistakes) els.extMistakes.innerText = state.careMistakes;
    if (els.extTrust) els.extTrust.innerText = state.trust;
    if (els.extMinigames) {
        const successCount = state.stats.playCount - (state.stats.minigameFailures || 0);
        els.extMinigames.innerText = successCount;
    }

    updateCharacterSprite();
    updateBackground();
}

function updateCharacterSprite() {
    // 死亡時はお墓表示
    if (state.isGameOver) {
        const currentImg = els.charSprite.querySelector('img');
        if (!currentImg || !currentImg.src.includes('haka-satoshi.png')) {
            els.charSprite.innerHTML = "<img src='images/haka-satoshi.png' style='width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated; vertical-align: middle;'>";
        }
        return;
    }
    const spriteSrcs = {
        [FORMS.BABY]: "images/baby-satoshi.png",
        [FORMS.MARU]: "images/maru-satoshi.png",
        [FORMS.TAMA]: "images/tama-satoshi.png",
        [FORMS.REVERSE]: "images/reverse-satoshi.png",
        [FORMS.LEGEND]: "images/legend-satoshi.png",
        [FORMS.IDOL]: "images/idol-satoshi.png",
        [FORMS.NORMAL]: "images/normal-satoshi.png",
        [FORMS.SALARYMAN]: "images/salaryman-satoshi.png",
        [FORMS.SICK]: "images/sick-satoshi.png"
    };

    const newSrc = spriteSrcs[state.form];
    if (!newSrc) {
        els.charSprite.innerHTML = "❓";
        return;
    }

    // 既に同じ画像がセットされていれば再描画をスキップしてチラつきを防止
    const currentImg = els.charSprite.querySelector('img');
    if (currentImg && currentImg.src.includes(newSrc)) {
        return; // 同じ画像なのでスキップ
    }
    els.charSprite.innerHTML = `<img src='${newSrc}' style='width: 80px; height: 80px; object-fit: contain; image-rendering: pixelated; vertical-align: middle;'>`;
}

function updateBackground() {
    const screen = document.getElementById('main-display');
    const container = document.getElementById('game-container');

    // LCD画面内の背景色
    screen.style.backgroundColor = '#8fb488'; // 常に液晶のデフォルト色にする

    // 画面外の背景色（時間帯に応じたクラスを適用）
    const timeClasses = ['time-morning', 'time-midday', 'time-noon', 'time-afternoon', 'time-evening', 'time-night'];
    container.classList.remove(...timeClasses);
    container.classList.add(timeClasses[state.timeIndex] || 'time-morning');
}

function showGameOver(reason) {
    state.isGameOver = true;
    state.isGameOverReason = reason;
    state.subScreen = null;
    state.cursorIndex = -1;

    // 既存の幽霊を削除
    const oldGhost = document.getElementById('ghost-float');
    if (oldGhost) oldGhost.remove();

    // 👻 幽霊を浮かべる
    const ghost = document.createElement('div');
    ghost.id = 'ghost-float';
    ghost.innerHTML = "<img src='images/ghost-satoshi.png' style='width: 80px; height: 80px; object-fit: contain;'>";
    els.mainDisplay.appendChild(ghost);

    saveState();
    updateUI();
}

function showFeedback(msg) {
    els.feedbackMsg.innerText = msg;
    els.feedbackMsg.classList.remove('hidden');

    // ちょっと長めに表示
    setTimeout(() => {
        els.feedbackMsg.classList.add('hidden');
        els.feedbackMsg.innerText = '';
    }, 2500);

    // キャラクター跳ねる
    els.characterBox.style.transform = 'scale(1.1) translateY(-10px)';
    setTimeout(() => { els.characterBox.style.transform = 'scale(1) translateY(0)'; }, 150);
}

// ------ A・B・C 物理ボタンのイベント入力 ------
const pressedButtons = new Set();
let resetTimer = null;

function setupEventListeners() {
    const startResetTimer = () => {
        if (state.isGameOver || state.day >= 5) {
            resetTimer = setTimeout(() => {
                resetGame();
            }, 1000); // 1秒長押しでリセット
        }
    };
    const clearResetTimer = () => {
        if (resetTimer) {
            clearTimeout(resetTimer);
            resetTimer = null;
        }
    };

    const handleDown = (btnId) => {
        pressedButtons.add(btnId);
    };
    const handleUp = (btnId) => { pressedButtons.delete(btnId); };

    // ボタンA (選択/移動)
    els.btnA.addEventListener('mousedown', () => { handleDown('a'); handleBtnA(); });
    els.btnA.addEventListener('mouseup', () => handleUp('a'));
    els.btnA.addEventListener('mouseleave', () => handleUp('a'));
    els.btnA.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown('a'); handleBtnA(); });
    els.btnA.addEventListener('touchend', (e) => { e.preventDefault(); handleUp('a'); });

    // ボタンB (決定/時計)
    els.btnB.addEventListener('mousedown', () => { handleDown('b'); handleBtnB(); });
    els.btnB.addEventListener('mouseup', () => handleUp('b'));
    els.btnB.addEventListener('mouseleave', () => handleUp('b'));
    els.btnB.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown('b'); handleBtnB(); });
    els.btnB.addEventListener('touchend', (e) => { e.preventDefault(); handleUp('b'); });

    // ボタンC (キャンセル/戻る)
    els.btnC.addEventListener('mousedown', () => { handleDown('c'); handleBtnC(); startResetTimer(); });
    els.btnC.addEventListener('mouseup', () => { handleUp('c'); clearResetTimer(); });
    els.btnC.addEventListener('mouseleave', () => { handleUp('c'); clearResetTimer(); });
    els.btnC.addEventListener('touchstart', (e) => { e.preventDefault(); handleDown('c'); handleBtnC(); startResetTimer(); });
    els.btnC.addEventListener('touchend', (e) => { e.preventDefault(); handleUp('c'); clearResetTimer(); });

    // キーボード対応（PCでテストしやすくするため）
    document.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'a' && !pressedButtons.has('a')) { handleDown('a'); els.btnA.classList.add('active-sim'); handleBtnA(); }
        if (key === 'b' && !pressedButtons.has('b')) { handleDown('b'); els.btnB.classList.add('active-sim'); handleBtnB(); }
        if (key === 'c' && !pressedButtons.has('c')) { handleDown('c'); els.btnC.classList.add('active-sim'); handleBtnC(); startResetTimer(); }
    });
    document.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === 'a') { handleUp('a'); els.btnA.classList.remove('active-sim'); }
        if (key === 'b') { handleUp('b'); els.btnB.classList.remove('active-sim'); }
        if (key === 'c') { handleUp('c'); els.btnC.classList.remove('active-sim'); clearResetTimer(); }
    });

    // 外部ボタン: 時間を進める
    const advBtn = document.getElementById('btn-advance-out');
    if (advBtn) {
        advBtn.addEventListener('click', () => {
            advanceTime();
        });
    }

    // 外部ボタン: 図鑑
    const encBtn = document.getElementById('btn-encyclopedia-out');
    if (encBtn) {
        encBtn.addEventListener('click', () => {
            renderEncyclopedia();
            document.getElementById('encyclopedia-modal').classList.remove('hidden');
        });
    }
    document.getElementById('btn-close-encyclopedia').addEventListener('click', () => {
        document.getElementById('encyclopedia-modal').classList.add('hidden');
    });

    // 外部ボタン: ヒント
    const hintBtn = document.getElementById('btn-hint-out');
    if (hintBtn) {
        hintBtn.addEventListener('click', () => {
            document.getElementById('hint-modal').classList.remove('hidden');
        });
    }
    document.getElementById('btn-close-hint').addEventListener('click', () => {
        document.getElementById('hint-modal').classList.add('hidden');
    });
}

function handleBtnA() {
    if (state.isGameOver) return;

    if (state.subScreen === null || state.subScreen === 'stats' || state.subScreen === 'clock') {
        // メイン画面でのカーソル移動（0〜7）。全8アイコン選択可能
        state.subScreen = null; // サブ画面開いてたら閉じてカーソル操作に戻る
        state.cursorIndex = (state.cursorIndex + 1) % 8;
    } else if (state.subScreen === 'submenu') {
        // サブメニュー内での選択肢移動
        state.submenuIndex = (state.submenuIndex + 1) % currentSubmenuOptions.length;
    }
    updateUI();
}

function handleBtnB() {
    if (state.isGameOver) return;

    if (state.subScreen === 'clock') {
        // 時計画面でB = 時計を閉じて戻るのみ（時間は進めない）
        state.subScreen = null;
        state.cursorIndex = -1;
    } else if (state.subScreen === 'minigame') {
        stopMinigame();
    } else if (state.subScreen === 'submenu') {
        // サブメニュー実行
        const option = currentSubmenuOptions[state.submenuIndex];
        if (option && option.action) {
            option.action();
        }
        state.subScreen = null;
        state.cursorIndex = -1;
    } else if (state.cursorIndex === -1) {
        // カーソル未選択でB = 時計画面（次へ進む用）
        state.subScreen = 'clock';
    } else {
        // アイコン選択中のB = そのアイコンのアクションを実行
        executeIconAction(state.cursorIndex);
    }
    updateUI();
}

function handleBtnC() {
    // 戻る / カーソル消去
    state.subScreen = null;
    state.cursorIndex = -1;
    currentSubmenuOptions = [];
    updateUI();
}

function openSubmenu(title, options) {
    els.submenuTitle.innerHTML = title;
    currentSubmenuOptions = options;
    state.submenuIndex = 0;
    state.subScreen = 'submenu';
}

function executeIconAction(index) {
    switch (index) {
        case 0: // ごはん
            openSubmenu("<img src='images/icon-food.png' style='width: 20px; vertical-align: middle;'>", [
                { label: "<img src='images/icon-onigiri.png' style='width: 24px; vertical-align: middle;'> おにぎり", action: feedOnigiri },
                { label: "<img src='images/icon-choco.png' style='width: 24px; vertical-align: middle;'> チョコ", action: feedChoco }
            ]);
            break;
        case 1: // 電気
            toggleLights();
            state.cursorIndex = -1;
            break;
        case 2: // あそぶ
            playMinigame();
            state.cursorIndex = -1;
            break;
        case 3: // 病気・注射
            treatSick();
            state.cursorIndex = -1;
            break;
        case 4: // トイレ
            useToilet();
            state.cursorIndex = -1;
            break;
        case 5: // ステータス
            state.subScreen = 'stats';
            break;
        case 6: // しつけ
            praise();
            state.cursorIndex = -1;
            break;
        case 7: // 雷（⚡）
            handleThunder();
            state.cursorIndex = -1;
            break;
    }
}

// ------ アクションロジック ------
function consumeAction() {
    if (state.actionsLeft <= 0) {
        showFeedback("⚠️ ⏩!");
        return false;
    }
    state.actionsLeft--;
    return true;
}

function updateStat(key, change, min = 0, max = 5) {
    state[key] += change;
    if (state[key] > max) state[key] = max;
    if (state[key] < min) state[key] = min;
}

function feedOnigiri() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.hunger >= 5) {
        showFeedback("😑");
        state.isDemanding = true;
    } else {
        updateStat('hunger', 2);
        state.stats.onigiriCount++;
        showFeedback("😋");
    }
    saveState();
}

function feedChoco() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.hunger >= 5 && state.mood >= 5) {
        showFeedback("😑");
        state.isDemanding = true;
    } else {
        updateStat('hunger', 1);
        updateStat('mood', 1);
        state.stats.chocoCount++;
        showFeedback("😋");
    }
    saveState();
}

let minigameInterval = null;
const slotSymbols = ["🔥", "💀", "🔪", "😆"];

function playMinigame() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.mood >= 5) {
        showFeedback("😑");
        state.isDemanding = true;
        saveState();
        return;
    }

    state.subScreen = 'minigame';
    state.cursorIndex = -1;
    updateUI();

    minigameInterval = setInterval(() => {
        document.getElementById('slot-1').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        document.getElementById('slot-2').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
        document.getElementById('slot-3').innerText = slotSymbols[Math.floor(Math.random() * slotSymbols.length)];
    }, 100);
}

function stopMinigame() {
    clearInterval(minigameInterval);
    const resultSymbol = document.getElementById('slot-1').innerText;
    document.getElementById('slot-2').innerText = resultSymbol;
    document.getElementById('slot-3').innerText = resultSymbol;

    setTimeout(() => {
        state.subScreen = null;
        state.stats.playCount++;
        updateStat('hunger', -1);

        if (resultSymbol === "😆") {
            updateStat('mood', 2);
            showFeedback("😆");
        } else {
            // 失敗（炎上など）
            state.stats.minigameFailures = (state.stats.minigameFailures || 0) + 1;
            updateStat('mood', -2, 0, 5);
            showFeedback("😨");
        }
        updateUI();
        saveState();
    }, 1500);
}

function useToilet() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.poopCount > 0) {
        // 現在のうんちを複製して残し、波に流されるようにする
        const fakePoops = els.poopContainer.cloneNode(true);
        fakePoops.id = 'fake-poops';
        els.mainDisplay.appendChild(fakePoops);

        state.poopCount = 0;

        let fakeEnemy = null;
        if (state.enemyPresent) {
            fakeEnemy = els.enemyInd.cloneNode(true);
            fakeEnemy.id = ''; // 元のID設定を外す
            // 流されるときは悲しい顔の画像に差し替え
            const img = fakeEnemy.querySelector('img');
            if (img) img.src = 'images/akira-sad.png';
            fakeEnemy.style.position = 'absolute';
            fakeEnemy.style.top = '10px';
            fakeEnemy.style.left = '10px';
            fakeEnemy.style.zIndex = '6';
            fakeEnemy.classList.remove('hidden');
            fakeEnemy.style.animation = 'slidePoop 1.5s cubic-bezier(0.2, 0, 0.2, 1) forwards';
            els.mainDisplay.appendChild(fakeEnemy);
            state.enemyPresent = false;
        }

        saveState();

        // 波のアニメーション要素
        const wave = document.createElement('div');
        wave.id = 'water-wave';
        els.mainDisplay.appendChild(wave);

        // タイミングを合わせてフェイクうんち(とアキラ)を消す
        setTimeout(() => {
            if (fakePoops) fakePoops.remove();
            if (fakeEnemy) fakeEnemy.remove();
            showFeedback("😌");
        }, 800);

        // アニメーション終了後に波要素自体を削除
        setTimeout(() => {
            if (wave) wave.remove();
        }, 1500);

    } else {
        showFeedback("❓️");
        saveState();
    }
}

function treatSick() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.isSick) {
        state.isSick = false;
        state.stats.sickIgnoredCount = 0;
        state.isAppealing = true; // 治療後にアピール状態になる
        showFeedback("😆");
    } else {
        showFeedback("❓️");
        state.careMistakes++;
    }
    saveState();
}

function useBlack() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.enemyPresent) {
        state.enemyPresent = false;
        state.stats.blackCount++;
        state.isAppealing = true; // 撃退後にアピール状態になる
        showFeedback("😆");
    } else {
        showFeedback("❓️");
        state.careMistakes++;
        updateStat('trust', -1, -5, 10);
    }
    saveState();
}

// ------ 雷ボタン（筐体内 ⚡ アイコン） ------
function handleThunder() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    // 行動回数を消費しない
    if (state.enemyPresent) {
        // アキラがいる → 雷で撃退！
        state.enemyPresent = false;
        state.stats.blackCount++;
        state.isAppealing = true;

        // ブラックが右側に現れてアキラを追い払う演出
        showBlackAttack();

        showThunderFlash();
        showFeedback("😆");
    } else {
        // アキラがいない → ブラックが来て❓を出して帰る
        showBlackConfused();
    }
    updateUI();
    saveState();
}

function showThunderFlash() {
    const flash = document.createElement('div');
    flash.id = 'thunder-flash';
    els.mainDisplay.appendChild(flash);
    setTimeout(() => flash.remove(), 500);
}

function showBlackAttack() {
    // 撃退時に右側にブラックが現れる演出
    const black = document.createElement('div');
    // 右側に配置（right: 10px）
    black.style.cssText = 'position:absolute;top:10px;right:10px;z-index:8;';
    black.innerHTML = "<img src='images/black.png' style='width: 80px; height: 80px; object-fit: contain;'>";
    els.mainDisplay.appendChild(black);

    setTimeout(() => {
        black.style.transition = 'opacity 0.3s';
        black.style.opacity = '0';
    }, 800);

    setTimeout(() => {
        black.remove();
    }, 1100);
}

function showBlackConfused() {
    // ブラックが一瞬現れて❓を出して帰る演出
    const black = document.createElement('div');
    // こちらは左側でも右側でも良いが、統一感を持たせるるため右側にするか、元の左のままにするか。一旦右側にしておく。
    black.style.cssText = 'position:absolute;top:10px;right:5px;z-index:8;';
    // ブラック画像の右上に「❓」を配置
    black.innerHTML = `
        <img src='images/black.png' style='width: 80px; height: 80px; object-fit: contain;'>
        <div style='position:absolute; top:-10px; right:-10px; font-size: 2rem; font-weight: bold;'>❓</div>
    `;
    els.mainDisplay.appendChild(black);

    setTimeout(() => {
        black.style.transition = 'opacity 0.3s';
        black.style.opacity = '0';
    }, 1200);

    setTimeout(() => {
        black.remove();
        showFeedback("❓");
    }, 1600);
}

function toggleLights() {
    if (state.isGameOver) return;
    if (state.timeIndex === 5) { // 21:00 のみ点滅可能
        state.lightsOff = !state.lightsOff;
        showFeedback(state.lightsOff ? "😴" : "😶");
    } else {
        showFeedback("🤔");
    }
    saveState();
}

function scold() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.isDemanding) {
        showFeedback("🥹");
        updateStat('trust', 1, -5, 10);
        state.isDemanding = false;
    } else {
        showFeedback("😭");
        state.careMistakes++;
        updateStat('trust', -2, -5, 10);
    }
    saveState();
}

function praise() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (!consumeAction()) return;
    if (state.isSick || state.enemyPresent || state.isAppealing) {
        showFeedback("😆");
        updateStat('trust', 1, -5, 10);
        state.isAppealing = false;
    } else if (state.isDemanding) {
        showFeedback("🥺");
        state.careMistakes++;
        updateStat('trust', -1, -5, 10);
    } else {
        showFeedback("❓");
        state.careMistakes++;
    }
    updateUI(); saveState();
}


// ------ ゲームロジックとターン進行 ------
function advanceTime() {
    if (state.isGameOver) return;

    // ★ Day0のベビー期は1ターンで即座にDay1へ進む（仕様通り）
    if (state.form === FORMS.BABY) {
        state.day = 1;
        state.timeIndex = 0;
        checkEvolution();
        updateUI();
        saveState();
        return;
    }

    // 前ターンの評価
    // 消灯チェック (21:00からの進行)
    if (state.timeIndex === 5) {
        if (!state.lightsOff) {
            state.careMistakes++; // 電気消し忘れ
        }
    }

    state.lightsOff = false;

    // 死亡とミス判定
    if (state.poopCount >= 1) state.careMistakes++;
    if (state.poopCount >= 2) {
        if (Math.random() < 0.5 && !state.isSick) {
            state.isSick = true;
            state.stats.sickTotalCount = (state.stats.sickTotalCount || 0) + 1;
        }
    }
    if (state.enemyPresent) {
        state.careMistakes++; // 敵放置
    }
    if (state.isSick) {
        state.stats.sickIgnoredCount++;
        // 5日目への進化のタイミング（4日目の最終ターン）なら死なせずに進化させる
        const isEvolvingToDay5 = (state.day === 4 && state.timeIndex === 5);
        if (state.stats.sickIgnoredCount >= 3 && !isEvolvingToDay5) {
            showGameOver("<img src='images/haka-satoshi.png' style='width: 80px; height: 80px; object-fit: contain;'>");
            return;
        }
    }

    // 死亡判定 (空腹0のままターン進行)
    if (state.hunger <= 0) {
        showGameOver("<img src='images/haka-satoshi.png' style='width: 80px; height: 80px; object-fit: contain;'>");
        return;
    }

    // 時間と日数の進行
    state.timeIndex++;
    state.isDemanding = false;
    state.actionsLeft = 3; // 行動回数をリセット

    if (state.timeIndex >= TIME_SESSIONS.length) {
        state.timeIndex = 0;
        state.day++;

        // ★ 日付をまたいだら（21:00のターン終了時に）敵がいれば勝手に帰る
        if (state.enemyPresent) {
            state.enemyPresent = false;
        }

        checkEvolution();
    }

    // 昼間の変化（BABY以外の全形態で発動）
    if (state.timeIndex > 0 && state.timeIndex < 5 && !state.isGameOver) {
        updateStat('hunger', -1);
        updateStat('mood', -1);


        // ★ 助けてアピール発生
        if ((state.hunger >= 2) && Math.random() < 0.4) {
            state.isAppealing = true;
            const msgs = [
                "hungry…"
            ];
            showFeedback(msgs[Math.floor(Math.random() * msgs.length)]);
        }

        // ランダムイベント
        let eventTriggered = false;
        if (Math.random() < 0.25 && state.poopCount < 4) state.poopCount++;

        // ★ 4日目は病気になる確率をアップ (通常20% → 60%)
        const sickProbability = (state.day === 4) ? 0.6 : 0.2;

        if (Math.random() < sickProbability && !state.isSick && !state.enemyPresent) {
            state.isSick = true;
            state.stats.sickTotalCount = (state.stats.sickTotalCount || 0) + 1;
            eventTriggered = true;
            showFeedback("🤒");
        }
        // 病気が発生しなかった場合のみ、アキラの襲来を判定（同時発生を防ぐ）
        // テストしやすいように出現率を上げ、1日目から出現可能にする
        if (!eventTriggered && Math.random() < 0.4 && !state.enemyPresent && !state.isSick && state.day >= 1) {
            state.enemyPresent = true;
            showFeedback("😨");
        }
    }

    updateUI();
    saveState();
}

function checkEvolution() {
    if (state.day === 1) {
        state.form = FORMS.MARU;
        showFeedback("✨");
    } else if (state.day === 2) {
        state.form = FORMS.TAMA;
        showFeedback("✨");
    } else if (state.day === 5) {
        // ★ 最終進化判定（信頼度も全ルートに関与）
        let nextForm = FORMS.NORMAL;

        // 病弱さとし：病気状態で5日目を迎える
        if (state.isSick) {
            nextForm = FORMS.SICK;
        }
        // 反転さとし：信頼度0 ＋ お世話ミス0 ＋ 🍙のみ与える
        else if (state.trust === 0 && state.careMistakes === 0 && state.stats.onigiriCount > 0 && state.stats.chocoCount === 0) {
            nextForm = FORMS.REVERSE;
        }
        // レジェンドYoutuber：信頼度高い(5以上) ＋ Youtube（ミニゲーム）失敗0(プレイ数1回以上) ＋ お世話ミス0
        else if (state.trust >= 5 && state.stats.playCount > 0 && (!state.stats.minigameFailures || state.stats.minigameFailures === 0) && state.careMistakes === 0) {
            nextForm = FORMS.LEGEND;
        }
        // アイドルさとし：信頼度が高い(5以上) ＋ チョコのみ
        else if (state.trust >= 5 && state.stats.chocoCount > 0 && state.stats.onigiriCount === 0) {
            nextForm = FORMS.IDOL;
        }
        // 普通のさとし： ブラック😈を1回以上呼ぶ
        else if (state.stats.blackCount >= 1) {
            nextForm = FORMS.NORMAL;
        }
        // サラリーマンさとし：ブラック😈未使用
        else if (state.stats.blackCount === 0) {
            nextForm = FORMS.SALARYMAN;
        }

        state.form = nextForm;
        showFeedback(`✨`);
        unlockEncyclopedia(nextForm);

        showFeedback(`C長押しﾘｾｯﾄ`);
    }
}

// Evolution Reset GUI removed, replaced by C button physical long press detection

function getFormName(formId) {
    const names = {
        [FORMS.REVERSE]: "反転さとし",
        [FORMS.LEGEND]: "レジェンドYoutuberさとし",
        [FORMS.IDOL]: "アイドルさとし",
        [FORMS.NORMAL]: "普通のさとし",
        [FORMS.SALARYMAN]: "サラリーマンさとし",
        [FORMS.SICK]: "病弱さとし"
    };
    return names[formId] || "さとし";
}

function unlockEncyclopedia(form) {
    let unlocked = JSON.parse(localStorage.getItem('satoshi_encyclopedia') || '[]');
    if (!unlocked.includes(form)) {
        unlocked.push(form);
        localStorage.setItem('satoshi_encyclopedia', JSON.stringify(unlocked));
        setTimeout(() => showFeedback("📖"), 2000);
    }
}

function renderEncyclopedia() {
    const grid = document.getElementById('encyclopedia-grid');
    grid.innerHTML = '';
    const unlocked = JSON.parse(localStorage.getItem('satoshi_encyclopedia') || '[]');

    const allForms = [
        { id: FORMS.REVERSE, name: "反転さとし", icon: "<img src='images/reverse-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" },
        { id: FORMS.LEGEND, name: "レジェンドYoutuber", icon: "<img src='images/legend-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" },
        { id: FORMS.IDOL, name: "アイドルさとし", icon: "<img src='images/idol-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" },
        { id: FORMS.NORMAL, name: "普通のさとし", icon: "<img src='images/normal-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" },
        { id: FORMS.SALARYMAN, name: "サラリーマンさとし", icon: "<img src='images/salaryman-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" },
        { id: FORMS.SICK, name: "病弱さとし", icon: "<img src='images/sick-satoshi.png' style='width: 60px; height: 60px; object-fit: contain; image-rendering: pixelated;'>" }
    ];

    allForms.forEach(f => {
        const div = document.createElement('div');
        div.className = 'encyclopedia-item';
        if (unlocked.includes(f.id)) {
            div.classList.add('unlocked');
            div.innerHTML = `<div style="font-size: 2.5rem; margin-bottom: 5px;">${f.icon}</div><div style="font-weight: bold;">${f.name}</div>`;
        } else {
            div.innerHTML = `<div style="font-size: 2.5rem; color:#ccc; margin-bottom: 5px;">❓</div><div style="color: #999;">未発見</div>`;
        }
        grid.appendChild(div);
    });
}

document.addEventListener("DOMContentLoaded", init);
