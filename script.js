const TIME_SESSIONS = ["8:00", "10:00", "12:00", "15:00", "18:00", "21:00"];
const FORMS = {
    BABY: "baby",           // 0日目
    MARU: "maru",           // 1日目
    TAMA: "tama",           // 2〜4日目
    REVERSE: "reverse",     // 反転さとし
    LEGEND: "legend",       // レジェンドYoutuber
    IDOL: "idol",           // アイドルさとし
    NORMAL: "normal",       // 普通のさとし
    SALARYMAN: "salaryman"  // サラリーマンさとし
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
    stats: {
        playCount: 0,
        chocoCount: 0,
        onigiriCount: 0,
        blackCount: 0,
        sickIgnoredCount: 0
    }
};

let state = {};

// DOM Elements
const els = {
    dayDisp: document.getElementById('day-display'),
    timeDisp: document.getElementById('time-display'),
    charSprite: document.getElementById('char-sprite'),
    characterBox: document.getElementById('character'),
    hungerStat: document.getElementById('stat-hunger'),
    moodStat: document.getElementById('stat-mood'),
    trustStat: document.getElementById('stat-trust'),
    missStat: document.getElementById('stat-miss'),
    poopContainer: document.getElementById('poop-container'),
    sickInd: document.getElementById('sick-indicator'),
    enemyInd: document.getElementById('enemy-indicator'),
    lightsOverlay: document.getElementById('lights-overlay'),
    gameOverOverlay: document.getElementById('game-over-overlay'),
    gameOverReason: document.getElementById('game-over-reason'),

    foodMenu: document.getElementById('food-menu'),
    discMenu: document.getElementById('discipline-menu'),
    encycModal: document.getElementById('encyclopedia-modal')
};

function init() {
    loadState();
    if (state.isGameOver) {
        showGameOver(state.isGameOverReason || "さとしは死んでしまいました...");
    } else {
        updateUI();
        if (state.day >= 5) {
            showEvolutionResetButton();
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
    saveState();
    els.gameOverOverlay.classList.add('hidden');
    updateUI();
}

// ------ UI更新 ------
function updateUI() {
    els.dayDisp.innerText = `${state.day}日目`;
    els.timeDisp.innerText = TIME_SESSIONS[state.timeIndex];

    els.hungerStat.innerText = state.hunger;
    els.moodStat.innerText = state.mood;
    els.trustStat.innerText = state.trust;
    els.missStat.innerText = state.careMistakes;

    els.sickInd.classList.toggle('hidden', !state.isSick);
    els.enemyInd.classList.toggle('hidden', !state.enemyPresent);
    els.lightsOverlay.classList.toggle('hidden', !state.lightsOff);

    els.poopContainer.innerHTML = '';
    for (let i = 0; i < state.poopCount; i++) {
        const poop = document.createElement('span');
        poop.innerText = '💩';
        els.poopContainer.appendChild(poop);
    }

    updateCharacterSprite();
    updateBackground();
}

function updateCharacterSprite() {
    const sprites = {
        [FORMS.BABY]: "🥚",
        [FORMS.MARU]: "👶",
        [FORMS.TAMA]: "👦",
        [FORMS.REVERSE]: "🙃",
        [FORMS.LEGEND]: "📹",
        [FORMS.IDOL]: "🎤",
        [FORMS.NORMAL]: "🧑",
        [FORMS.SALARYMAN]: "👔"
    };
    els.charSprite.innerText = sprites[state.form] || "❓";
}

function updateBackground() {
    const screen = document.getElementById('game-screen');
    if (state.timeIndex === 5) { // 21:00
        screen.style.backgroundColor = 'var(--game-bg-night)';
    } else if (state.timeIndex === 4) { // 18:00
        screen.style.backgroundColor = 'var(--game-bg-evening)';
    } else {
        screen.style.backgroundColor = 'var(--game-bg-day)';
    }
}

function showGameOver(reason) {
    state.isGameOver = true;
    state.isGameOverReason = reason;
    saveState();
    els.gameOverReason.innerText = reason;
    els.gameOverOverlay.classList.remove('hidden');
}

function showFeedback(msg) {
    let fb = document.getElementById('feedback-msg');
    if (!fb) {
        fb = document.createElement('div');
        fb.id = 'feedback-msg';
        fb.style.position = 'absolute';
        fb.style.top = '15px';
        fb.style.width = '90%';
        fb.style.left = '5%';
        fb.style.textAlign = 'center';
        fb.style.color = '#333';
        fb.style.fontWeight = 'bold';
        fb.style.background = 'rgba(255,255,255,0.95)';
        fb.style.padding = '10px';
        fb.style.borderRadius = '15px';
        fb.style.zIndex = '50';
        fb.style.transition = 'opacity 0.3s, transform 0.3s';
        fb.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
        fb.style.transform = 'translateY(-20px)';
        document.getElementById('game-screen').appendChild(fb);
    }
    fb.innerText = msg;
    fb.style.opacity = '1';
    fb.style.transform = 'translateY(0)';

    // アニメーション
    els.characterBox.style.transform = 'scale(1.1)';
    setTimeout(() => { els.characterBox.style.transform = 'scale(1)'; }, 150);

    setTimeout(() => {
        if (fb) {
            fb.style.opacity = '0';
            fb.style.transform = 'translateY(-20px)';
        }
    }, 2000);
}

// ------ イベントリスナー ------
function setupEventListeners() {
    document.getElementById('btn-reset').addEventListener('click', resetGame);

    // サブメニュー開閉
    document.getElementById('btn-food').addEventListener('click', () => { els.foodMenu.classList.remove('hidden'); els.discMenu.classList.add('hidden'); });
    document.getElementById('btn-discipline').addEventListener('click', () => { els.discMenu.classList.remove('hidden'); els.foodMenu.classList.add('hidden'); });

    document.querySelectorAll('.btn-cancel').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.parentElement.classList.add('hidden');
        });
    });

    // 次へ進む
    document.getElementById('btn-next-time').addEventListener('click', advanceTime);

    // アクションバインディング
    document.getElementById('btn-food-onigiri').addEventListener('click', feedOnigiri);
    document.getElementById('btn-food-choco').addEventListener('click', feedChoco);
    document.getElementById('btn-play').addEventListener('click', playMinigame);
    document.getElementById('btn-toilet').addEventListener('click', useToilet);
    document.getElementById('btn-sick').addEventListener('click', treatSick);
    document.getElementById('btn-black').addEventListener('click', useBlack);
    document.getElementById('btn-lights').addEventListener('click', toggleLights);
    document.getElementById('btn-disc-scold').addEventListener('click', scold);
    document.getElementById('btn-disc-praise').addEventListener('click', praise);

    // 図鑑
    document.getElementById('btn-encyclopedia').addEventListener('click', () => {
        renderEncyclopedia();
        els.encycModal.classList.remove('hidden');
    });
    document.getElementById('btn-close-encyclopedia').addEventListener('click', () => {
        els.encycModal.classList.add('hidden');
    });
}

// ------ アクションロジック ------
function updateStat(key, change, min = 0, max = 5) {
    state[key] += change;
    if (state[key] > max) state[key] = max;
    if (state[key] < min) state[key] = min;
}

function feedOnigiri() {
    els.foodMenu.classList.add('hidden');
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (state.hunger >= 5) {
        showFeedback("お腹いっぱいみたい...");
        state.isDemanding = true;
    } else {
        updateStat('hunger', 1);
        state.stats.onigiriCount++;
        showFeedback("🍙 もぐもぐ...");
    }
    updateUI(); saveState();
}

function feedChoco() {
    els.foodMenu.classList.add('hidden');
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (state.hunger >= 5 && state.mood >= 5) {
        showFeedback("もういらないみたい...");
        state.isDemanding = true;
    } else {
        updateStat('hunger', 1);
        updateStat('mood', 1);
        state.stats.chocoCount++;
        showFeedback("🍫 うれしそう！");
    }
    updateUI(); saveState();
}

function playMinigame() {
    if (state.isGameOver || state.form === FORMS.BABY) return;
    if (state.mood >= 5) {
        showFeedback("今は遊びたくないみたい...");
        state.isDemanding = true;
    } else {
        updateStat('mood', 2);
        updateStat('hunger', -1); // 遊ぶと少しお腹が減る
        state.stats.playCount++;
        showFeedback("📺 動画撮影成功！機嫌アップ！");
    }
    updateUI(); saveState();
}

function useToilet() {
    if (state.isGameOver) return;
    if (state.poopCount > 0) {
        state.poopCount = 0;
        showFeedback("🚽 スッキリした！");
    } else {
        showFeedback("今は出ないみたい...");
    }
    updateUI(); saveState();
}

function treatSick() {
    if (state.isGameOver) return;
    if (state.isSick) {
        state.isSick = false;
        state.stats.sickIgnoredCount = 0;
        state.isAppealing = true; // 治療後に「褒める」チャンスを残す
        showFeedback("💉 注射チックン！治った！褒めてあげよう！");
    } else {
        showFeedback("病気じゃないよ");
        state.careMistakes++;
    }
    updateUI(); saveState();
}

function useBlack() {
    if (state.isGameOver) return;
    if (state.enemyPresent) {
        state.enemyPresent = false;
        state.stats.blackCount++;
        state.isAppealing = true; // 撃退後に「褒める」チャンスを残す
        showFeedback("⚡ デビルサンダー！アキラを撃退した！褒めてあげよう！");
    } else {
        showFeedback("誰もいないのに...さとしが怯えている");
        state.careMistakes++;
        updateStat('trust', -1, -5, 10);
    }
    updateUI(); saveState();
}

function toggleLights() {
    if (state.isGameOver) return;
    if (state.timeIndex === 5) { // 21:00 のみ点滅可能
        state.lightsOff = !state.lightsOff;
        showFeedback(state.lightsOff ? "💡 電気を消した。おやすみ..." : "💡 電気を点けた");
    } else {
        showFeedback("まだ寝る時間じゃないよ");
    }
    updateUI(); saveState();
}

function scold() {
    els.discMenu.classList.add('hidden');
    if (state.isGameOver) return;
    if (state.isDemanding) {
        showFeedback("💢 ちゃんと説教した！信頼度アップ！");
        updateStat('trust', 1, -5, 10);
        state.isDemanding = false;
    } else {
        showFeedback("なんでもないのに怒られた...信頼度ダウン");
        state.careMistakes++;
        updateStat('trust', -2, -5, 10);
    }
    updateUI(); saveState();
}

function praise() {
    els.discMenu.classList.add('hidden');
    if (state.isGameOver) return;
    if (state.isSick || state.enemyPresent || state.isAppealing) {
        showFeedback("✨ えらいね！信頼度アップ！");
        updateStat('trust', 1, -5, 10);
        state.isAppealing = false;
    } else if (state.isDemanding) {
        showFeedback("ワガママを褒めちゃダメ！信頼度ダウン");
        state.careMistakes++;
        updateStat('trust', -1, -5, 10);
    } else {
        showFeedback("なんでもないのに褒められた...");
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
        if (Math.random() < 0.5) state.isSick = true;
    }
    if (state.enemyPresent) {
        state.careMistakes++; // 敵放置
    }
    if (state.isSick) {
        state.stats.sickIgnoredCount++;
        if (state.stats.sickIgnoredCount >= 2) {
            showGameOver("病気を放置しすぎて死んでしまった...");
            return;
        }
    }

    // 死亡判定 (空腹0のままターン進行)
    if (state.hunger <= 0) {
        showGameOver("空腹で死んでしまった...");
        return;
    }

    // 時間と日数の進行
    state.timeIndex++;
    state.isDemanding = false;

    if (state.timeIndex >= TIME_SESSIONS.length) {
        state.timeIndex = 0;
        state.day++;
        checkEvolution();
    }

    // 昼間の変化（BABY以外の全形態で発動）
    if (state.timeIndex > 0 && state.timeIndex < 5 && !state.isGameOver) {
        updateStat('hunger', -1);
        updateStat('mood', -1);

        // ★ おねだり（ワガママ）発生: 空腹か機嫌が満タンなのにアピールしてくる => 「叱る」チャンス
        if ((state.hunger >= 4 || state.mood >= 4) && Math.random() < 0.4) {
            state.isDemanding = true;
            const msgs = [
                "🍚 お腹すいた〜と言っているが…さっき食べたばかりだぞ？",
                "📺 遊んで遊んで〜！と言っているが…さっき遊んだだろ？",
                "🍫 チョコ！チョコ！とねだっている！",
                "なんだかワガママを言っているぞ..."
            ];
            showFeedback(msgs[Math.floor(Math.random() * msgs.length)]);
        }

        // ★ 助けてアピール発生（病気・敵関係なく、信頼度を上げるチャンス）=> 「褒める」チャンス
        if (!state.isDemanding && Math.random() < 0.25) {
            state.isAppealing = true;
            const msgs = [
                "😢 なんだか寂しそうにしている…褒めてあげよう！",
                "✨ さとしが何か頑張ったみたい！褒めてあげよう！",
                "🥺 こっちを見て甘えている…褒めてあげよう！"
            ];
            showFeedback(msgs[Math.floor(Math.random() * msgs.length)]);
        }

        // ランダムイベント
        if (Math.random() < 0.25 && state.poopCount < 4) state.poopCount++;
        if (Math.random() < 0.2 && !state.isSick) {
            state.isSick = true;
            showFeedback("🏥 具合が悪そう...助けを求めている！");
        }
        if (Math.random() < 0.15 && !state.enemyPresent && state.day >= 2) {
            state.enemyPresent = true;
            showFeedback("😈 アキラが来た！助けを求めている！");
        }
    }

    updateUI();
    saveState();
}

function checkEvolution() {
    if (state.day === 1) {
        state.form = FORMS.MARU;
        showFeedback("まるさとしに進化した！");
    } else if (state.day === 2) {
        state.form = FORMS.TAMA;
        showFeedback("たまさとしに進化した！");
    } else if (state.day === 5) {
        // ★ 最終進化判定（信頼度も全ルートに関与）
        let nextForm = FORMS.NORMAL;

        if (state.careMistakes === 0 && state.stats.playCount === 0 && state.stats.chocoCount === 0 && state.trust >= 2) {
            // 反転さとし: ミス0、遊び・チョコ未使用、信頼度2以上（ストイック）
            nextForm = FORMS.REVERSE;
        } else if (state.careMistakes === 0 && state.stats.playCount >= 3 && state.stats.chocoCount >= 3 && state.trust >= 3) {
            // レジェンドYoutuber: ミス0、遊び・チョコ積極活用、信頼度高
            nextForm = FORMS.LEGEND;
        } else if (state.stats.onigiriCount === 0 && state.stats.chocoCount > 0 && state.trust >= 4) {
            // アイドルさとし: チョコのみ、信頼度高
            nextForm = FORMS.IDOL;
        } else if (state.stats.blackCount >= 1 && state.trust >= 2) {
            // 普通のさとし: ブラック使用、信頼度まぁまぁ
            nextForm = FORMS.NORMAL;
        } else if (state.stats.playCount === 0 && state.stats.blackCount === 0 && state.trust < 2) {
            // サラリーマンさとし: 遊び・ブラック未使用、信頼度低め
            nextForm = FORMS.SALARYMAN;
        } else if (state.trust >= 3) {
            nextForm = FORMS.NORMAL;
        } else {
            nextForm = FORMS.SALARYMAN; // 信頼度が低いとサラリーマン
        }

        state.form = nextForm;
        showFeedback(`進化！！「${getFormName(nextForm)}」になった！`);
        unlockEncyclopedia(nextForm);

        showEvolutionResetButton();
    }
}

function showEvolutionResetButton() {
    let btn = document.getElementById('btn-evolve-reset');
    if (!btn) {
        btn = document.createElement('button');
        btn.id = 'btn-evolve-reset';
        btn.innerText = '🥚 新しい卵から育てる';
        btn.style.cssText = `
            position: absolute; bottom: 15px; right: 10px;
            padding: 10px 16px; background: linear-gradient(135deg, #ff6b6b, #ee5a24);
            color: #fff; border: 2px solid #fff; border-radius: 12px;
            font-family: var(--font-pixel); font-size: 0.85rem;
            z-index: 40; cursor: pointer;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
        `;
        btn.addEventListener('click', () => {
            // confirm()の代わりにカスタム確認UIを表示
            showResetConfirm();
        });
        document.getElementById('game-screen').appendChild(btn);
    }
}

function showResetConfirm() {
    let overlay = document.getElementById('reset-confirm-overlay');
    if (overlay) overlay.remove();

    overlay = document.createElement('div');
    overlay.id = 'reset-confirm-overlay';
    overlay.style.cssText = `
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.7); z-index: 50;
        display: flex; flex-direction: column; justify-content: center; align-items: center;
        text-align: center; color: white; padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="background: #333; padding: 25px; border-radius: 16px; max-width: 85%;">
            <p style="font-size: 1.1rem; margin-bottom: 20px;">今のさとしとお別れして、<br>新しい卵から育てますか？</p>
            <div style="display: flex; gap: 15px; justify-content: center;">
                <button id="confirm-reset-yes" style="padding: 12px 25px; background: #ff4444; color: white; border: none; border-radius: 10px; font-size: 1rem; cursor: pointer;">はい</button>
                <button id="confirm-reset-no" style="padding: 12px 25px; background: #666; color: white; border: none; border-radius: 10px; font-size: 1rem; cursor: pointer;">いいえ</button>
            </div>
        </div>
    `;
    document.getElementById('game-screen').appendChild(overlay);

    document.getElementById('confirm-reset-yes').addEventListener('click', () => {
        overlay.remove();
        const evolBtn = document.getElementById('btn-evolve-reset');
        if (evolBtn) evolBtn.remove();
        resetGame();
    });
    document.getElementById('confirm-reset-no').addEventListener('click', () => {
        overlay.remove();
    });
}

function getFormName(formId) {
    const names = {
        [FORMS.REVERSE]: "反転さとし",
        [FORMS.LEGEND]: "レジェンドYoutuberさとし",
        [FORMS.IDOL]: "アイドルさとし",
        [FORMS.NORMAL]: "普通のさとし",
        [FORMS.SALARYMAN]: "サラリーマンさとし"
    };
    return names[formId] || "さとし";
}

function unlockEncyclopedia(form) {
    let unlocked = JSON.parse(localStorage.getItem('satoshi_encyclopedia') || '[]');
    if (!unlocked.includes(form)) {
        unlocked.push(form);
        localStorage.setItem('satoshi_encyclopedia', JSON.stringify(unlocked));
        setTimeout(() => showFeedback("図鑑に新しい姿が記録された!!"), 2000);
    }
}

function renderEncyclopedia() {
    const grid = document.getElementById('encyclopedia-grid');
    grid.innerHTML = '';
    const unlocked = JSON.parse(localStorage.getItem('satoshi_encyclopedia') || '[]');

    const allForms = [
        { id: FORMS.REVERSE, name: "反転さとし", icon: "🙃" },
        { id: FORMS.LEGEND, name: "レジェンドYoutuber", icon: "📹" },
        { id: FORMS.IDOL, name: "アイドルさとし", icon: "🎤" },
        { id: FORMS.NORMAL, name: "普通のさとし", icon: "🧑" },
        { id: FORMS.SALARYMAN, name: "サラリーマンさとし", icon: "👔" }
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
