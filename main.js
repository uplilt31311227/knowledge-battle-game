/**
 * 知識大亂鬥 - 貓狗大戰
 * 回合制 Q&A 物理拋物線遊戲
 * 專為大型觸控螢幕設計
 */

// ==================== 音效系統 ====================
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.bgmGain = null;
        this.sfxGain = null;
        this.masterGain = null;
        this.bgmPlaying = false;
        this.enabled = true;  // 音效開關
        this.bgmEnabled = true;  // 背景音樂開關
        this.sfxEnabled = true;  // 音效開關

        // 動態 BGM 狀態
        this.bgmMode = 'normal';  // normal, tense, victory, danger
        this.bgmTempo = 1;
        this.loopTimeouts = [];
    }

    init() {
        if (this.audioContext) return;
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

        // 主音量控制
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 1;
        this.masterGain.connect(this.audioContext.destination);

        this.bgmGain = this.audioContext.createGain();
        this.bgmGain.gain.value = 0.25;
        this.bgmGain.connect(this.masterGain);

        this.sfxGain = this.audioContext.createGain();
        this.sfxGain.gain.value = 0.5;
        this.sfxGain.connect(this.masterGain);
    }

    // 音效總開關
    toggleSound(enabled) {
        this.enabled = enabled;
        if (this.masterGain) {
            this.masterGain.gain.value = enabled ? 1 : 0;
        }
        if (!enabled) {
            this.stopBGM();
        }
    }

    toggleBGM(enabled) {
        this.bgmEnabled = enabled;
        if (this.bgmGain) {
            this.bgmGain.gain.value = enabled ? 0.25 : 0;
        }
    }

    toggleSFX(enabled) {
        this.sfxEnabled = enabled;
        if (this.sfxGain) {
            this.sfxGain.gain.value = enabled ? 0.5 : 0;
        }
    }

    // 切換背景音樂模式
    setBGMMode(mode) {
        if (this.bgmMode === mode) return;
        this.bgmMode = mode;

        switch (mode) {
            case 'tense':  // 答題緊張
                this.bgmTempo = 1.3;
                if (this.bgmGain) this.bgmGain.gain.value = this.bgmEnabled ? 0.3 : 0;
                break;
            case 'attack':  // 攻擊階段
                this.bgmTempo = 1.5;
                if (this.bgmGain) this.bgmGain.gain.value = this.bgmEnabled ? 0.35 : 0;
                break;
            case 'danger':  // 低血量危險
                this.bgmTempo = 1.6;
                if (this.bgmGain) this.bgmGain.gain.value = this.bgmEnabled ? 0.4 : 0;
                break;
            case 'victory':  // 勝利
                this.bgmTempo = 0.8;
                if (this.bgmGain) this.bgmGain.gain.value = this.bgmEnabled ? 0.3 : 0;
                break;
            default:  // normal
                this.bgmTempo = 1;
                if (this.bgmGain) this.bgmGain.gain.value = this.bgmEnabled ? 0.25 : 0;
        }
    }

    // 動態戰鬥配樂
    playBattleBGM() {
        if (this.bgmPlaying || !this.enabled) return;
        this.init();
        this.bgmPlaying = true;

        const ctx = this.audioContext;

        // 清除舊的循環
        this.loopTimeouts.forEach(t => clearTimeout(t));
        this.loopTimeouts = [];

        // 鼓點循環
        const playDrumLoop = () => {
            if (!this.bgmPlaying) return;

            const baseDuration = 2 / this.bgmTempo;
            const startTime = ctx.currentTime;
            const beatInterval = 0.25 / this.bgmTempo;

            // 根據模式調整鼓點
            const beats = this.bgmMode === 'danger' ? 16 : 8;
            for (let i = 0; i < beats; i++) {
                const kickTime = startTime + (i * beatInterval);
                const volume = (i % 4 === 0) ? 1.5 : 1;
                this.playKick(kickTime, volume);
            }

            // Hi-hat 密度根據模式變化
            const hihatCount = this.bgmMode === 'attack' ? 24 : 16;
            for (let i = 0; i < hihatCount; i++) {
                this.playHiHat(startTime + (i * baseDuration / hihatCount), 0.25);
            }

            // 緊張模式增加軍鼓
            if (this.bgmMode === 'tense' || this.bgmMode === 'danger') {
                this.playSnare(startTime + beatInterval * 2);
                this.playSnare(startTime + beatInterval * 6);
            }

            // 低頻脈衝
            this.playTensionBass(startTime, baseDuration);

            const timeout = setTimeout(() => playDrumLoop(), baseDuration * 1000);
            this.loopTimeouts.push(timeout);
        };

        // 旋律循環
        const playMelodyLoop = () => {
            if (!this.bgmPlaying) return;

            const baseDuration = 4 / this.bgmTempo;
            const startTime = ctx.currentTime;

            // 根據模式選擇不同旋律
            let notes;
            switch (this.bgmMode) {
                case 'danger':
                    notes = [220, 233.08, 220, 196, 220, 233.08, 261.63, 220]; // 緊張半音
                    break;
                case 'attack':
                    notes = [293.66, 329.63, 349.23, 392, 349.23, 329.63, 293.66, 261.63]; // 上升激昂
                    break;
                case 'victory':
                    notes = [523.25, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25, 523.25]; // 歡快大調
                    break;
                default:
                    notes = [220, 207.65, 185, 196, 220, 246.94, 220, 185]; // 標準小調
            }

            notes.forEach((freq, i) => {
                this.playMelodyNote(freq, startTime + (i * baseDuration / 8), baseDuration / 10);
            });

            const timeout = setTimeout(() => playMelodyLoop(), baseDuration * 1000);
            this.loopTimeouts.push(timeout);
        };

        // 和弦鋪底
        const playChordLoop = () => {
            if (!this.bgmPlaying) return;

            const baseDuration = 8 / this.bgmTempo;
            const startTime = ctx.currentTime;

            // 根據模式選擇和弦
            let chords;
            switch (this.bgmMode) {
                case 'danger':
                    chords = [[220, 261.63, 329.63], [196, 246.94, 293.66]]; // Am, G
                    break;
                case 'victory':
                    chords = [[261.63, 329.63, 392], [293.66, 369.99, 440]]; // C, D
                    break;
                default:
                    chords = [[220, 261.63, 329.63], [185, 220, 277.18]]; // Am, Fm
            }

            chords.forEach((chord, i) => {
                this.playChord(chord, startTime + i * baseDuration / 2, baseDuration / 2.5);
            });

            const timeout = setTimeout(() => playChordLoop(), baseDuration * 1000);
            this.loopTimeouts.push(timeout);
        };

        playDrumLoop();
        setTimeout(() => playMelodyLoop(), 300);
        setTimeout(() => playChordLoop(), 600);
    }

    playKick(time, volume = 1) {
        if (!this.bgmEnabled) return;
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(40, time + 0.1);

        gain.gain.setValueAtTime(0.5 * volume, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.12);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.12);
    }

    playSnare(time) {
        if (!this.bgmEnabled) return;
        const ctx = this.audioContext;

        // 噪音部分
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 2000;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        source.start(time);
    }

    playHiHat(time, volume = 0.25) {
        if (!this.bgmEnabled) return;
        const ctx = this.audioContext;
        const bufferSize = ctx.sampleRate * 0.04;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 4);
        }

        const source = ctx.createBufferSource();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        filter.type = 'highpass';
        filter.frequency.value = 8000;
        source.buffer = buffer;
        gain.gain.value = volume;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        source.start(time);
    }

    playTensionBass(time, duration) {
        if (!this.bgmEnabled) return;
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        const baseFreq = this.bgmMode === 'danger' ? 50 : 55;
        osc.frequency.setValueAtTime(baseFreq, time);
        osc.frequency.linearRampToValueAtTime(baseFreq + 10, time + duration / 2);
        osc.frequency.linearRampToValueAtTime(baseFreq, time + duration);

        gain.gain.setValueAtTime(0.12, time);
        gain.gain.linearRampToValueAtTime(0.15, time + duration / 2);
        gain.gain.linearRampToValueAtTime(0.01, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    playMelodyNote(freq, time, duration) {
        if (!this.bgmEnabled) return;
        const ctx = this.audioContext;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = this.bgmMode === 'victory' ? 'sine' : 'square';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.03);
        gain.gain.linearRampToValueAtTime(0.06, time + duration * 0.7);
        gain.gain.linearRampToValueAtTime(0, time + duration);

        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + duration);
    }

    playChord(frequencies, time, duration) {
        if (!this.bgmEnabled) return;
        frequencies.forEach(freq => {
            const ctx = this.audioContext;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            gain.gain.setValueAtTime(0, time);
            gain.gain.linearRampToValueAtTime(0.04, time + 0.1);
            gain.gain.linearRampToValueAtTime(0.03, time + duration * 0.8);
            gain.gain.linearRampToValueAtTime(0, time + duration);

            osc.connect(gain);
            gain.connect(this.bgmGain);
            osc.start(time);
            osc.stop(time + duration);
        });
    }

    stopBGM() {
        this.bgmPlaying = false;
        this.loopTimeouts.forEach(t => clearTimeout(t));
        this.loopTimeouts = [];
    }

    // ========== 答題音效 ==========

    // 答對音效 - 歡快上揚
    playCorrectSound() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 上揚琶音
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const noteTime = time + i * 0.08;
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.25, noteTime + 0.02);
            gain.gain.linearRampToValueAtTime(0, noteTime + 0.25);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(noteTime);
            osc.stop(noteTime + 0.25);
        });

        // 閃亮音效
        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(2000, time + 0.3);
        shimmer.frequency.exponentialRampToValueAtTime(3000, time + 0.5);
        shimmerGain.gain.setValueAtTime(0.1, time + 0.3);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(time + 0.3);
        shimmer.stop(time + 0.5);
    }

    // 答錯音效 - 低沉失敗
    playWrongSound() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 下降音
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(400, time);
        osc1.frequency.exponentialRampToValueAtTime(100, time + 0.4);
        gain1.gain.setValueAtTime(0.2, time);
        gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(time);
        osc1.stop(time + 0.5);

        // 低音嗡鳴
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 80;
        gain2.gain.setValueAtTime(0.15, time + 0.1);
        gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.6);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(time + 0.1);
        osc2.stop(time + 0.6);

        // 不和諧音
        const osc3 = ctx.createOscillator();
        const gain3 = ctx.createGain();
        osc3.type = 'square';
        osc3.frequency.value = 185; // 不和諧的音程
        gain3.gain.setValueAtTime(0.1, time);
        gain3.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc3.connect(gain3);
        gain3.connect(this.sfxGain);
        osc3.start(time);
        osc3.stop(time + 0.3);
    }

    // ========== 嘲諷音效 ==========

    // 未擊中嘲諷音效
    playTauntSound() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 嘲笑般的旋律 (類似 "哈哈哈")
        const laughNotes = [
            { freq: 600, time: 0, dur: 0.12 },
            { freq: 500, time: 0.15, dur: 0.12 },
            { freq: 600, time: 0.3, dur: 0.12 },
            { freq: 500, time: 0.45, dur: 0.12 },
            { freq: 400, time: 0.6, dur: 0.2 }
        ];

        laughNotes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.value = note.freq;

            const noteTime = time + note.time;
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.2, noteTime + 0.02);
            gain.gain.setValueAtTime(0.2, noteTime + note.dur - 0.02);
            gain.gain.linearRampToValueAtTime(0, noteTime + note.dur);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(noteTime);
            osc.stop(noteTime + note.dur);
        });

        // 彈簧聲效果
        const spring = ctx.createOscillator();
        const springGain = ctx.createGain();
        spring.type = 'sine';
        spring.frequency.setValueAtTime(800, time + 0.7);
        spring.frequency.exponentialRampToValueAtTime(200, time + 1);
        springGain.gain.setValueAtTime(0.15, time + 0.7);
        springGain.gain.exponentialRampToValueAtTime(0.01, time + 1);
        spring.connect(springGain);
        springGain.connect(this.sfxGain);
        spring.start(time + 0.7);
        spring.stop(time + 1);
    }

    // ========== 技能音效 ==========

    playSkillSound(skillType) {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        switch (skillType) {
            case 'double':
                this.playPowerUpSound(now);
                break;
            case 'heal':
                this.playHealSound(now);
                break;
            case 'shield':
                this.playShieldSound(now);
                break;
            case 'bigWeapon':
                this.playBigWeaponSound(now);
                break;
        }
    }

    playPowerUpSound(time) {
        const ctx = this.audioContext;

        for (let i = 0; i < 5; i++) {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(200 + i * 100, time + i * 0.05);
            osc.frequency.exponentialRampToValueAtTime(800 + i * 100, time + i * 0.05 + 0.1);

            gain.gain.setValueAtTime(0.2, time + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.01, time + i * 0.05 + 0.15);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(time + i * 0.05);
            osc.stop(time + i * 0.05 + 0.15);
        }

        const impactOsc = ctx.createOscillator();
        const impactGain = ctx.createGain();
        impactOsc.type = 'square';
        impactOsc.frequency.setValueAtTime(150, time + 0.25);
        impactGain.gain.setValueAtTime(0.3, time + 0.25);
        impactGain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        impactOsc.connect(impactGain);
        impactGain.connect(this.sfxGain);
        impactOsc.start(time + 0.25);
        impactOsc.stop(time + 0.5);
    }

    playHealSound(time) {
        const ctx = this.audioContext;
        const notes = [523.25, 659.25, 783.99, 1046.5];

        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = freq;

            const noteTime = time + i * 0.1;
            gain.gain.setValueAtTime(0, noteTime);
            gain.gain.linearRampToValueAtTime(0.15, noteTime + 0.1);
            gain.gain.linearRampToValueAtTime(0, noteTime + 0.5);

            osc.connect(gain);
            gain.connect(this.sfxGain);
            osc.start(noteTime);
            osc.stop(noteTime + 0.5);
        });

        const shimmer = ctx.createOscillator();
        const shimmerGain = ctx.createGain();
        shimmer.type = 'sine';
        shimmer.frequency.setValueAtTime(2000, time + 0.3);
        shimmer.frequency.exponentialRampToValueAtTime(4000, time + 0.6);
        shimmerGain.gain.setValueAtTime(0.08, time + 0.3);
        shimmerGain.gain.exponentialRampToValueAtTime(0.01, time + 0.6);
        shimmer.connect(shimmerGain);
        shimmerGain.connect(this.sfxGain);
        shimmer.start(time + 0.3);
        shimmer.stop(time + 0.6);
    }

    playShieldSound(time) {
        const ctx = this.audioContext;

        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(100, time);
        osc1.frequency.exponentialRampToValueAtTime(500, time + 0.3);
        gain1.gain.setValueAtTime(0.2, time);
        gain1.gain.linearRampToValueAtTime(0.3, time + 0.15);
        gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(time);
        osc1.stop(time + 0.4);

        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            const t = i / ctx.sampleRate;
            data[i] = Math.sin(2 * Math.PI * 300 * t) * Math.exp(-t * 5) * 0.3 +
                     (Math.random() * 2 - 1) * Math.exp(-t * 10) * 0.1;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const sourceGain = ctx.createGain();
        sourceGain.gain.value = 0.4;
        source.connect(sourceGain);
        sourceGain.connect(this.sfxGain);
        source.start(time + 0.2);
    }

    playBigWeaponSound(time) {
        const ctx = this.audioContext;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(80, time);
        osc.frequency.exponentialRampToValueAtTime(200, time + 0.4);
        gain.gain.setValueAtTime(0.15, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.5);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.5);

        for (let i = 0; i < 3; i++) {
            const burstOsc = ctx.createOscillator();
            const burstGain = ctx.createGain();
            burstOsc.type = 'square';
            burstOsc.frequency.value = 100 + i * 50;
            const burstTime = time + 0.4 + i * 0.05;
            burstGain.gain.setValueAtTime(0.2, burstTime);
            burstGain.gain.exponentialRampToValueAtTime(0.01, burstTime + 0.1);
            burstOsc.connect(burstGain);
            burstGain.connect(this.sfxGain);
            burstOsc.start(burstTime);
            burstOsc.stop(burstTime + 0.1);
        }
    }

    // ========== 攻擊音效 ==========

    playLaunchSound() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 發射呼嘯聲
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, time);
        osc.frequency.exponentialRampToValueAtTime(800, time + 0.15);
        osc.frequency.exponentialRampToValueAtTime(400, time + 0.3);
        gain.gain.setValueAtTime(0.25, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.3);

        // 空氣衝擊
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3) * 0.5;
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.2;
        source.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        source.start(time);
    }

    // 強化版擊中音效
    playHitSound(intensity = 'normal') {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 根據強度調整
        const volumeMultiplier = intensity === 'critical' ? 1.5 : 1;

        // 主衝擊波
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(300, time);
        osc1.frequency.exponentialRampToValueAtTime(50, time + 0.15);
        gain1.gain.setValueAtTime(0.4 * volumeMultiplier, time);
        gain1.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
        osc1.connect(gain1);
        gain1.connect(this.sfxGain);
        osc1.start(time);
        osc1.stop(time + 0.2);

        // 低頻震動
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = 60;
        gain2.gain.setValueAtTime(0.3 * volumeMultiplier, time);
        gain2.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc2.connect(gain2);
        gain2.connect(this.sfxGain);
        osc2.start(time);
        osc2.stop(time + 0.3);

        // 噪音衝擊
        const bufferSize = ctx.sampleRate * 0.15;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
        }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const noiseGain = ctx.createGain();
        noiseGain.gain.value = 0.35 * volumeMultiplier;
        source.connect(noiseGain);
        noiseGain.connect(this.sfxGain);
        source.start(time);

        // 迴響效果
        const echo = ctx.createOscillator();
        const echoGain = ctx.createGain();
        echo.type = 'sine';
        echo.frequency.setValueAtTime(150, time + 0.1);
        echo.frequency.exponentialRampToValueAtTime(80, time + 0.4);
        echoGain.gain.setValueAtTime(0.15 * volumeMultiplier, time + 0.1);
        echoGain.gain.exponentialRampToValueAtTime(0.01, time + 0.4);
        echo.connect(echoGain);
        echoGain.connect(this.sfxGain);
        echo.start(time + 0.1);
        echo.stop(time + 0.4);

        // 爆炸碎片音效
        if (intensity === 'critical') {
            for (let i = 0; i < 5; i++) {
                const fragment = ctx.createOscillator();
                const fragGain = ctx.createGain();
                fragment.type = 'square';
                fragment.frequency.value = 200 + Math.random() * 300;
                const fragTime = time + 0.05 + i * 0.03;
                fragGain.gain.setValueAtTime(0.15, fragTime);
                fragGain.gain.exponentialRampToValueAtTime(0.01, fragTime + 0.1);
                fragment.connect(fragGain);
                fragGain.connect(this.sfxGain);
                fragment.start(fragTime);
                fragment.stop(fragTime + 0.1);
            }
        }
    }

    // 護盾擋住攻擊音效
    playShieldBlockSound() {
        if (!this.enabled || !this.sfxEnabled) return;
        this.init();
        const ctx = this.audioContext;
        const time = ctx.currentTime;

        // 金屬碰撞聲
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, time);
        osc.frequency.exponentialRampToValueAtTime(2000, time + 0.05);
        osc.frequency.exponentialRampToValueAtTime(500, time + 0.2);
        gain.gain.setValueAtTime(0.3, time);
        gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(time);
        osc.stop(time + 0.3);

        // 能量反彈
        const bounce = ctx.createOscillator();
        const bounceGain = ctx.createGain();
        bounce.type = 'sine';
        bounce.frequency.setValueAtTime(400, time + 0.05);
        bounce.frequency.exponentialRampToValueAtTime(1200, time + 0.15);
        bounceGain.gain.setValueAtTime(0.2, time + 0.05);
        bounceGain.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
        bounce.connect(bounceGain);
        bounceGain.connect(this.sfxGain);
        bounce.start(time + 0.05);
        bounce.stop(time + 0.25);
    }
}

// 全域音效管理器實例
const soundManager = new SoundManager();

// ==================== 資源管理 ====================
// 所有圖片資源集中於此，使用本地美式漫畫風格素材
const ASSETS = {
    // 貓咪陣營圖片（美式漫畫風格）
    cat: {
        idle: 'assets/cat/idle.png',           // 貓咪站立
        attack: 'assets/cat/attack.png',       // 貓咪攻擊
        hurt: 'assets/cat/hurt.png',           // 貓咪受傷
        taunt: 'assets/cat/taunt.png',         // 貓咪嘲諷
        projectile: 'assets/cat/projectile.png', // 貓咪投擲物（魚）
        portrait: 'assets/portraits/cat_portrait.png',  // 貓咪頭像（快打旋風風格）
        super: 'assets/cat/cat_super.png'      // 貓咪超級賽亞人型態
    },
    // 狗狗陣營圖片（美式漫畫風格）
    dog: {
        idle: 'assets/dog/idle.png',           // 狗狗站立
        attack: 'assets/dog/attack.png',       // 狗狗攻擊
        hurt: 'assets/dog/hurt.png',           // 狗狗受傷
        taunt: 'assets/dog/taunt.png',         // 狗狗嘲諷
        projectile: 'assets/dog/projectile.png', // 狗狗投擲物（骨頭）
        portrait: 'assets/portraits/dog_portrait.png',  // 狗狗頭像（快打旋風風格）
        super: 'assets/dog/dog_super.png'      // 狗狗超級賽亞人型態
    },
    // 背景與場景（美式漫畫風格）
    background: 'assets/background.png',  // 遊戲背景
    ground: '#4a7c4a',  // 地面顏色（配合背景草地）
    // 特效
    explosion: 'assets/effects/explosion.png',  // 爆炸效果
    shield: 'assets/effects/shield.png',        // 護盾效果
    // 場景
    wall: 'assets/wall.png'                     // 中間牆壁（美式風格）
};

// ==================== 遊戲設定常數 ====================
const CONFIG = {
    // 血量設定
    MAX_HP: 100,

    // 物理參數
    GRAVITY: 0.4,              // 重力加速度（降低讓拋物線更遠）
    MAX_POWER: 60,             // 最大發射力道
    POWER_MULTIPLIER: 0.35,    // 拖拽距離轉力道係數
    PROJECTILE_SPEED: 0.55,    // 飛行物動畫速度係數（提升10%）

    // 傷害計算
    // 傷害設定（三區域判定）
    DAMAGE_CENTER: 35,         // 中間擊中傷害
    DAMAGE_INNER: 25,          // 中間兩側傷害
    DAMAGE_OUTER: 10,          // 外面兩側傷害
    HIT_RADIUS: 130,           // 命中判定半徑（配合放大後的角色，增加30%）

    // 道具效果
    ITEMS: {
        double: { name: '加倍傷害', multiplier: 2 },
        heal: { name: '恢復血量', amount: 30 },
        shield: { name: '護盾', blocksOne: true },
        bigWeapon: { name: '放大武器', sizeMultiplier: 2 }
    },

    // 中間圍牆設定
    WALL: {
        WIDTH: 80,             // 圍牆寬度（配合美式風格圖片）
        HEIGHT_RATIO: 0.5,     // 圍牆高度（相對於畫面高度的比例）
        COLOR: '#8B4513',      // 圍牆顏色（備用）
        BORDER_COLOR: '#5D3A1A' // 圍牆邊框顏色（備用）
    },

    // 動畫
    PROJECTILE_SIZE: 120,      // 投擲物大小（再放大50%）
    CHARACTER_SIZE: 224,       // 角色大小（再放大20%，原187）
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
        this.questionOrderMode = 'sequential'; // 題目順序模式：'sequential' 或 'random'
        this.gameMode = 'normal';              // 遊戲模式：'normal' 一般模式 或 'duel' 決鬥模式
        this.currentOptionMapping = {}; // 當前題目的選項映射（隨機排列用）

        // 玩家資料
        this.players = {
            1: {
                team: null,            // 'cat' 或 'dog'
                hp: CONFIG.MAX_HP,
                x: 0,
                y: 0,
                items: { double: 1, heal: 1, shield: 1, bigWeapon: 1 },
                hasShield: false,
                activeItem: null,      // 當前啟用的道具
                animation: null,       // 動畫狀態：'hurt', 'taunt', null
                animationFrame: 0,     // 動畫幀數
                animationDuration: 0,  // 動畫持續時間
                hpFlash: 0,            // 血條閃光效果計時
                lastHp: CONFIG.MAX_HP  // 上一次血量（用於扣血動畫）
            },
            2: {
                team: null,
                hp: CONFIG.MAX_HP,
                x: 0,
                y: 0,
                items: { double: 1, heal: 1, shield: 1, bigWeapon: 1 },
                hasShield: false,
                activeItem: null,
                animation: null,
                animationFrame: 0,
                animationDuration: 0,
                hpFlash: 0,            // 血條閃光效果計時
                lastHp: CONFIG.MAX_HP  // 上一次血量（用於扣血動畫）
            }
        };

        // 投擲物狀態
        this.projectile = {
            active: false,
            x: 0,
            y: 0,
            vx: 0,
            vy: 0,
            owner: null,
            isBig: false  // 放大武器效果
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
        // 角色站在畫面底部（配合背景街道地面）
        const groundY = this.canvas.height - 30;
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

        loadImage('background', ASSETS.background, null);
        loadImage('cat_idle', ASSETS.cat.idle, '🐱');
        loadImage('cat_attack', ASSETS.cat.attack, '🐱');
        loadImage('cat_hurt', ASSETS.cat.hurt, '🐱');
        loadImage('cat_taunt', ASSETS.cat.taunt, '😼');
        loadImage('cat_projectile', ASSETS.cat.projectile, '🐟');
        loadImage('dog_idle', ASSETS.dog.idle, '🐶');
        loadImage('dog_attack', ASSETS.dog.attack, '🐶');
        loadImage('dog_hurt', ASSETS.dog.hurt, '🐶');
        loadImage('dog_taunt', ASSETS.dog.taunt, '🐕');
        loadImage('dog_projectile', ASSETS.dog.projectile, '🦴');
        loadImage('cat_portrait', ASSETS.cat.portrait, '🐱');
        loadImage('dog_portrait', ASSETS.dog.portrait, '🐶');
        loadImage('cat_super', ASSETS.cat.super, '🐱');
        loadImage('dog_super', ASSETS.dog.super, '🐶');
        loadImage('shield', ASSETS.shield, '🛡️');
        loadImage('explosion', ASSETS.explosion, '💥');
        loadImage('wall', ASSETS.wall, null);

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

        // 音效開關
        document.getElementById('bgm-toggle').addEventListener('change', (e) => {
            soundManager.toggleBGM(e.target.checked);
        });
        document.getElementById('sfx-toggle').addEventListener('change', (e) => {
            soundManager.toggleSFX(e.target.checked);
        });

        // 遊戲模式切換時顯示說明
        document.querySelectorAll('input[name="game-mode"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const hint = document.getElementById('mode-hint');
                if (e.target.value === 'duel') {
                    hint.textContent = '⚠️ 一擊必殺！被命中即淘汰';
                    hint.style.color = '#ff6b6b';
                } else {
                    hint.textContent = '';
                }
            });
        });

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
        const errorEl = document.getElementById('upload-error');
        const fileNameEl = document.getElementById('file-name');
        const startBtn = document.getElementById('start-btn');

        // 清空之前的訊息
        errorEl.textContent = '';
        fileNameEl.textContent = '';

        if (!file) {
            console.log('未選擇檔案');
            return;
        }

        console.log('選擇檔案:', file.name, file.type, file.size);
        fileNameEl.textContent = `⏳ 正在載入 ${file.name}...`;

        // 檢查檔案類型
        if (!file.name.match(/\.(xlsx|xls)$/i)) {
            errorEl.textContent = '❌ 請上傳 Excel 檔案 (.xlsx 或 .xls)';
            fileNameEl.textContent = '';
            return;
        }

        // 檢查 XLSX 庫是否載入
        if (typeof XLSX === 'undefined') {
            errorEl.textContent = '❌ Excel 處理庫未載入，請重新整理頁面';
            fileNameEl.textContent = '';
            console.error('XLSX library not loaded');
            return;
        }

        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                console.log('檔案讀取完成，開始解析...');
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                // 讀取第一個工作表
                const sheetName = workbook.SheetNames[0];
                console.log('工作表名稱:', sheetName);
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                console.log('解析到', json.length, '列資料');

                // 解析題目（跳過標題列）
                this.questions = [];
                for (let i = 1; i < json.length; i++) {
                    const row = json[i];
                    if (row && row.length >= 6 && row[0]) {
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

                console.log('解析到', this.questions.length, '題');

                if (this.questions.length === 0) {
                    errorEl.textContent = '❌ 找不到有效題目，請確認格式：題目、選項A、選項B、選項C、選項D、正確解答';
                    fileNameEl.textContent = '';
                    return;
                }

                // 顯示檔案資訊
                fileNameEl.textContent = `✅ ${file.name} (${this.questions.length} 題)`;
                startBtn.disabled = false;

            } catch (err) {
                console.error('Excel 解析錯誤:', err);
                errorEl.textContent = '❌ 檔案解析失敗：' + err.message;
                fileNameEl.textContent = '';
            }
        };

        reader.onerror = (err) => {
            console.error('檔案讀取錯誤:', err);
            errorEl.textContent = '❌ 檔案讀取失敗';
            fileNameEl.textContent = '';
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
        // 讀取題目順序選項
        const orderSelection = document.querySelector('input[name="question-order"]:checked');
        const isRandom = orderSelection && orderSelection.value === 'random';

        if (isRandom) {
            this.shuffleQuestions();
            this.questionOrderMode = 'random';
        } else {
            this.questionOrderMode = 'sequential';
        }

        // 讀取遊戲模式選項
        const modeSelection = document.querySelector('input[name="game-mode"]:checked');
        this.gameMode = modeSelection ? modeSelection.value : 'normal';

        console.log('遊戲設定:', {
            questionOrder: this.questionOrderMode,
            gameMode: this.gameMode,
            questionsCount: this.questions.length
        });

        this.switchScreen('init-screen', 'team-select-screen');
        this.state = GameState.TEAM_SELECT;
        document.querySelector('.player-indicator').textContent = '玩家 1 選擇陣營';
    }

    selectTeam(team) {
        // 玩家1 選擇陣營，玩家2 自動獲得另一陣營
        this.players[1].team = team;
        this.players[2].team = (team === 'cat') ? 'dog' : 'cat';

        // 顯示選擇結果
        const p1Team = team === 'cat' ? '🐱 貓咪隊' : '🐶 狗狗隊';
        const p2Team = team === 'cat' ? '🐶 狗狗隊' : '🐱 貓咪隊';
        document.querySelector('.player-indicator').textContent =
            `玩家1: ${p1Team} vs 玩家2: ${p2Team}`;

        // 短暫延遲後進入遊戲
        setTimeout(() => {
            this.switchScreen('team-select-screen', 'game-screen');
            this.state = GameState.READY;
            this.currentTurn = 1;
            // 開始播放戰鬥配樂
            soundManager.playBattleBGM();
            this.updateItemsUI();
            this.startTurn();
        }, 1000);
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

        // 切換背景音樂到緊張模式
        soundManager.setBGMMode('tense');

        // 重要：狀態變更後更新道具按鈕
        this.updateItemsUI();

        // 如果題目用完，根據選擇的順序模式處理
        if (this.currentQuestionIndex >= this.questions.length) {
            if (this.questionOrderMode === 'random') {
                this.shuffleQuestions();
            }
            this.currentQuestionIndex = 0;
        }

        const q = this.questions[this.currentQuestionIndex];

        // 更新題目視窗內容
        const teamName = this.players[this.currentTurn].team === 'cat' ? '貓咪隊' : '狗狗隊';
        document.getElementById('question-player').textContent = `玩家 ${this.currentTurn} (${teamName}) 答題`;
        document.getElementById('question-text').textContent = q.question;

        // 隨機打亂選項順序
        const optionKeys = ['A', 'B', 'C', 'D'];
        const shuffledKeys = [...optionKeys].sort(() => Math.random() - 0.5);

        // 建立選項映射：按鈕位置 -> 原始選項
        this.currentOptionMapping = {};
        const optionBtns = document.querySelectorAll('.option-btn');
        optionBtns.forEach((btn, index) => {
            const displayLabel = optionKeys[index]; // A, B, C, D (顯示用)
            const originalKey = shuffledKeys[index]; // 隨機對應的原始選項
            this.currentOptionMapping[displayLabel] = originalKey;
            btn.dataset.option = displayLabel;
            btn.textContent = `${displayLabel}. ${q.options[originalKey]}`;
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
        // 透過映射取得選擇對應的原始選項
        const originalSelected = this.currentOptionMapping[selected];
        const correct = q.answer === originalSelected;
        const feedbackEl = document.getElementById('answer-feedback');

        // 找出正確答案對應的按鈕位置
        let correctButtonLabel = null;
        for (const [label, originalKey] of Object.entries(this.currentOptionMapping)) {
            if (originalKey === q.answer) {
                correctButtonLabel = label;
                break;
            }
        }

        // 禁用所有選項
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.option === correctButtonLabel) {
                btn.classList.add('correct');
            } else if (btn.dataset.option === selected && !correct) {
                btn.classList.add('wrong');
            }
        });

        if (correct) {
            feedbackEl.textContent = '✅ 答對了！獲得攻擊權！';
            feedbackEl.className = 'answer-feedback correct';

            // 播放答對音效
            soundManager.playCorrectSound();

            // 延遲後進入攻擊階段
            setTimeout(() => {
                document.getElementById('question-modal').classList.remove('active');
                this.state = GameState.ATTACK;
                this.updateItemsUI(); // 重要：更新道具按鈕狀態
                document.getElementById('turn-indicator').textContent =
                    `🎮 玩家 ${this.currentTurn} 拖拽角色來攻擊！`;
                this.currentQuestionIndex++;

                // 切換背景音樂到攻擊模式
                soundManager.setBGMMode('attack');
            }, 1500);

        } else {
            feedbackEl.textContent = `❌ 答錯了！正確答案是 ${correctButtonLabel}`;
            feedbackEl.className = 'answer-feedback wrong';

            // 播放答錯音效
            soundManager.playWrongSound();

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

        // 檢查是否有放大武器效果
        this.projectile.isBig = (player.activeItem === 'bigWeapon');
        if (this.projectile.isBig) {
            player.activeItem = null;
        }

        this.state = GameState.PROJECTILE;
        document.getElementById('turn-indicator').textContent = '🚀 發射！';

        // 播放發射音效
        soundManager.playLaunchSound();
    }

    updateProjectile() {
        if (!this.projectile.active) return;

        // 套用重力（正常重力效果，產生明顯的下墜加速感）
        this.projectile.vy += CONFIG.GRAVITY;

        // 更新位置（乘以速度係數，降低飛行動畫速度）
        this.projectile.x += this.projectile.vx * CONFIG.PROJECTILE_SPEED;
        this.projectile.y += this.projectile.vy * CONFIG.PROJECTILE_SPEED;

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
        const groundY = this.canvas.height - 20;
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

        // 立即重置攻擊者的道具狀態（結束超級賽亞人型態）
        this.players[this.currentTurn].activeItem = null;

        // 播放擊中音效（一般強度）
        soundManager.playHitSound('normal');

        // 在撞牆位置顯示爆炸效果
        this.addEffect(this.projectile.x, this.projectile.y, 'wall_hit');

        document.getElementById('turn-indicator').textContent = '💥 撞到圍牆了！';

        // 切換回一般模式
        soundManager.setBGMMode('normal');

        // 攻擊結束後隨機移動攻擊者位置
        this.randomizeAttackerPosition();

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

        // 計算傷害（垂直三區域判定：由左至右 外側-內側-中心-內側-外側）
        // 使用水平距離（X軸差距）判定區域
        const horizontalDist = Math.abs(this.projectile.x - target.x);
        const characterWidth = CONFIG.CHARACTER_SIZE / 2;
        const centerZone = characterWidth / 3;      // 中心區域寬度
        const innerZone = characterWidth * 2 / 3;   // 內側區域邊界

        let damage;
        let hitZone;
        let hitIntensity = 'normal';
        if (horizontalDist < centerZone) {
            damage = CONFIG.DAMAGE_CENTER;  // 中心擊中（角色中線）
            hitZone = '中心';
            hitIntensity = 'critical';  // 中心命中使用強化音效
        } else if (horizontalDist < innerZone) {
            damage = CONFIG.DAMAGE_INNER;   // 內側
            hitZone = '內側';
        } else {
            damage = CONFIG.DAMAGE_OUTER;   // 外側
            hitZone = '外側';
        }

        // 檢查攻擊者是否有加倍傷害
        if (attacker.activeItem === 'double') {
            damage *= CONFIG.ITEMS.double.multiplier;
            hitIntensity = 'critical';  // 加倍傷害也使用強化音效
        }
        // 立即重置道具狀態（結束超級賽亞人型態）
        attacker.activeItem = null;

        // 決鬥模式：一擊必殺
        if (this.gameMode === 'duel') {
            damage = CONFIG.MAX_HP;
            hitIntensity = 'critical';
        }

        // 檢查目標是否有護盾
        if (target.hasShield) {
            damage = 0;
            target.hasShield = false;
            document.getElementById('turn-indicator').textContent = '🛡️ 護盾擋住了攻擊！';
            this.addEffect(target.x, target.y, 'shield');

            // 播放護盾擋住音效
            soundManager.playShieldBlockSound();
        } else {
            // 播放擊中音效（根據強度）
            soundManager.playHitSound(hitIntensity);

            target.hp = Math.max(0, target.hp - damage);
            target.hpFlash = 30;  // 觸發血條閃光震動效果

            // 根據模式顯示不同訊息
            if (this.gameMode === 'duel') {
                document.getElementById('turn-indicator').textContent =
                    `💀 一擊必殺！命中${hitZone}！`;
            } else {
                document.getElementById('turn-indicator').textContent =
                    `💥 命中${hitZone}！造成 ${damage} 點傷害！`;
            }
            this.addEffect(target.x, target.y, 'explosion');

            // 觸發受傷動畫
            this.triggerAnimation(targetNum, 'hurt');

            // 檢查是否有玩家血量危險（低於 30%）
            const dangerThreshold = CONFIG.MAX_HP * 0.3;
            if (this.players[1].hp <= dangerThreshold || this.players[2].hp <= dangerThreshold) {
                soundManager.setBGMMode('danger');
            } else {
                soundManager.setBGMMode('normal');
            }
        }

        // 攻擊結束後隨機移動攻擊者位置
        this.randomizeAttackerPosition();

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

        // 立即重置攻擊者的道具狀態（結束超級賽亞人型態）
        this.players[this.currentTurn].activeItem = null;

        document.getElementById('turn-indicator').textContent = '💨 沒有命中...';

        // 播放嘲諷音效
        soundManager.playTauntSound();

        // 觸發對手嘲諷動畫
        const targetNum = this.currentTurn === 1 ? 2 : 1;
        this.triggerAnimation(targetNum, 'taunt');

        // 攻擊結束後隨機移動攻擊者位置
        this.randomizeAttackerPosition();

        // 切換回一般模式
        soundManager.setBGMMode('normal');

        setTimeout(() => {
            this.switchTurn();
        }, 1500);
    }

    // 隨機移動攻擊者位置（在該隊範圍內）
    randomizeAttackerPosition() {
        const player = this.players[this.currentTurn];
        const wall = this.getWallBounds();
        const margin = CONFIG.CHARACTER_SIZE / 2 + 20; // 邊距

        let minX, maxX;
        if (this.currentTurn === 1) {
            // 玩家1 在左側：從左邊緣到圍牆左邊
            minX = margin;
            maxX = wall.x - margin;
        } else {
            // 玩家2 在右側：從圍牆右邊到右邊緣
            minX = wall.x + wall.width + margin;
            maxX = this.canvas.width - margin;
        }

        // 隨機生成新的 x 座標
        player.x = minX + Math.random() * (maxX - minX);
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

        // 播放技能音效
        soundManager.playSkillSound(item);

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

            case 'bigWeapon':
                // 放大武器（標記，等攻擊時套用）
                playerData.activeItem = 'bigWeapon';
                document.getElementById('turn-indicator').textContent = '🔥 武器放大 200%！';
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
                    (item === 'shield' && player.hasShield) ||
                    (item === 'bigWeapon' && player.activeItem === 'bigWeapon')
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

        // 切換到勝利音樂模式
        soundManager.setBGMMode('victory');

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
                items: { double: 1, heal: 1, shield: 1, bigWeapon: 1 },
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
                items: { double: 1, heal: 1, shield: 1, bigWeapon: 1 },
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

        // 根據順序模式決定是否打亂題目
        if (this.questionOrderMode === 'random') {
            this.shuffleQuestions();
        }

        // 關閉遊戲結束視窗
        document.getElementById('gameover-modal').classList.remove('active');

        // 停止背景音樂
        soundManager.stopBGM();

        // 回到陣營選擇
        this.switchScreen('game-screen', 'team-select-screen');
        this.state = GameState.TEAM_SELECT;
        document.querySelector('.player-indicator').textContent = '玩家 1 選擇陣營';
    }

    // ==================== 畫面渲染 ====================
    render() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // 清除畫面
        ctx.clearRect(0, 0, w, h);

        // 繪製背景圖片
        const bgImg = this.images['background'];
        if (bgImg && bgImg.complete && bgImg.naturalWidth > 0) {
            // 繪製背景圖片，覆蓋整個畫布
            ctx.drawImage(bgImg, 0, 0, w, h);
        } else {
            // 備用：繪製漸層背景
            const gradient = ctx.createLinearGradient(0, 0, 0, h);
            gradient.addColorStop(0, '#87CEEB');   // 天空藍
            gradient.addColorStop(0.6, '#98D8C8'); // 淺綠
            gradient.addColorStop(1, '#3d5a3d');   // 地面綠
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, w, h);
        }

        // 地面位置（配合背景街道地面）
        const groundY = h - 20;

        // 模式特效：根據遊戲模式繪製不同場景特效
        if (this.gameMode === 'duel') {
            // 決鬥模式：地面燃燒特效
            this.drawDuelFlames(groundY);
        } else {
            // 一般模式：陽光、花瓣、彩虹光暈特效
            this.drawNormalModeEffects(groundY);
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
        const w = this.canvas.width;

        // 快打旋風風格血條設定
        const barWidth = w * 0.35;  // 血條寬度（畫面寬度的 35%）
        const barHeight = 38;       // 加高血條
        const barY = 28;
        const centerGap = 80;  // 中間間隔

        // P1/P2 專屬配色
        const playerColors = {
            1: { primary: '#00BFFF', secondary: '#0080FF', border: '#00FFFF', glow: 'rgba(0, 191, 255, 0.6)' },
            2: { primary: '#FF6347', secondary: '#FF4500', border: '#FFD700', glow: 'rgba(255, 99, 71, 0.6)' }
        };
        const colors = playerColors[playerNum];

        // P1 在左側（血量從右往左減少），P2 在右側（血量從左往右減少）
        const barX = playerNum === 1
            ? (w / 2) - centerGap - barWidth
            : (w / 2) + centerGap;

        // 震動效果
        let shakeX = 0, shakeY = 0;
        if (player.hpFlash > 0) {
            shakeX = Math.sin(player.hpFlash * 2) * 4;
            shakeY = Math.cos(player.hpFlash * 3) * 3;
            player.hpFlash--;
        }

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // 繪製血條外框（斜角造型）
        const skew = 10;  // 斜角程度加大
        ctx.beginPath();
        if (playerNum === 1) {
            // P1: 右斜
            ctx.moveTo(barX + skew, barY);
            ctx.lineTo(barX + barWidth, barY);
            ctx.lineTo(barX + barWidth - skew, barY + barHeight);
            ctx.lineTo(barX, barY + barHeight);
        } else {
            // P2: 左斜
            ctx.moveTo(barX, barY);
            ctx.lineTo(barX + barWidth - skew, barY);
            ctx.lineTo(barX + barWidth, barY + barHeight);
            ctx.lineTo(barX + skew, barY + barHeight);
        }
        ctx.closePath();

        // 外發光效果
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 15;

        // 背景（深色漸層）
        const bgGradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
        bgGradient.addColorStop(0, '#2a2a4a');
        bgGradient.addColorStop(0.5, '#1a1a2e');
        bgGradient.addColorStop(1, '#0a0a1e');
        ctx.fillStyle = bgGradient;
        ctx.fill();

        // 邊框（雙層效果）
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 6;
        ctx.stroke();
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 3;
        ctx.stroke();

        // 血量計算
        const hpPercent = player.hp / CONFIG.MAX_HP;
        const lastHpPercent = player.lastHp / CONFIG.MAX_HP;
        const hpWidth = barWidth * hpPercent;
        const lastHpWidth = barWidth * lastHpPercent;

        // 緩慢減少的血量背景（紅色殘影）
        if (lastHpPercent > hpPercent) {
            ctx.save();
            ctx.beginPath();
            if (playerNum === 1) {
                const startX = barX + barWidth - lastHpWidth;
                ctx.moveTo(startX + skew * (1 - lastHpPercent), barY);
                ctx.lineTo(barX + barWidth, barY);
                ctx.lineTo(barX + barWidth - skew, barY + barHeight);
                ctx.lineTo(startX, barY + barHeight);
            } else {
                const endX = barX + lastHpWidth;
                ctx.moveTo(barX, barY);
                ctx.lineTo(endX - skew * (1 - lastHpPercent), barY);
                ctx.lineTo(endX, barY + barHeight);
                ctx.lineTo(barX + skew, barY + barHeight);
            }
            ctx.closePath();
            ctx.fillStyle = '#8b0000';
            ctx.fill();
            ctx.restore();

            // 緩慢更新 lastHp
            player.lastHp = Math.max(player.hp, player.lastHp - 0.5);
        }

        // 當前血量（漸層）
        if (hpPercent > 0) {
            ctx.save();
            ctx.beginPath();
            if (playerNum === 1) {
                // P1: 血量從右往左減少
                const startX = barX + barWidth - hpWidth;
                ctx.moveTo(startX + skew * (1 - hpPercent), barY);
                ctx.lineTo(barX + barWidth, barY);
                ctx.lineTo(barX + barWidth - skew, barY + barHeight);
                ctx.lineTo(startX, barY + barHeight);
            } else {
                // P2: 血量從左往右減少
                const endX = barX + hpWidth;
                ctx.moveTo(barX, barY);
                ctx.lineTo(endX - skew * (1 - hpPercent), barY);
                ctx.lineTo(endX, barY + barHeight);
                ctx.lineTo(barX + skew, barY + barHeight);
            }
            ctx.closePath();

            // 血量漸層顏色（更鮮豔）
            const gradient = ctx.createLinearGradient(barX, barY, barX, barY + barHeight);
            if (hpPercent > 0.5) {
                // 高血量：亮綠色
                gradient.addColorStop(0, '#7FFF00');
                gradient.addColorStop(0.3, '#00FF00');
                gradient.addColorStop(0.7, '#32CD32');
                gradient.addColorStop(1, '#228B22');
            } else if (hpPercent > 0.25) {
                // 中血量：橙黃色
                gradient.addColorStop(0, '#FFFF00');
                gradient.addColorStop(0.3, '#FFD700');
                gradient.addColorStop(0.7, '#FFA500');
                gradient.addColorStop(1, '#FF8C00');
            } else {
                // 低血量：亮紅色
                gradient.addColorStop(0, '#FF4444');
                gradient.addColorStop(0.3, '#FF0000');
                gradient.addColorStop(0.7, '#DD0000');
                gradient.addColorStop(1, '#AA0000');
            }
            ctx.fillStyle = gradient;
            ctx.fill();

            // 高光效果（血條上方亮線）
            ctx.beginPath();
            if (playerNum === 1) {
                const startX = barX + barWidth - hpWidth;
                ctx.moveTo(startX + skew * (1 - hpPercent) + 2, barY + 3);
                ctx.lineTo(barX + barWidth - 2, barY + 3);
            } else {
                const endX = barX + hpWidth;
                ctx.moveTo(barX + 2, barY + 3);
                ctx.lineTo(endX - skew * (1 - hpPercent) - 2, barY + 3);
            }
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 3;
            ctx.stroke();

            // 閃光效果
            if (player.hpFlash > 0 && player.hpFlash % 4 < 2) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.fill();
            }
            ctx.restore();
        }

        // 繪製文字描邊輔助函數
        const drawTextWithStroke = (text, x, y, fontSize, fillColor, strokeColor, strokeWidth) => {
            ctx.font = `bold ${fontSize}px "Arial Black", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.lineWidth = strokeWidth;
            ctx.strokeStyle = strokeColor;
            ctx.strokeText(text, x, y);
            ctx.fillStyle = fillColor;
            ctx.fillText(text, x, y);
        };

        // 玩家名稱標籤（大字體 + 描邊）
        const labelX = playerNum === 1 ? barX + 35 : barX + barWidth - 35;
        const labelY = barY - 12;
        drawTextWithStroke(`P${playerNum}`, labelX, labelY, 22, colors.primary, '#000', 4);

        // 血量數字（置中顯示，大字體 + 描邊）
        const hpText = `${player.hp}/${CONFIG.MAX_HP}`;
        drawTextWithStroke(hpText, barX + barWidth / 2, barY + barHeight / 2, 18, '#FFFFFF', '#000', 4);

        // 快打旋風風格角色頭像
        if (player.team) {
            const portraitImg = this.images[`${player.team}_portrait`];
            const portraitSize = 70;  // 頭像大小
            const portraitX = playerNum === 1 ? barX - portraitSize - 20 : barX + barWidth + 20;
            const portraitY = barY - 15;

            // 頭像外框（快打旋風風格）
            ctx.save();

            // 外層發光
            ctx.shadowColor = colors.glow;
            ctx.shadowBlur = 15;

            // 黑色底框
            ctx.fillStyle = '#000';
            ctx.fillRect(portraitX - 4, portraitY - 4, portraitSize + 8, portraitSize + 8);

            // 玩家專屬色邊框
            ctx.strokeStyle = colors.border;
            ctx.lineWidth = 3;
            ctx.strokeRect(portraitX - 4, portraitY - 4, portraitSize + 8, portraitSize + 8);

            ctx.shadowBlur = 0;

            // 繪製頭像
            if (portraitImg && portraitImg.complete && portraitImg.naturalWidth > 0) {
                ctx.drawImage(portraitImg, portraitX, portraitY, portraitSize, portraitSize);
            } else {
                // 備用 emoji
                ctx.font = `${portraitSize * 0.7}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#fff';
                ctx.fillText(player.team === 'cat' ? '🐱' : '🐶',
                    portraitX + portraitSize/2, portraitY + portraitSize/2);
            }

            // 內側高光邊
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(portraitX, portraitY + portraitSize);
            ctx.lineTo(portraitX, portraitY);
            ctx.lineTo(portraitX + portraitSize, portraitY);
            ctx.stroke();

            ctx.restore();
        }

        ctx.restore();
    }

    drawCharacter(playerNum) {
        const ctx = this.ctx;
        const player = this.players[playerNum];

        if (!player.team) return;

        // 根據動畫狀態選擇不同圖片
        let imgState = 'idle';
        let isSuper = false;  // 超級賽亞人狀態

        if (player.animation === 'hurt') {
            imgState = 'hurt';
        } else if (player.animation === 'taunt') {
            imgState = 'taunt';
        } else if (player.activeItem === 'double') {
            // 雙倍攻擊啟用時，使用超級賽亞人型態
            imgState = 'super';
            isSuper = true;
        } else if (this.state === GameState.ATTACK && this.currentTurn === playerNum) {
            imgState = 'attack';
        }

        const imgKey = `${player.team}_${imgState}`;
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
        } else if (imgState === 'attack') {
            // 攻擊狀態：放大 20%
            scale = 1.2;
        } else if (isSuper) {
            // 超級賽亞人狀態：放大 25%，並調整 Y 軸讓角色站穩
            scale = 1.25;
            offsetY = size * 0.1;  // 向下偏移補償放大效果
        } else if (imgState === 'idle' && this.gameMode === 'normal') {
            // 一般模式待機狀態：呼吸效果（微小的縮放和輕微上下移動）
            const breathTime = Date.now() / 1000;
            const breathScale = 1 + Math.sin(breathTime * 2 + playerNum) * 0.02;
            const breathY = Math.sin(breathTime * 2 + playerNum) * 3;
            scale = breathScale;
            offsetY = breathY;
        }

        // 翻轉玩家2的角色（面向左邊）
        ctx.save();

        // 應用動畫變換
        const drawX = player.x + offsetX;
        const drawY = player.y + offsetY;

        // 超級賽亞人能量光環特效
        if (isSuper) {
            const time = Date.now() / 100;
            const auraSize = size * 0.7;

            // 外層金色光暈
            ctx.save();
            ctx.translate(drawX, drawY);

            // 動態光環
            const gradient = ctx.createRadialGradient(0, 0, auraSize * 0.3, 0, 0, auraSize);
            gradient.addColorStop(0, 'rgba(255, 215, 0, 0.6)');
            gradient.addColorStop(0.5, 'rgba(255, 165, 0, 0.3)');
            gradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, -size * 0.1, auraSize + Math.sin(time) * 10, 0, Math.PI * 2);
            ctx.fill();

            // 閃爍火焰效果
            ctx.globalAlpha = 0.5 + Math.sin(time * 2) * 0.3;
            const flameGradient = ctx.createRadialGradient(0, -size * 0.2, 0, 0, -size * 0.2, auraSize * 0.8);
            flameGradient.addColorStop(0, 'rgba(255, 255, 100, 0.8)');
            flameGradient.addColorStop(0.4, 'rgba(255, 200, 0, 0.4)');
            flameGradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            ctx.fillStyle = flameGradient;
            ctx.beginPath();
            ctx.arc(0, -size * 0.2, auraSize * 0.8, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = 1;
            ctx.restore();
        }

        // 一般模式角色光暈效果（溫和的白色/彩色光環）
        if (this.gameMode === 'normal' && imgState === 'idle' && !isSuper) {
            const time = Date.now() / 100;
            const auraSize = size * 0.55;

            ctx.save();
            ctx.translate(drawX, drawY);

            // 溫和的白色光暈
            const gentleGlow = ctx.createRadialGradient(0, 0, auraSize * 0.2, 0, 0, auraSize);
            const glowAlpha = 0.15 + Math.sin(time * 0.5) * 0.05;
            gentleGlow.addColorStop(0, `rgba(255, 255, 255, ${glowAlpha})`);
            gentleGlow.addColorStop(0.5, `rgba(255, 250, 230, ${glowAlpha * 0.5})`);
            gentleGlow.addColorStop(1, 'rgba(255, 245, 200, 0)');

            ctx.fillStyle = gentleGlow;
            ctx.beginPath();
            ctx.arc(0, 0, auraSize + Math.sin(time * 0.8) * 5, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        }

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

        // 根據放大武器效果調整大小
        const sizeMultiplier = this.projectile.isBig ? CONFIG.ITEMS.bigWeapon.sizeMultiplier : 1;
        const size = CONFIG.PROJECTILE_SIZE * sizeMultiplier;

        // 旋轉效果
        const rotation = Date.now() / 100;

        ctx.save();
        ctx.translate(this.projectile.x, this.projectile.y);
        ctx.rotate(rotation);

        // 放大時加發光效果
        if (this.projectile.isBig) {
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20;
        }

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
        const groundY = h - 20;
        const wallWidth = CONFIG.WALL.WIDTH;
        const wallHeight = groundY * CONFIG.WALL.HEIGHT_RATIO;

        return {
            x: (w - wallWidth) / 2,
            y: groundY - wallHeight,
            width: wallWidth,
            height: wallHeight
        };
    }

    // 繪製中間圍牆（簡單 2D 美式風格）
    drawWall() {
        const ctx = this.ctx;
        const wall = this.getWallBounds();

        ctx.save();

        // 牆壁主體漸層（磚紅色）
        const wallGradient = ctx.createLinearGradient(wall.x, 0, wall.x + wall.width, 0);
        wallGradient.addColorStop(0, '#8B4513');
        wallGradient.addColorStop(0.3, '#CD853F');
        wallGradient.addColorStop(0.5, '#D2691E');
        wallGradient.addColorStop(0.7, '#CD853F');
        wallGradient.addColorStop(1, '#8B4513');

        // 繪製主體
        ctx.fillStyle = wallGradient;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);

        // 磚塊紋理
        ctx.strokeStyle = '#5D3A1A';
        ctx.lineWidth = 2;
        const brickHeight = 25;
        const brickWidth = wall.width / 2;

        for (let row = 0; row < Math.ceil(wall.height / brickHeight); row++) {
            const y = wall.y + row * brickHeight;
            // 水平線
            ctx.beginPath();
            ctx.moveTo(wall.x, y);
            ctx.lineTo(wall.x + wall.width, y);
            ctx.stroke();

            // 垂直線（交錯排列）
            const offset = (row % 2 === 0) ? 0 : brickWidth / 2;
            for (let col = 0; col <= 2; col++) {
                const x = wall.x + offset + col * brickWidth;
                if (x > wall.x && x < wall.x + wall.width) {
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, Math.min(y + brickHeight, wall.y + wall.height));
                    ctx.stroke();
                }
            }
        }

        // 粗黑色邊框（美式漫畫風格）
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 5;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);

        // 內側亮邊（立體感）
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(wall.x + 3, wall.y + wall.height - 3);
        ctx.lineTo(wall.x + 3, wall.y + 3);
        ctx.lineTo(wall.x + wall.width - 3, wall.y + 3);
        ctx.stroke();

        // 內側暗邊
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.moveTo(wall.x + wall.width - 3, wall.y + 3);
        ctx.lineTo(wall.x + wall.width - 3, wall.y + wall.height - 3);
        ctx.lineTo(wall.x + 3, wall.y + wall.height - 3);
        ctx.stroke();

        // 頂部裝飾（簡單的磚帽）
        ctx.fillStyle = '#6B3E26';
        ctx.fillRect(wall.x - 5, wall.y - 8, wall.width + 10, 10);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(wall.x - 5, wall.y - 8, wall.width + 10, 10);

        ctx.restore();
    }

    // 決鬥模式地面燃燒特效
    drawDuelFlames(groundY) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const time = Date.now() / 100;

        ctx.save();

        // 地面紅色光暈
        const glowGradient = ctx.createLinearGradient(0, groundY - 80, 0, groundY + 20);
        glowGradient.addColorStop(0, 'rgba(255, 50, 0, 0)');
        glowGradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.15)');
        glowGradient.addColorStop(1, 'rgba(255, 50, 0, 0.4)');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(0, groundY - 80, w, 100);

        // 繪製多層火焰
        const flameCount = 25;
        for (let i = 0; i < flameCount; i++) {
            const x = (w / flameCount) * i + (w / flameCount) / 2;
            const baseHeight = 30 + Math.sin(time + i * 0.5) * 15;
            const flicker = Math.sin(time * 3 + i * 1.7) * 0.3 + 0.7;

            // 外層火焰（橙紅色）
            ctx.beginPath();
            ctx.moveTo(x - 15, groundY);
            ctx.quadraticCurveTo(
                x - 8 + Math.sin(time + i) * 5,
                groundY - baseHeight * 0.6,
                x + Math.sin(time * 2 + i) * 3,
                groundY - baseHeight * flicker
            );
            ctx.quadraticCurveTo(
                x + 8 + Math.sin(time + i + 1) * 5,
                groundY - baseHeight * 0.6,
                x + 15,
                groundY
            );
            ctx.closePath();

            const flameGradient = ctx.createLinearGradient(x, groundY, x, groundY - baseHeight);
            flameGradient.addColorStop(0, 'rgba(255, 100, 0, 0.8)');
            flameGradient.addColorStop(0.3, 'rgba(255, 150, 0, 0.6)');
            flameGradient.addColorStop(0.6, 'rgba(255, 200, 50, 0.4)');
            flameGradient.addColorStop(1, 'rgba(255, 255, 100, 0)');
            ctx.fillStyle = flameGradient;
            ctx.fill();

            // 內層火焰（黃色核心）
            const innerHeight = baseHeight * 0.6;
            ctx.beginPath();
            ctx.moveTo(x - 8, groundY);
            ctx.quadraticCurveTo(
                x - 3 + Math.sin(time * 1.5 + i) * 3,
                groundY - innerHeight * 0.5,
                x + Math.sin(time * 2.5 + i) * 2,
                groundY - innerHeight * flicker
            );
            ctx.quadraticCurveTo(
                x + 3 + Math.sin(time * 1.5 + i + 1) * 3,
                groundY - innerHeight * 0.5,
                x + 8,
                groundY
            );
            ctx.closePath();

            const innerGradient = ctx.createLinearGradient(x, groundY, x, groundY - innerHeight);
            innerGradient.addColorStop(0, 'rgba(255, 200, 50, 0.9)');
            innerGradient.addColorStop(0.5, 'rgba(255, 255, 150, 0.6)');
            innerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            ctx.fillStyle = innerGradient;
            ctx.fill();
        }

        // 火花粒子
        for (let i = 0; i < 15; i++) {
            const sparkX = (Math.sin(time * 0.7 + i * 2.3) * 0.5 + 0.5) * w;
            const sparkY = groundY - 20 - Math.abs(Math.sin(time * 2 + i * 1.1)) * 60;
            const sparkSize = 2 + Math.sin(time * 3 + i) * 1;
            const sparkAlpha = 0.5 + Math.sin(time * 4 + i * 0.8) * 0.3;

            ctx.beginPath();
            ctx.arc(sparkX, sparkY, sparkSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 200, 50, ${sparkAlpha})`;
            ctx.fill();
        }

        // 煙霧粒子效果
        for (let i = 0; i < 20; i++) {
            const smokeX = (Math.sin(time * 0.3 + i * 1.8) * 0.5 + 0.5) * w;
            const smokeBaseY = groundY - 60 - i * 8;
            const smokeY = smokeBaseY - Math.sin(time * 0.5 + i * 0.7) * 20;
            const smokeSize = 15 + Math.sin(time * 0.4 + i) * 8 + i * 2;
            const smokeAlpha = Math.max(0, 0.15 - i * 0.006) * (0.7 + Math.sin(time * 0.6 + i) * 0.3);

            const smokeGradient = ctx.createRadialGradient(smokeX, smokeY, 0, smokeX, smokeY, smokeSize);
            smokeGradient.addColorStop(0, `rgba(80, 60, 50, ${smokeAlpha})`);
            smokeGradient.addColorStop(0.5, `rgba(60, 50, 45, ${smokeAlpha * 0.6})`);
            smokeGradient.addColorStop(1, 'rgba(50, 40, 35, 0)');

            ctx.beginPath();
            ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
            ctx.fillStyle = smokeGradient;
            ctx.fill();
        }

        // 熱浪扭曲效果
        for (let i = 0; i < 8; i++) {
            const waveX = (w / 8) * i + (w / 16);
            const waveOffset = Math.sin(time * 1.5 + i * 0.8) * 10;
            const waveHeight = 100 + Math.sin(time * 0.8 + i) * 30;

            ctx.beginPath();
            ctx.moveTo(waveX + waveOffset, groundY - 30);

            // 繪製波浪形熱浪
            for (let j = 0; j < 5; j++) {
                const segmentY = groundY - 30 - (waveHeight / 5) * (j + 1);
                const curveOffset = Math.sin(time * 2 + i + j * 0.5) * (8 + j * 2);
                ctx.quadraticCurveTo(
                    waveX + curveOffset + waveOffset,
                    segmentY + waveHeight / 10,
                    waveX - curveOffset + waveOffset,
                    segmentY
                );
            }

            const heatGradient = ctx.createLinearGradient(waveX, groundY - 30, waveX, groundY - 30 - waveHeight);
            heatGradient.addColorStop(0, 'rgba(255, 150, 50, 0.08)');
            heatGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.05)');
            heatGradient.addColorStop(0.7, 'rgba(255, 220, 150, 0.03)');
            heatGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');

            ctx.strokeStyle = heatGradient;
            ctx.lineWidth = 3 + Math.sin(time + i) * 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // 邊緣暗紅色邊框
        ctx.strokeStyle = 'rgba(150, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.strokeRect(2, 2, w - 4, this.canvas.height - 4);

        ctx.restore();
    }

    // 一般模式場景特效（微風蕭瑟感）
    drawNormalModeEffects(groundY) {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const time = Date.now() / 100;

        ctx.save();

        // 淡淡的霧氣效果（營造蕭瑟氛圍）
        const mistGradient = ctx.createLinearGradient(0, 0, 0, h);
        mistGradient.addColorStop(0, 'rgba(200, 210, 220, 0)');
        mistGradient.addColorStop(0.4, 'rgba(180, 195, 210, 0.03)');
        mistGradient.addColorStop(0.7, 'rgba(170, 185, 200, 0.06)');
        mistGradient.addColorStop(1, 'rgba(160, 175, 190, 0.1)');
        ctx.fillStyle = mistGradient;
        ctx.fillRect(0, 0, w, h);

        // 飄落的落葉（秋風蕭瑟感）- 長距離飄動並淡出
        for (let i = 0; i < 12; i++) {
            // 落葉從左側飄入，長距離飄動穿越整個畫面
            const leafCycleLength = w * 2.5;  // 飄動總距離（畫面寬度的 2.5 倍）
            const leafSpeed = 0.6 + (i % 3) * 0.15;  // 不同葉子有不同速度
            const leafTime = time * leafSpeed + i * 200;

            // 計算在飄動週期中的進度 (0 到 1)
            const leafProgress = (leafTime % leafCycleLength) / leafCycleLength;

            // X 座標：從左側 -100 飄到右側 w+100
            const leafX = -100 + leafProgress * (w + 200);

            // Y 座標：緩慢下落 + 波浪起伏
            const leafBaseY = h * 0.1 + leafProgress * h * 0.7;  // 從上往下飄
            const leafY = leafBaseY + Math.sin(time * 0.5 + i * 0.8) * 25 + Math.sin(time * 0.3 + i * 1.2) * 15;

            const leafSize = 10 + (i % 4) * 3;
            const leafRotation = time * 1.2 + i * 1.5 + Math.sin(time * 0.8 + i) * 1.0;  // 更多旋轉

            // 透明度：開始淡入，中間最清晰，最後淡出
            let leafAlpha;
            if (leafProgress < 0.15) {
                // 開始 15%：淡入
                leafAlpha = (leafProgress / 0.15) * 0.7;
            } else if (leafProgress > 0.7) {
                // 最後 30%：淡出
                leafAlpha = ((1 - leafProgress) / 0.3) * 0.7;
            } else {
                // 中間：完全可見
                leafAlpha = 0.7 + Math.sin(time * 0.4 + i * 0.6) * 0.1;
            }

            ctx.save();
            ctx.translate(leafX, leafY);
            ctx.rotate(leafRotation);
            ctx.globalAlpha = leafAlpha;

            // 落葉形狀（楓葉形）
            ctx.beginPath();
            ctx.moveTo(0, -leafSize);
            ctx.quadraticCurveTo(leafSize * 0.8, -leafSize * 0.3, leafSize * 0.5, leafSize * 0.5);
            ctx.quadraticCurveTo(0, leafSize * 0.3, -leafSize * 0.5, leafSize * 0.5);
            ctx.quadraticCurveTo(-leafSize * 0.8, -leafSize * 0.3, 0, -leafSize);
            ctx.closePath();

            // 秋天色調：褐色、橙色、黃色
            const leafColors = [
                'rgba(180, 100, 60, 0.9)',    // 褐色
                'rgba(210, 130, 50, 0.9)',    // 橙色
                'rgba(190, 160, 70, 0.9)',    // 黃褐色
                'rgba(160, 90, 50, 0.9)'      // 深褐色
            ];
            ctx.fillStyle = leafColors[i % 4];
            ctx.fill();

            // 葉脈
            ctx.strokeStyle = 'rgba(100, 60, 30, 0.5)';
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(0, -leafSize * 0.8);
            ctx.lineTo(0, leafSize * 0.3);
            ctx.stroke();

            ctx.restore();
        }

        // 微風線條（風的流動感）
        for (let i = 0; i < 8; i++) {
            const windY = h * 0.2 + (h * 0.5 / 8) * i + Math.sin(time * 0.3 + i) * 20;
            const windStartX = (Math.sin(time * 0.2 + i * 1.5) * 0.3 - 0.1) * w;
            const windLength = 80 + Math.sin(time * 0.5 + i * 0.7) * 30;
            const windAlpha = 0.08 + Math.sin(time * 0.4 + i * 0.6) * 0.04;

            ctx.beginPath();
            ctx.moveTo(windStartX, windY);

            // 波浪形的風線
            for (let j = 0; j < 4; j++) {
                const segX = windStartX + (windLength / 4) * (j + 1);
                const segY = windY + Math.sin(time * 2 + i + j * 0.8) * 3;
                ctx.lineTo(segX, segY);
            }

            ctx.strokeStyle = `rgba(150, 170, 190, ${windAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.lineCap = 'round';
            ctx.stroke();
        }

        // 漂浮的灰塵粒子
        for (let i = 0; i < 20; i++) {
            const dustTime = time * 0.15 + i * 30;
            const dustX = ((dustTime * 1.2 + i * 80) % (w + 60)) - 30;
            const dustY = (Math.sin(time * 0.2 + i * 1.1) * 0.3 + 0.5) * h + Math.sin(time * 0.6 + i * 0.5) * 20;
            const dustSize = 1.5 + Math.sin(time * 0.5 + i) * 0.5;
            const dustAlpha = 0.2 + Math.sin(time * 0.7 + i * 0.8) * 0.1;

            ctx.beginPath();
            ctx.arc(dustX, dustY, dustSize, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(180, 175, 170, ${dustAlpha})`;
            ctx.fill();
        }

        // 冷色調的底部光暈
        const coolGlow = ctx.createLinearGradient(0, groundY - 50, 0, groundY + 10);
        coolGlow.addColorStop(0, 'rgba(180, 190, 200, 0)');
        coolGlow.addColorStop(0.5, 'rgba(170, 180, 195, 0.05)');
        coolGlow.addColorStop(1, 'rgba(160, 175, 190, 0.1)');
        ctx.fillStyle = coolGlow;
        ctx.fillRect(0, groundY - 50, w, 60);

        // 微風蕭瑟邊框（淡灰藍色）
        const borderAlpha = 0.12 + Math.sin(time * 0.25) * 0.03;
        ctx.strokeStyle = `rgba(150, 165, 180, ${borderAlpha})`;
        ctx.lineWidth = 3;
        ctx.strokeRect(3, 3, w - 6, h - 6);

        ctx.restore();
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
