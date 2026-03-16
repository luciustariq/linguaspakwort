// — CONFETTI ENGINE —
const confettiCanvas = document.createElement('canvas');
confettiCanvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
document.body.appendChild(confettiCanvas);
const confettiCtx = confettiCanvas.getContext('2d');
confettiCanvas.width = window.innerWidth;
confettiCanvas.height = window.innerHeight;
window.addEventListener('resize', () => {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
});

let confettiParticles = [];
let confettiFrame = null;
const CONFETTI_PALETTE = ['#00BCD4','#80CBC4','#4ecdc4','#b2ebf2','#ffffff'];

function launchConfetti(intensity = 'streak') {
    const count = intensity === 'session' ? 120 : 60;
    const originX = window.innerWidth / 2;
    const originY = window.innerHeight * 0.45;

    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = intensity === 'session' ? 6 + Math.random() * 8 : 4 + Math.random() * 6;
        confettiParticles.push({
            x: originX + (Math.random() - 0.5) * 20,
            y: originY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 3,
            gravity: 0.15,
            life: 1,
            decay: 0.018 + Math.random() * 0.012,
            color: CONFETTI_PALETTE[Math.floor(Math.random() * CONFETTI_PALETTE.length)],
            size: 4 + Math.random() * 5,
            rotation: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.3,
            type: Math.random() > 0.5 ? 'rect' : 'circle',
        });
    }
    if (!confettiFrame) animateConfetti();
}

function animateConfetti() {
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    confettiParticles = confettiParticles.filter(p => p.life > 0);

    for (const p of confettiParticles) {
        confettiCtx.save();
        confettiCtx.globalAlpha = p.life;
        confettiCtx.fillStyle = p.color;
        confettiCtx.translate(p.x, p.y);
        confettiCtx.rotate(p.rotation);
        if (p.type === 'rect') {
            confettiCtx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
            confettiCtx.beginPath();
            confettiCtx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            confettiCtx.fill();
        }
        confettiCtx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.rotation += p.rotSpeed;
        p.life -= p.decay;
    }

    if (confettiParticles.length > 0) {
        confettiFrame = requestAnimationFrame(animateConfetti);
    } else {
        confettiFrame = null;
        confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
}

// — WORD DATA (loaded from words.js) —


const DEFAULT_WORDS = (typeof WORD_DATA !== 'undefined') ? WORD_DATA : [];
let words = [];

let currentMode = 'mixed';
let currentQuestion = null;
let questionType = null;
let answered = false;
let correct = 0, wrong = 0, streak = 0;
let wordsSeen = new Set();
let sessionQueue = [];
let trekSessionSize = 30;
let trekCorrect = 0;
let trekWrong = 0;
let trekStartTime = null;
let trekTotal = 0;
let advanceTimer = null;   // FBK 4.2 — single timer for auto-advance

// FBK 4.6 — Dynamic feedback phrases
const PHRASES = {
    correct: ['✓ Wunderbar!', '✓ Perfekt!', '✓ Genau!', '✓ Sehr gut!', '✓ Ausgezeichnet!', '✓ Nice one!', '✓ Nailed it!'],
    lenient: ['〜 Close enough!', '〜 Almost perfect!', '〜 Small typo forgiven.', '〜 Nearly there!', '〜 Good enough — watch the spelling!'],
    wrong: ['✗ Not quite!', '✗ So close!', '✗ Keep going!', '✗ Almost!', '✗ Not this time!', '✗ Try again next round!']
};

function randomPhrase(type) {
    const pool = PHRASES[type];
    return pool[Math.floor(Math.random() * pool.length)];
}

const SCORE_KEY = 'wortschatz-score-v1';
const STORAGE_KEY = 'wortschatz-words-v1';
const THEME_KEY = 'wortschatz-theme-v1';

function toggleMnemonicEdit() {
    const area = document.getElementById('mnemonic-edit-area');
    if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
}

function saveDrawerMnemonic() {
    const input = document.getElementById('mnemonic-input');
    if (!input || !currentQuestion) return;
    const text = input.value.trim();
    if (!text) return;

    // persist to words array + localStorage
    saveMnemonic(currentQuestion.german, text);
    currentQuestion.mnemonic = text;

    // update hint button on practice card
    const hintReveal = document.getElementById('hint-reveal');
    const hintRow = document.getElementById('hint-row');
    if (hintReveal) hintReveal.textContent = text;
    if (hintRow) hintRow.style.display = 'flex';

    // rebuild the mnemonic section in the drawer to show saved state
    const section = input.closest('.mnemonic-section');
    if (section) {
        section.innerHTML = `
            <div class="mnemonic-label">Memory tip</div>
            <div class="mnemonic-text" id="drawer-mnemonic-text">${text}</div>
            <button class="mnemonic-edit-btn" onclick="toggleMnemonicEdit()">✎ edit tip</button>
            <div class="mnemonic-edit-area" id="mnemonic-edit-area" style="display:none">
                <textarea class="mnemonic-input" id="mnemonic-input" rows="2">${text}</textarea>
                <button class="mnemonic-save-btn" onclick="saveDrawerMnemonic()">Save</button>
            </div>`;
    }
}


function toggleHintReveal() {
    const reveal = document.getElementById('hint-reveal');
    const label = document.getElementById('hint-btn-label');
    if (!reveal) return;
    const showing = reveal.classList.toggle('show');
    label.textContent = showing ? 'Hide memory tip' : 'Show memory tip';
}


// — SCORE & PERSISTENCE —
function saveScore() {
    try {
        localStorage.setItem(SCORE_KEY, JSON.stringify({
            correct, wrong, streak,
            wordsSeen: [...wordsSeen]
        }));
    } catch(e) {}
}

function loadScore() {
    try {
        const s = JSON.parse(localStorage.getItem(SCORE_KEY));
        if (s) {
            correct = s.correct || 0;
            wrong = s.wrong || 0;
            streak = s.streak || 0;
            wordsSeen = new Set(s.wordsSeen || []);
        }
    } catch(e) {}
}

function resetScore() {
    correct = 0; wrong = 0; streak = 0; wordsSeen = new Set();
    words.forEach(w => { w.strength = 0; w.wrongCount = 0; });
    saveWords();
    saveScore();
    updateStats();
    updateProgress();
    updateHardWordsPill();
    updateTipsPill();
}

// — UTILS —
function normalizeWord(str) {
    return str.trim().toLowerCase();
}

function normalize(str) {
    return str.trim().toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss');
}

function normalizeForCheck(str) {
    return str.trim().toLowerCase()
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .replace(/^to /, '');
}

function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({length: m + 1}, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++)
        for (let j = 1; j <= n; j++)
            dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
                : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    return dp[m][n];
}

function lenientMatch(userRaw, correctRaw) {
    const user = normalizeForCheck(userRaw);
    const correct = normalizeForCheck(correctRaw);
    if (user === correct) return 'exact';
    const threshold = correct.length <= 4 ? 0 : correct.length <= 8 ? 1 : 2;
    if (threshold > 0 && levenshtein(user, correct) <= threshold) return 'lenient';
    return false;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// — QUEUE LOGIC —
function buildQueue() {
    if (currentMode === 'trek') {
        const pool = shuffle([...words]);
        sessionQueue = pool.slice(0, trekSessionSize);
        trekCorrect = 0;
        trekWrong = 0;
        trekStartTime = Date.now();
        trekTotal = sessionQueue.length;
        return;
    }
    if (currentMode === 'hard') {
        const hardWords = words.filter(w => (w.wrongCount || 0) > 0)
            .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0));
        sessionQueue = shuffle([...hardWords]);
        return;
    }
if (currentMode === 'tips') {
        const tipWords = words.filter(w => w.mnemonic && w.mnemonic.trim().length > 0);
        sessionQueue = shuffle([...tipWords]);
        return;
    }
    // Article mode: only nouns with articles
    const pool = currentMode === 'article'
        ? words.filter(w => w.type === 'noun' && w.article)
        : words;
    const weighted = [];
    pool.forEach(w => {
        const baseWeight = Math.max(1, 5 - (w.strength || 0));
        const wc = w.wrongCount || 0;
        const errorBoost = wc >= 3 ? 4 : wc >= 1 ? 2 : 0;
        const weight = baseWeight + errorBoost;
        for (let i = 0; i < weight; i++) weighted.push(w);
    });
    sessionQueue = shuffle(weighted);
}

function updateHardWordsPill() {
    const pill = document.getElementById('hard-words-pill');
    if (!pill) return;
    const count = words.filter(w => (w.wrongCount || 0) > 0).length;
        pill.textContent = count > 0 ? `🔥 My Mistakes (${count})` : '🔥 My Mistakes';
    pill.disabled = count === 0;
    pill.title = count === 0 ? 'No mistakes yet - keep practising!' : `${count} word${count > 1 ? 's' : ''} you have got wrong`;
}

function updateTipsPill() {
    const pill = document.getElementById('tips-pill');
    if (!pill) return;
    const count = words.filter(w => w.mnemonic && w.mnemonic.trim().length > 0).length;
    pill.textContent = count > 0 ? `💡 My Tips (${count})` : '💡 My Tips';
    pill.disabled = count === 0;
    pill.title = count === 0 ? 'No tips yet — add memory tips when you get words wrong' : `${count} word${count > 1 ? 's' : ''} with memory tips`;
}


// — HAPTICS —
function vibratePattern(type) {
    if (!('vibrate' in navigator)) return;
    if (localStorage.getItem('wortschatz-haptics') === 'off') return;
    if (type === 'correct') navigator.vibrate(25);
    if (type === 'wrong')   navigator.vibrate([60, 40, 60]);
    if (type === 'tap')     navigator.vibrate(10);
    if (type === 'next')    navigator.vibrate(8);
    if (type === 'preview') navigator.vibrate([30, 30, 30]);
}

// — SOUND EFFECTS —
let audioCtx = null;

function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playSound(type) {
    if (localStorage.getItem('wortschatz-sound') === 'off') return;
    try {
        const ctx = getAudioCtx();
        if (ctx.state === 'suspended') ctx.resume();

        if (type === 'correct') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine'; osc.frequency.value = 880;
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
            osc.start(); osc.stop(ctx.currentTime + 0.4);
        } else if (type === 'wrong') {
            [0, 0.12].forEach(offset => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sawtooth'; osc.frequency.value = 140;
                gain.gain.setValueAtTime(0.2, ctx.currentTime + offset);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.1);
                osc.start(ctx.currentTime + offset);
                osc.stop(ctx.currentTime + offset + 0.1);
            });
        } else if (type === 'streak') {
            [523, 659, 784, 1047].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain); gain.connect(ctx.destination);
                osc.type = 'sine'; osc.frequency.value = freq;
                const t = ctx.currentTime + i * 0.08;
                gain.gain.setValueAtTime(0.2, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
                osc.start(t); osc.stop(t + 0.15);
            });
        }
    } catch(e) {}
}

function toggleSound() {
    const isOff = localStorage.getItem('wortschatz-sound') === 'off';
    localStorage.setItem('wortschatz-sound', isOff ? 'on' : 'off');
    updateSoundButton();
    if (isOff) playSound('correct');
}

function updateSoundButton() {
    const el = document.getElementById('sound-state');
    if (!el) return;
    const isOff = localStorage.getItem('wortschatz-sound') === 'off';
    el.textContent = isOff ? 'OFF' : 'ON';
    el.style.color = isOff ? 'var(--red)' : 'var(--green)';
}

// — PRACTICE LOGIC —
function updateStrength(word, isCorrect) {
    const idx = words.findIndex(w => w.german === word.german);
    if (idx === -1) return;
    if (isCorrect) {
        words[idx].strength = (words[idx].strength || 0) + 1;
    } else {
        words[idx].strength = 0;
        words[idx].wrongCount = (words[idx].wrongCount || 0) + 1;
    }
    saveWords();
    updateHardWordsPill();
    updateTipsPill();
}

function saveMnemonic(german, text) {
    const idx = words.findIndex(w => w.german === german);
    if (idx === -1) return;
    words[idx].mnemonic = text.trim();
    saveWords();
}

function switchTab(tab) {
    document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', ['practice','words'][i] === tab));
    document.getElementById('tab-practice').classList.toggle('active', tab === 'practice');
    document.getElementById('tab-words').classList.toggle('active', tab === 'words');
    if (tab === 'words') { renderWordList(); }
}

function setMode(mode, el) {
    currentMode = mode;
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    el.classList.add('active');
    buildQueue();
    wordsSeen.clear();
    startNextRound();
}


function updateStrengthBar(word) {
    const s = word.strength || 0;
    const MAX = 5;
    for (let i = 0; i < MAX; i++) {
        const dot = document.getElementById('sd-' + i);
        if (dot) dot.classList.toggle('filled', i < s);
    }
    const labels = ['new', 'learning', 'familiar', 'strong', 'mastered', 'mastered'];
    const lbl = document.getElementById('strength-label');
    if (lbl) lbl.textContent = labels[Math.min(s, labels.length - 1)];
}

function pickQuestionType(word) {
    const hasArticle = word.type === 'noun' && word.article;
    const noArticleTypes = ['verb', 'adjective', 'adverb', 'conjunction', 'preposition', 'phrase', 'pronoun'];
    if (noArticleTypes.includes(word.type) || !hasArticle) {
        if (currentMode === 'de-en') return 'de-en';
        if (currentMode === 'en-de') return 'en-de';
        return Math.random() < 0.5 ? 'de-en' : 'en-de';
    }
    if (currentMode === 'de-en') return 'de-en';
    if (currentMode === 'en-de') return 'en-de';
    if (currentMode === 'article') return 'article';

    const r = Math.random();
    if (r < 0.35) return 'de-en';
    if (r < 0.7) return 'en-de';
    return 'article';
}

function nextQuestion() {
    if (sessionQueue.length === 0) {
        if (currentMode === 'trek') {
            showTrekComplete();
            return;
        }
        if (currentMode === 'hard') {
            const hardCount = words.filter(w => (w.wrongCount || 0) > 0).length;
            if (hardCount === 0) {
                document.getElementById('q-label').textContent = '';
                document.getElementById('q-word').innerHTML = '🎉';
                document.getElementById('mode-label').textContent = '🔥 Hard Words';
                document.getElementById('feedback').className = 'feedback correct show';
                document.getElementById('feedback').textContent = 'No mistakes yet! Keep practising in Mixed mode to build your hard list.';
                document.getElementById('next-btn').className = 'next-btn';
                document.getElementById('answer-row').style.display = 'none';
                document.getElementById('article-choices').style.display = 'none';
                return;
            }
        }

if (currentMode === 'tips') {
            const tipCount = words.filter(w => w.mnemonic && w.mnemonic.trim().length > 0).length;
            if (tipCount === 0) {
                document.getElementById('q-label').textContent = '';
                document.getElementById('q-word').innerHTML = '💡';
                document.getElementById('mode-label').textContent = '💡 Tips';
                document.getElementById('feedback').className = 'feedback correct show';
                document.getElementById('feedback').textContent = 'No memory tips yet! Get a word wrong and add a tip in the drawer.';
                document.getElementById('next-btn').className = 'next-btn';
                document.getElementById('answer-row').style.display = 'none';
                document.getElementById('article-choices').style.display = 'none';
                return;
            }
        }

        wordsSeen.clear();
        buildQueue();
        showRoundComplete();
        return;
    }
    currentQuestion = sessionQueue.pop();
    vibratePattern('next');
    wordsSeen.add(currentQuestion.german);
    questionType = pickQuestionType(currentQuestion);

    answered = false;
    clearTimeout(advanceTimer);
    closeWrongDrawer(true);
    hideAmberPeek();
    document.getElementById('feedback').className = 'feedback';
    document.getElementById('feedback').textContent = '';
    document.getElementById('next-btn').className = 'next-btn';
    document.getElementById('answer-input').value = '';
    document.getElementById('answer-input').className = 'answer-input';
    document.getElementById('answer-input').disabled = false;
    
    const qw = document.getElementById('q-word');
    if (qw) qw.style.color = '';
    document.querySelectorAll('.article-btn').forEach(b => b.className = b.className.replace(/ correct| wrong/g, ''));

    const isArticle = questionType === 'article';
    document.getElementById('article-choices').style.display = isArticle ? 'flex' : 'none';
    document.getElementById('answer-row').style.display = isArticle ? 'none' : 'flex';

      const modeLabels = { 'de-en': '🇩🇪 German → English', 'en-de': '🇬🇧 English → German', 'article': 'Der / Die / Das?', 'hard': '🔥 Mistakes', 'trek': '🚀 Session Mode', 'tips': '💡 Tips — words with memory tips' };

    document.getElementById('mode-label').textContent = currentMode === 'mixed' ? '🎲 Mixed Unlimited - ' + modeLabels[questionType] : (modeLabels[currentMode] || modeLabels[questionType]);

    let qLabel = '', qWord = '';
    if (questionType === 'de-en') {
        qLabel = 'Translate to English:';
        const art = currentQuestion.article ? `<span class="article">${currentQuestion.article}</span> ` : '';
        qWord = art + currentQuestion.german;
    } else if (questionType === 'en-de') {
        qLabel = 'Translate to German (with article if noun):';
        qWord = currentQuestion.english;
    } else {
        qLabel = 'What is the article for:';
        qWord = currentQuestion.german + `<span class="article-meaning">${currentQuestion.english}</span>`;
    }

        document.getElementById('q-label').textContent = qLabel;
    document.getElementById('q-word').innerHTML = qWord;

    const hintRow = document.getElementById('hint-row');
    const hintReveal = document.getElementById('hint-reveal');
    if (hintRow) {
        hintReveal.classList.remove('show');
        hintReveal.textContent = '';
        const m = currentQuestion.mnemonic;
        hintRow.style.display = m ? 'flex' : 'none';
        if (m) hintReveal.textContent = m;
    }


    if (!isArticle) {
        setTimeout(() => document.getElementById('answer-input').focus(), 50);
    }

    updateStats();
    updateProgress();
    updateStrengthBar(currentQuestion);
    autoSpeak();
}

function checkAnswer() {
    if (answered) { nextQuestion(); return; }
    const input = document.getElementById('answer-input');
    const userAnswer = input.value.trim();
    if (!userAnswer) {
        input.classList.remove('shake');
        void input.offsetWidth; 
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
    }

    answered = true;
    let isCorrect = false;
    let wasLenient = false;
    let correctAnswer = '';

    if (questionType === 'de-en') {
        correctAnswer = currentQuestion.english;
        const alsoVariants = currentQuestion.also || [];
        const variants = [correctAnswer, ...alsoVariants].flatMap(v => v.split('/').map(s => s.trim()));
        let bestMatch = false;
        for (const v of variants) {
            const m = lenientMatch(userAnswer, v);
            if (m === 'exact') { bestMatch = 'exact'; break; }
            if (m === 'lenient') bestMatch = 'lenient';
        }
        isCorrect = bestMatch !== false;
        wasLenient = bestMatch === 'lenient';
    } else {
        const german = currentQuestion.german;
        const art = currentQuestion.article;
        const full = art ? `${art} ${german}` : german;
        correctAnswer = full;
        const m1 = lenientMatch(userAnswer, full);
        const m2 = lenientMatch(userAnswer, german);
        const best = m1 === 'exact' || m2 === 'exact' ? 'exact'
            : m1 === 'lenient' || m2 === 'lenient' ? 'lenient' : false;
        isCorrect = best !== false;
        wasLenient = best === 'lenient';
    }

    showResult(isCorrect, correctAnswer, input, wasLenient);
}

function showAnswer() {
    if (answered) return;
    answered = true;

    const fb = document.getElementById('feedback');
    const input = document.getElementById('answer-input');
    const nextBtn = document.getElementById('next-btn');
    let answer = '';

    if (questionType === 'de-en') {
        answer = currentQuestion.english;
    } else if (questionType === 'en-de') {
        const art = currentQuestion.article;
        answer = art ? `${art} ${currentQuestion.german}` : currentQuestion.german;
    } else if (questionType === 'article') {
        answer = currentQuestion.article;
        document.querySelectorAll('.article-btn').forEach(btn => {
            const btnText = btn.textContent.trim().split('\n')[0].trim().toLowerCase();
            if (btnText === answer.toLowerCase()) btn.classList.add('correct');
        });
    }

    fb.textContent = '👁 Answer: ' + answer;
    fb.className = 'feedback lenient show';

    if (input) {
        input.value = answer;
        input.classList.remove('wrong');
        input.disabled = true;
    }

    nextBtn.classList.add('show');
}

function checkArticle(chosen) {
    vibratePattern('tap');
    if (answered) return;
    if (currentQuestion.type !== 'noun' || !currentQuestion.article) return;
    answered = true;
    const correct_art = currentQuestion.article;
    const isCorrect = chosen === correct_art;

    document.querySelectorAll('.article-btn').forEach(btn => {
        const art = btn.textContent.trim().split('\n')[0].trim();
        if (art === correct_art) btn.classList.add('correct');
        else if (art === chosen && !isCorrect) btn.classList.add('wrong');
    });

    showResult(isCorrect, correct_art, null, false);
    document.getElementById('next-btn').className = 'next-btn show';
}

function showResult(isCorrect, correctAnswer, inputEl, wasLenient) {
    clearTimeout(advanceTimer);
    updateStrength(currentQuestion, isCorrect);
    vibratePattern(isCorrect ? 'correct' : 'wrong');
    playSound(isCorrect ? 'correct' : 'wrong');

    if (isCorrect && !wasLenient) {
        correct++;
        if (currentMode === 'trek') trekCorrect++;
        streak++;
                if (streak > 0 && streak % 5 === 0) {
            playSound('streak');
            launchConfetti('streak');
        }

        if (inputEl) {
            inputEl.classList.add('correct');
            const card = document.getElementById('practice-card');
            if (card) {
                card.classList.add('flash-correct');
                setTimeout(() => card.classList.remove('flash-correct'), 800);
            }
        }
        const qWord = document.getElementById('q-word');
        if (qWord) {
            qWord.style.color = 'var(--green)';
            qWord.innerHTML = qWord.innerHTML + ' <span style="font-size:0.7em">✓</span>';
        }
        const fb = document.getElementById('feedback');
        fb.textContent = randomPhrase('correct');
        fb.className = 'feedback correct show';
        advanceTimer = setTimeout(() => nextQuestion(), 1000);

    } else if (isCorrect && wasLenient) {
        correct++;
        if (currentMode === 'trek') trekCorrect++;
        streak++;
        if (inputEl) {
            inputEl.classList.add('lenient');
        }
        const qWord = document.getElementById('q-word');
        const userTyped = inputEl ? inputEl.value.trim() : '';
        if (qWord) {
            qWord.innerHTML = `<span style="font-size:0.45em;color:var(--amber);text-decoration:line-through;opacity:0.7;display:block;margin-bottom:2px">${userTyped}</span><span style="color:var(--amber)">${correctAnswer}</span>`;
        }
        showAmberPeek();
        const fbL = document.getElementById('feedback');
        fbL.textContent = randomPhrase('lenient') + ' Correct: ' + correctAnswer;
        fbL.className = 'feedback lenient show';
        advanceTimer = setTimeout(() => nextQuestion(), 1500);

    } else {
        wrong++;
        if (currentMode === 'trek') trekWrong++;
        streak = 0;
        if (inputEl) {
            inputEl.classList.add('wrong');
            inputEl.classList.add('shake');
            setTimeout(() => inputEl.classList.remove('shake'), 400);
        }
        const qWord = document.getElementById('q-word');
        const userTyped = inputEl ? inputEl.value.trim() : '';
        if (qWord) {
            qWord.innerHTML = `<span style="font-size:0.45em;color:var(--red);text-decoration:line-through;opacity:0.7;display:block;margin-bottom:2px">${userTyped}</span><span style="color:var(--accent)">${correctAnswer}</span>`;
        }
        openWrongDrawer(correctAnswer, userTyped);
    }

    updateStats();
    saveScore();
}

function showAmberPeek() {
    let peek = document.getElementById('amber-peek');
    if (!peek) {
        peek = document.createElement('div');
        peek.id = 'amber-peek';
        peek.className = 'amber-peek';
        peek.innerHTML = '〜 small typo forgiven';
        const card = document.getElementById('practice-card');
        if (card) card.appendChild(peek);
    }
    peek.classList.add('visible');
}

function hideAmberPeek() {
    const peek = document.getElementById('amber-peek');
    if (peek) peek.classList.remove('visible');
}

function openWrongDrawer(correctAnswer, userTyped) {
    const inp = document.getElementById('answer-input');
    if (inp) inp.blur();
    closeWrongDrawer(true);

    const card = document.getElementById('practice-card');
    if (!card) return;

    const backdrop = document.createElement('div');
    backdrop.id = 'drawer-backdrop';
    backdrop.className = 'drawer-backdrop';
    backdrop.onclick = () => peekWrongDrawer();

    const drawer = document.createElement('div');
    drawer.id = 'wrong-drawer';
    drawer.className = 'wrong-drawer';
        const m = currentQuestion.mnemonic || '';
    const mnemonicHTML = m
        ? `<div class="mnemonic-section">
               <div class="mnemonic-label">Memory tip</div>
               <div class="mnemonic-text" id="drawer-mnemonic-text">${m}</div>
               <button class="mnemonic-edit-btn" onclick="toggleMnemonicEdit()">✎ edit tip</button>
               <div class="mnemonic-edit-area" id="mnemonic-edit-area" style="display:none">
                   <textarea class="mnemonic-input" id="mnemonic-input" rows="2">${m}</textarea>
                   <button class="mnemonic-save-btn" onclick="saveDrawerMnemonic()">Save</button>
               </div>
           </div>`
        : `<div class="mnemonic-section">
               <div class="mnemonic-label">Memory tip</div>
               <textarea class="mnemonic-input" id="mnemonic-input" rows="2" placeholder="Add a memory tip to help you remember…"></textarea>
               <button class="mnemonic-save-btn" onclick="saveDrawerMnemonic()">Save tip</button>
           </div>`;

    drawer.innerHTML = `
        <div class="drawer-peek-bar" onclick="toggleWrongDrawer()">
            <span class="drawer-peek-wrong">✗ ${userTyped}</span>
            <span class="drawer-peek-answer">→ ${correctAnswer}</span>
            <span class="drawer-peek-arrow" id="drawer-arrow">↑</span>
        </div>
        <div class="drawer-body">
            <div class="drawer-handle"></div>
            <div class="drawer-icon">😬</div>
            <div class="drawer-title">${randomPhrase('wrong').replace('✗ ', '')}</div>
            <div class="drawer-ans-label">correct answer</div>
            <div class="drawer-ans-word">${correctAnswer}</div>
            ${mnemonicHTML}
            <button class="drawer-next-btn" onclick="closeWrongDrawer(false)">Next Word →</button>
        </div>`;

    card.appendChild(backdrop);
    card.appendChild(drawer);

    requestAnimationFrame(() => {
        backdrop.classList.add('dimmed');
        drawer.classList.add('open');
    });
}

function peekWrongDrawer() {
    const drawer = document.getElementById('wrong-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const arrow = document.getElementById('drawer-arrow');
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.classList.add('peeked');
    if (backdrop) backdrop.classList.remove('dimmed');
    if (arrow) arrow.textContent = '↑';
}

function toggleWrongDrawer() {
    const drawer = document.getElementById('wrong-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const arrow = document.getElementById('drawer-arrow');
    if (!drawer) return;
    if (drawer.classList.contains('peeked')) {
        drawer.classList.remove('peeked');
        drawer.classList.add('open');
        if (backdrop) backdrop.classList.add('dimmed');
        if (arrow) arrow.textContent = '↓';
    } else {
        peekWrongDrawer();
    }
}

function closeWrongDrawer(silent) {
    const drawer = document.getElementById('wrong-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (drawer) drawer.remove();
    if (backdrop) backdrop.remove();
    if (!silent) nextQuestion();
}

function showTrekComplete() {
    launchConfetti('session');
    const elapsed = Math.round((Date.now() - trekStartTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    const accuracy = trekTotal > 0 ? Math.round(trekCorrect / trekTotal * 100) : 0;
    const stars = accuracy >= 90 ? '⭐⭐⭐' : accuracy >= 70 ? '⭐⭐' : '⭐';
    const card = document.getElementById('practice-card');
    card.innerHTML = ` <div style="text-align:center;padding:24px 16px"> <div style="font-family:'Playfair Display',serif;font-size:32px;color:var(--accent);margin-bottom:4px">Session Complete</div> <div style="font-size:28px;margin:12px 0">${stars}</div> <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text-dim);margin-bottom:28px">${trekTotal} words · ${timeStr}</div> <div style="display:flex;justify-content:center;gap:32px;margin-bottom:28px"> <div><div style="font-family:'Playfair Display',serif;font-size:38px;color:var(--green)">${trekCorrect}</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Correct</div></div> <div><div style="font-family:'Playfair Display',serif;font-size:38px;color:var(--red)">${trekWrong}</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Wrong</div></div> <div><div style="font-family:'Playfair Display',serif;font-size:38px;color:var(--accent2)">${accuracy}%</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px">Accuracy</div></div> </div> <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap"> <button onclick="restartTrek()" style="padding:12px 28px;background:var(--accent);color:#0f0e0c;border:none;border-radius:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:13px;font-weight:500">New Session 🚀</button> <button onclick="switchToMixed()" style="padding:12px 28px;background:var(--surface2);color:var(--text);border:none;border-radius:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:13px">Mixed Unlimited</button> </div> </div>`;
}

function restartTrek() {
    currentMode = 'trek';
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    
const trekPill = document.querySelector('.pill-trek');

    if (trekPill) trekPill.classList.add('active');
    buildQueue();
    startNextRound();
    nextQuestion();
}

function showRoundComplete() {
    const card = document.getElementById('practice-card');
    card.innerHTML = ` <div style="text-align:center;padding:20px 0">  <div style="font-family:'Playfair Display',serif;font-size:36px;color:var(--accent);margin-bottom:12px">Round Complete</div>  <div style="font-family:'DM Mono',monospace;font-size:13px;color:var(--text-muted);margin-bottom:32px">You've gone through all ${words.length} words. Starting a new round…</div>  <div style="display:flex;justify-content:center;gap:40px;margin-bottom:32px">  <div><div style="font-family:'Playfair Display',serif;font-size:40px;color:var(--green)">${correct}</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Correct</div></div>  <div><div style="font-family:'Playfair Display',serif;font-size:40px;color:var(--red)">${wrong}</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Wrong</div></div>  <div><div style="font-family:'Playfair Display',serif;font-size:40px;color:var(--accent2)">${correct + wrong > 0 ? Math.round(correct/(correct+wrong)*100) : 0}%</div><div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1px;text-transform:uppercase">Accuracy</div></div>  </div>  <button onclick="startNextRound()" style="padding:14px 40px;background:var(--accent);color:#0f0e0c;border:none;border-radius:10px;cursor:pointer;font-family:'DM Mono',monospace;font-size:13px;font-weight:500;letter-spacing:0.5px">Start Next Round →</button>  </div>`;
}

function switchToMixed() {
    currentMode = 'mixed';
    document.querySelectorAll('.mode-pill').forEach(p => p.classList.remove('active'));
    const mixedPill = document.querySelector('.pill-mixed');
    if (mixedPill) mixedPill.classList.add('active');
    buildQueue();
    startNextRound();
    nextQuestion();
}

function startNextRound() {
    correct = 0; wrong = 0; streak = 0;
    saveScore();
    updateStats();
    document.getElementById('practice-card').innerHTML = ` <div class="mode-badge" id="mode-label">Mixed Unlimited</div>  <div class="strength-bar" id="strength-bar">  <div class="strength-dot" id="sd-0"></div>  <div class="strength-dot" id="sd-1"></div>  <div class="strength-dot" id="sd-2"></div>  <div class="strength-dot" id="sd-3"></div>  <div class="strength-dot" id="sd-4"></div>  <span class="strength-label" id="strength-label">new</span>  </div>  <div class="question-area">  <div class="question-label" id="q-label">Translate to English:</div>  <div class="question-word" id="q-word">Loading...</div>  </div>  <div class="article-choices" id="article-choices" style="display:none">  <button class="article-btn der-btn" onclick="checkArticle('der')">der<span class="article-label">masculine</span></button>  <button class="article-btn die-btn" onclick="checkArticle('die')">die<span class="article-label">feminine</span></button>  <button class="article-btn das-btn" onclick="checkArticle('das')">das<span class="article-label">neuter</span></button>  </div>    <div class="hint-row" id="hint-row" style="display:none"><button class="hint-btn" onclick="toggleHintReveal()">💡 <span id="hint-btn-label">Show memory tip</span></button></div>  <div class="hint-reveal" id="hint-reveal"></div>  <div class="voice-row">  <button class="voice-btn" id="voice-btn" onclick="speakQuestion()"><span class="voice-icon">🔊</span> Pronounce</button>  <label class="auto-speak-toggle"><input type="checkbox" id="auto-speak"> auto-play</label>  </div>
  <div class="answer-row" id="answer-row">  <input type="text" class="answer-input" id="answer-input" placeholder="Type your answer..." onkeydown="handleKey(event)" inputmode="latin" autocorrect="off" autocapitalize="off" autocomplete="off" spellcheck="false">  <div class="button-group">  <button class="submit-btn" onclick="checkAnswer()">Check</button>  <button class="show-answer-btn" onclick="showAnswer()">Show</button>  </div>  </div>  <div class="feedback" id="feedback"></div>  <button class="next-btn" id="next-btn" onclick="nextQuestion()">Next Word →</button>  <div class="progress-section">  <div class="progress-text"><strong id="words-done">0</strong> / <strong id="words-total">0</strong> <span id="progress-label">words seen</span></div>  <div class="progress-text" style="color:var(--text-dim);font-size:11px;">Press Enter to check or continue</div>  </div>`;
    nextQuestion();
}

// — SETTINGS —
function toggleSettings() {
    const panel = document.getElementById('settings-panel');
    const btn   = document.getElementById('settings-gear-btn');
    const isOpen = panel.classList.toggle('open');
    btn.classList.toggle('open', isOpen);
    if (isOpen) {
        const rect = btn.getBoundingClientRect();
        panel.style.top  = (rect.bottom + 6) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
        updateThemeButtons();
            updateHapticsButton();
    updateSoundButton();

      setTimeout(() => document.addEventListener('click', closeOnOutside), 0);
    } else {
        document.getElementById('theme-submenu').classList.remove('open');
    }
}

function closeSettings() {
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('theme-submenu').classList.remove('open');
    document.getElementById('settings-gear-btn').classList.remove('open');
}

function closeOnOutside(e) {
    const wrap = document.querySelector('.settings-wrap');
    if (wrap && !wrap.contains(e.target)) {
        closeSettings();
        document.removeEventListener('click', closeOnOutside);
    }
}

function toggleHaptics() {
    const isOff = localStorage.getItem('wortschatz-haptics') === 'off';
    localStorage.setItem('wortschatz-haptics', isOff ? 'on' : 'off');
    updateHapticsButton();
    if (isOff) vibratePattern('preview');
}

function updateHapticsButton() {
    const el = document.getElementById('haptics-state');
    if (!el) return;
    const isOff = localStorage.getItem('wortschatz-haptics') === 'off';
    el.textContent = isOff ? 'OFF' : 'ON';
    el.style.color = isOff ? 'var(--red)' : 'var(--green)';
}

function toggleThemeSubmenu() {
    document.getElementById('theme-submenu').classList.toggle('open');
}

function openAbout() {
    closeSettings();
    document.getElementById('about-modal').classList.add('open');
}

function closeAbout() {
    document.getElementById('about-modal').classList.remove('open');
}

function closeAboutOnOverlay(e) {
    if (e.target === document.getElementById('about-modal')) closeAbout();
}


function setTheme(theme) {
    if (theme === 'system') {
        document.documentElement.removeAttribute('data-theme');
        localStorage.removeItem(THEME_KEY);
    } else {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(THEME_KEY, theme);
    }
    updateThemeButtons();
}

function updateThemeButtons() {
    const current = document.documentElement.getAttribute('data-theme') || 'system';
    ['system', 'light', 'dark', 'pastel'].forEach(t => {
        const btn = document.getElementById('theme-btn-' + t);
        if (btn) btn.classList.toggle('active', current === t);
    });
}

function loadTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute('data-theme', saved);
}

// — VOICE —
const synth = window.speechSynthesis;
let voices = [];

function loadVoices() {
    voices = synth.getVoices();
    if (voices.length === 0) {
        synth.onvoiceschanged = () => { voices = synth.getVoices(); };
    }
}

function getBestVoice(lang) {
    const exact = voices.find(v => v.lang === lang);
    const partial = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    return exact || partial || null;
}

function speakText(text, lang) {
    if (!synth) return;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.rate = 0.9;
    const voice = getBestVoice(lang);
    if (voice) utter.voice = voice;

    const btn = document.getElementById('voice-btn');
    if (btn) {
        btn.classList.add('speaking');
        utter.onend = () => btn.classList.remove('speaking');
        utter.onerror = () => btn.classList.remove('speaking');
    }
    synth.speak(utter);
}

function speakQuestion() {
    if (!currentQuestion) return;
    if (!synth) {
        document.getElementById('voice-btn')?.classList.add('unsupported');
        return;
    }
    if (questionType === 'de-en' || questionType === 'article') {
        speakText(currentQuestion.german, 'de-DE');
    } else {
        speakText(currentQuestion.english.replace(/^to /, ''), 'en-US');
    }
}

function autoSpeak() {
    const auto = document.getElementById('auto-speak');
    if (auto && auto.checked) speakQuestion();
}

// — UI & STATS —
function handleKey(e) {
    if (e.key === 'Enter') {
        if (document.getElementById('wrong-drawer')) return;
        if (!answered) {
            checkAnswer();
        } else {
            clearTimeout(advanceTimer);
            nextQuestion();
        }
    }
}

function updateStats() {
    document.getElementById('score-correct').textContent = correct;
    document.getElementById('score-wrong').textContent = wrong;
    document.getElementById('score-streak').textContent = streak;
}

function updateProgress() {
    const fill = document.getElementById('progress-fill');
    const doneEl = document.getElementById('words-done');
    const totalEl = document.getElementById('words-total');
    const labelEl = document.getElementById('progress-label');
    if (currentMode === 'trek') {
        const done = trekTotal - sessionQueue.length;
        const pct = trekTotal > 0 ? (done / trekTotal * 100) : 0;
        if (fill) fill.style.width = pct + '%';
        if (doneEl) doneEl.textContent = done;
        if (totalEl) totalEl.textContent = trekTotal;
        if (labelEl) labelEl.textContent = 'words in this session';
    } else {
        const pct = words.length > 0 ? (wordsSeen.size / words.length * 100) : 0;
        if (fill) fill.style.width = pct + '%';
        if (doneEl) doneEl.textContent = wordsSeen.size;
        if (totalEl) totalEl.textContent = words.length;
        if (labelEl) labelEl.textContent = 'words seen';
    }
}

// — WORD LIST & MANAGEMENT —
const ROW_HEIGHT = 44;
const BUFFER = 4;

function renderWordList() {
    const scroll = document.getElementById('word-list-scroll');
    const spacer = document.getElementById('word-list-spacer');
    const body = document.getElementById('word-list-body');
    if (!scroll || !spacer || !body) return;

    if (words.length === 0) {
        spacer.style.height = '60px';
        body.innerHTML = '<div class="empty-state" style="position:absolute;top:0;left:0;right:0">No words yet. Add some above!</div>';
        scroll.onscroll = null;
        return;
    }

    const totalHeight = words.length * ROW_HEIGHT;
    spacer.style.height = totalHeight + 'px';

    function renderVisible() {
        const scrollTop = scroll.scrollTop;
        const viewHeight = scroll.clientHeight || 420;
        const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
        const end = Math.min(words.length, Math.ceil((scrollTop + viewHeight) / ROW_HEIGHT) + BUFFER);

        body.innerHTML = words.slice(start, end).map((w, rel) => {
            const i = start + rel;
            let artTag;
            if (w.type === 'noun') {
                artTag = `<span class="article-tag tag-${w.article}">${w.article}</span>`;
            } else if (w.type === 'adjective') {
                artTag = `<span class="article-tag tag-adj">adj</span>`;
            } else if (w.type === 'adverb') {
                artTag = `<span class="article-tag tag-adv">adv</span>`;
            } else if (w.type === 'conjunction') {
                artTag = `<span class="article-tag tag-conj">conj</span>`;
            } else if (w.type === 'preposition') {
                artTag = `<span class="article-tag tag-prep">prep</span>`;
            } else if (w.type === 'phrase') {
                artTag = `<span class="article-tag tag-phrase">phrase</span>`;
            } else if (w.type === 'pronoun') {
                artTag = `<span class="article-tag tag-pronoun">pron</span>`;
            } else {
                artTag = `<span class="article-tag tag-verb">verb</span>`;
            }
            const display = w.type === 'noun' ? `${w.article} ${w.german}` : w.german;
            const wc = w.wrongCount || 0;
                        const errorBadge = wc > 0
            ? `<span class="error-badge">${wc}</span>`
            : `<span style="color:var(--text-dim);font-family:'DM Mono',monospace;font-size:11px">-</span>`;
            const tipBadge = w.mnemonic
            ? `<span title="${w.mnemonic}" style="cursor:help;font-size:13px">💡</span>`
            : `<span style="color:var(--text-dim);font-family:'DM Mono',monospace;font-size:11px">-</span>`;
            return `
            <div class="word-row" style="top:${i * ROW_HEIGHT}px">
            <span style="color:var(--text-dim);font-family:'DM Mono',monospace;font-size:12px">${i+1}</span>
            <span class="german">${display}</span>
            <span class="english">${w.english}</span>
            <span>${artTag}</span>
            <span>${errorBadge}</span>
            <span>${tipBadge}</span>
            <span><button class="delete-btn" onclick="deleteWord(${i})">×</button></span>
            </div>`;
        }).join('');
    }

    scroll.onscroll = renderVisible;
    renderVisible();
}

function toggleArticleField() {
    const type = document.getElementById('word-type').value;
    document.getElementById('article-field').style.display = type === 'noun' ? 'flex' : 'none';
}

function deleteWord(index) {
    words.splice(index, 1);
    saveWords();
    renderWordList();
    buildQueue();
    updateProgress();
}

function addWord() {
    const type = document.getElementById('word-type').value;
    const article = type === 'noun' ? document.getElementById('word-article').value : null;
    const german = document.getElementById('word-german').value.trim();
    const english = document.getElementById('word-english').value.trim();
    if (!german || !english) {
        document.getElementById('word-german').style.borderColor = german ? '' : 'var(--red)';
        document.getElementById('word-english').style.borderColor = english ? '' : 'var(--red)';
        return;
    }
    const germanFinal = type === 'noun' ? german.charAt(0).toUpperCase() + german.slice(1) : german.toLowerCase();
    const dup = words.some(w => normalizeWord(w.german) === normalizeWord(germanFinal));
    if (dup) {
        document.getElementById('word-german').style.borderColor = 'var(--red)';
        return;
    }
    words.push({ type, article, german: germanFinal, english, also: [], strength: 0, wrongCount: 0 });
    document.getElementById('word-german').value = '';
    document.getElementById('word-english').value = '';
    document.getElementById('word-german').style.borderColor = '';
    document.getElementById('word-english').style.borderColor = '';
    saveWords();
    renderWordList();
    buildQueue();
    updateProgress();
}

// — IMPORT —
function toggleImport() {
    const body = document.getElementById('import-body');
    const arrow = document.getElementById('import-arrow');
    const open = body.classList.toggle('open');
    arrow.textContent = open ? '▼' : '▶';
}

function showImportFb(msg, type) {
    const fb = document.getElementById('import-feedback');
    fb.textContent = msg;
    fb.className = 'import-feedback ' + type;
    setTimeout(() => { fb.className = 'import-feedback'; }, 4000);
}

function importWords() {
    const raw = document.getElementById('import-textarea').value.trim();
    if (!raw) { showImportFb('Nothing to import', 'err'); return; }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    const articleRegex = /^(der|die|das)\s+/i;
    let added = 0, skipped = 0;

    for (const line of lines) {
        const delimMatch = line.match(/^(.+?)\s*[-=|,]\s*(.+)$/);
        if (!delimMatch) { skipped++; continue; }

        let left = delimMatch[1].trim();
        let right = delimMatch[2].trim();
        let type, article = null, german, english;

        const artMatch = left.match(articleRegex);
        if (artMatch) {
            article = artMatch[1].toLowerCase();
            german = left.slice(artMatch[0].length).trim();
            english = right;
            type = 'noun';
        } else {
            const rightParts = right.split(/\s*,\s*/);
            if (rightParts.length >= 2 && ['der','die','das'].includes(rightParts[0].toLowerCase())) {
                german = left;
                article = rightParts[0].toLowerCase();
                english = rightParts.slice(1).join(', ');
                type = 'noun';
            } else if (/^adj(ective)?$/i.test(right.trim())) {
                german = left;
                english = right;
                type = 'adjective';
                article = null;
            } else if (/^adv(erb)?$/i.test(right.trim())) {
                german = left;
                english = right;
                type = 'adverb';
                article = null;
            } else {
                german = left;
                english = right;
                type = 'verb';
                article = null;
            }
        }

        if (type === 'noun') german = german.charAt(0).toUpperCase() + german.slice(1);
        else german = german.toLowerCase();

        const dup = words.some(w => normalizeWord(w.german) === normalizeWord(german));
        if (!dup && german && english) {
            words.push({ type, article, german, english, also: [], strength: 0, wrongCount: 0 });
            added++;
        } else {
            skipped++;
        }
    }

    if (added > 0) {
        saveWords();
        renderWordList();
        buildQueue();
        updateProgress();
        showImportFb(`✓ ${added} word${added > 1 ? 's' : ''} imported${skipped ? ' (' + skipped + ' skipped)' : ''}`, 'ok');
        document.getElementById('import-textarea').value = '';
    } else {
        showImportFb('Could not parse any lines. Check format.', 'err');
    }
}

// — PERSISTENCE —
function wordKey(w) { return (w.german || '').toLowerCase().trim(); }

function saveWords() {
    try {
        const defaultKeys = new Set(DEFAULT_WORDS.map(wordKey));
        const currentKeys = new Set(words.map(wordKey));
        const deletedKeys = DEFAULT_WORDS.map(wordKey).filter(k => !currentKeys.has(k));
        const userAdded = words.filter(w => !defaultKeys.has(wordKey(w)));

        const strengthMap = {};
        words.forEach(w => {
            if (w.strength > 0 || w.wrongCount > 0 || w.mnemonic)
                strengthMap[wordKey(w)] = { s: w.strength, w: w.wrongCount, m: w.mnemonic || '' };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, deletedKeys, userAdded, strengthMap }));
        showSaveIndicator();
    } catch(e) {
        alert('Storage limit reached. Please remove some words.');
    }
}

function loadWords() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (saved && saved.version === 2) {
            const deletedKeys = new Set(saved.deletedKeys || []);
            const strengthMap = saved.strengthMap || {};
            const userAdded = (saved.userAdded || []).map(w => ({ strength: 0, wrongCount: 0, ...w }));
            const base = DEFAULT_WORDS
                .filter(w => !deletedKeys.has(wordKey(w)))
                .map(w => {
                    const sm = strengthMap[wordKey(w)];
                                        return sm ? { ...w, strength: sm.s || 0, wrongCount: sm.w || 0, mnemonic: sm.m || w.mnemonic || '' } : { ...w };

                });
            const baseKeys = new Set(base.map(wordKey));
            const extras = userAdded.filter(w => !baseKeys.has(wordKey(w)));
            words = [...base, ...extras];
            return true;
        } else if (Array.isArray(saved) && saved.length > 0) {
            words = saved.map(w => ({ strength: 0, wrongCount: 0, ...w }));
            return true;
        }
    } catch(e) {}
    words = DEFAULT_WORDS.map(w => ({ ...w }));
    return false;
}

function showSaveIndicator() {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    el.style.opacity = '1';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.opacity = '0'; }, 1800);
}

// — INIT —
function init() {
    loadTheme();
    loadWords();
    loadScore();
    loadVoices();
    buildQueue();
    nextQuestion();
    updateHardWordsPill();
    updateTipsPill();
    updateHapticsButton();
    updateSoundButton();

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isInstalled = window.navigator.standalone === true;
    if (isIOS && !isInstalled) {
        document.getElementById('installBanner').style.display = 'block';
    }

    const segBar = document.querySelector('.seg-bar');
    const dots = document.querySelectorAll('#seg-dots .scroll-dot');
    if (segBar && dots.length) {
        segBar.addEventListener('scroll', () => {
            const maxScroll = segBar.scrollWidth - segBar.clientWidth;
            if (maxScroll <= 0) return;
            const pct = segBar.scrollLeft / maxScroll;
            const idx = pct < 0.4 ? 0 : pct < 0.75 ? 1 : 2;
            dots.forEach((d, i) => d.classList.toggle('active', i === idx));
        });
    }

    const header = document.querySelector('header');
    if (header) {
        const ind = document.createElement('span');
        ind.id = 'save-indicator';
        ind.style.cssText = 'font-family:"DM Mono",monospace;font-size:10px;color:var(--green);opacity:0;transition:opacity 0.5s;letter-spacing:1px;margin-left:8px;';
        ind.textContent = '✓ saved';
        header.appendChild(ind);
    }
}

function toggleInstallBanner() {
    const expanded = document.getElementById('bannerExpanded');
    const chevron = document.getElementById('pillChevron');
    const isOpen = expanded.classList.toggle('open');
    chevron.classList.toggle('open', isOpen);
}

function dismissInstallBanner(e) {
    e.stopPropagation();
    const banner = document.getElementById('installBanner');
    banner.style.opacity = '0';
    banner.style.transform = 'translateY(20px)';
    setTimeout(() => banner.style.display = 'none', 300);
}


init();
