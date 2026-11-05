
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const PADS = [
  { code: "KeyW", key: "W", name: "KICK", detail: "Bass Drum", type: "kick", icon: "◉" },
  { code: "KeyA", key: "A", name: "SNARE", detail: "Snare Drum", type: "snare", icon: "◎" },
  { code: "KeyS", key: "S", name: "HI-HAT", detail: "Closed Hi-Hat", type: "hat", icon: "◌" },
  { code: "KeyD", key: "D", name: "OPEN HAT", detail: "Open Hi-Hat", type: "openhat", icon: "◉" },
  { code: "KeyJ", key: "J", name: "TOM", detail: "Low Tom", type: "tom", icon: "◉" },
  { code: "KeyK", key: "K", name: "CLAP", detail: "Hand Clap", type: "clap", icon: "✳" },
  { code: "KeyL", key: "L", name: "CYMBAL", detail: "Crash Cymbal", type: "cymbal", icon: "◎" },
];

function playDrum(type, audioContext, masterVolume = 1) {
  const ctx = audioContext;
  const now = ctx.currentTime;

  function noise(duration, frequency = 10000) {
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();

    source.buffer = buffer;
    filter.type = "highpass";
    filter.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now);
gain.gain.exponentialRampToValueAtTime(
  Math.max(0.0001, 0.5 * masterVolume),
  now + 0.005
);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start(now);
    source.stop(now + duration);
  }

  function tone(startFrequency, endFrequency, duration, volume, wave = "sine") {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      now + duration
    );

    gain.gain.setValueAtTime(volume * masterVolume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  }

  switch (type) {
    case "kick":
      tone(150, 42, 0.42, 1.0, "sine");
      break;
    case "snare":
      noise(0.22, 900);
      tone(190, 90, 0.12, 0.24, "triangle");
      break;
    case "hat":
      noise(0.075, 7000);
      break;
    case "openhat":
      noise(0.42, 5500);
      break;
    case "tom":
      tone(180, 65, 0.32, 0.7, "sine");
      break;
    case "clap":
      noise(0.18, 1400);
      break;
    case "cymbal":
      noise(0.85, 3500);
      break;
    default:
      break;
  }
}

function isTypingTarget(target) {
  if (!(target instanceof HTMLElement)) return false;

  return Boolean(
    target.isContentEditable ||
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="textbox"]'
    )
  );
}

function App() {
  const [activePads, setActivePads] = useState([]);
  const [history, setHistory] = useState([]);
  const [sessionName, setSessionName] = useState("My first session");
  const [notes, setNotes] = useState("");
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);

  const audioRef = useRef(null);
  const pressedKeysRef = useRef(new Set());
  const activeTimersRef = useRef({});
  const historyIdRef = useRef(0);

  const getAudioContext = useCallback(() => {
    if (!audioRef.current) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) return null;
      audioRef.current = new AudioContextClass();
    }

    if (audioRef.current.state === "suspended") {
      audioRef.current.resume();
    }

    return audioRef.current;
  }, []);

  const triggerPad = useCallback(
    (pad) => {
      const ctx = getAudioContext();

      if (ctx && !isMuted) {
        playDrum(pad.type, ctx, volume / 100);
      }

      setActivePads((current) => [...current, pad.code]);

      window.clearTimeout(activeTimersRef.current[pad.code]);
      activeTimersRef.current[pad.code] = window.setTimeout(() => {
        setActivePads((current) =>
          current.filter((code) => code !== pad.code)
        );
      }, 150);

      const entry = {
        id: ++historyIdRef.current,
        key: pad.key,
        name: pad.name,
        time: new Date().toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      };

      setHistory((current) => [entry, ...current].slice(0, 30));
    },
    [getAudioContext, isMuted, volume]
  );

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.repeat || isTypingTarget(event.target)) return;

      const pad = PADS.find((item) => item.code === event.code);
      if (!pad) return;

      if (pressedKeysRef.current.has(event.code)) return;

      pressedKeysRef.current.add(event.code);
      event.preventDefault();
      triggerPad(pad);
    }

    function handleKeyUp(event) {
      pressedKeysRef.current.delete(event.code);
    }

    function handleWindowBlur() {
      pressedKeysRef.current.clear();
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);

      Object.values(activeTimersRef.current).forEach(window.clearTimeout);
    };
  }, [triggerPad]);

  function clearHistory() {
    setHistory([]);
  }

  return (
    <main className="studio-app">
      <a className="skip-link" href="#drum-pads">
        Skip to drum pads
      </a>

      <header className="topbar">
        <a className="brand" href="#home" aria-label="Beat Studio home">
          <span className="brand-symbol">B</span>
          <span>BEAT<span className="brand-light">STUDIO</span></span>
        </a>

        <div className="topbar-center">
          <span className="live-dot" />
          STUDIO SESSION
        </div>

        <div className="topbar-right">
          <span className="status-indicator">●</span>
          <span>READY TO PLAY</span>
        </div>
      </header>

      <div className="workspace" id="home">
        <section className="main-panel">
          <div className="eyebrow">
            <span>01</span>
            <span className="eyebrow-line" />
            INTERACTIVE DRUM MACHINE
          </div>

          <div className="heading-row">
            <div>
              <h1>Make some <span>noise.</span></h1>
              <p className="subtitle">
                Your rhythm. Your rules. Play it your way.
              </p>
            </div>
            <div className="bpm-display">
              <span className="bpm-number">120</span>
              <span className="bpm-label">BPM</span>
            </div>
          </div>

          <div className="session-bar">
            <div className="session-info">
              <span className="session-icon">♫</span>
              <div>
                <span className="session-label">CURRENT SESSION</span>
                <input
                  className="session-input"
                  aria-label="Session name"
                  value={sessionName}
                  onChange={(event) => setSessionName(event.target.value)}
                  maxLength={40}
                />
              </div>
            </div>
            <span className="session-state">● LIVE</span>
          </div>

          <section className="drum-section" aria-labelledby="pads-heading">
            <div className="section-heading">
              <div>
                <span className="section-index">01 / 02</span>
                <h2 id="pads-heading">Drum pads</h2>
              </div>
              <span className="keyboard-hint">
                <span className="keyboard-icon">⌨</span>
                USE YOUR KEYBOARD
              </span>
            </div>

            <div className="pad-grid" id="drum-pads">
              {PADS.map((pad, index) => {
                const isActive = activePads.includes(pad.code);

                return (
                  <button
                    className={`drum-pad pad-${pad.type}${isActive ? " is-active" : ""}`}
                    key={pad.code}
                    type="button"
                    aria-label={`${pad.name}, ${pad.detail}, keyboard ${pad.key}`}
                    aria-pressed={isActive}
                    onClick={() => triggerPad(pad)}
                  >
                    <span className="pad-topline">
                      <span className="pad-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="pad-indicator" />
                    </span>

                    <span className="pad-icon" aria-hidden="true">
                      {pad.icon}
                    </span>

                    <span className="pad-name">{pad.name}</span>
                    <span className="pad-detail">{pad.detail}</span>

                    <span className="key-cap">{pad.key}</span>
                  </button>
                );
              })}
            </div>

            <p className="pad-instruction">
              PRESS A PAD OR USE THE KEYS
              <span>W · A · S · D · J · K · L</span>
            </p>
          </section>

          <section className="control-section" aria-label="Audio controls">
            <div className="control-title">
              <span className="section-index">02 / 02</span>
              <h2>Master control</h2>
            </div>

            <div className="master-controls">
              <div className="volume-control">
                <div className="volume-label">
                  <span>MASTER VOLUME</span>
                  <strong>{isMuted ? 0 : volume}%</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  aria-label="Master volume"
                  onChange={(event) => setVolume(Number(event.target.value))}
                />
                <small>Volume display · Sound synthesis demo</small>
              </div>

              <button
                className={`mute-button${isMuted ? " muted" : ""}`}
                type="button"
                aria-pressed={isMuted}
                onClick={() => setIsMuted((current) => !current)}
              >
                <span>{isMuted ? "◌" : "♫"}</span>
                {isMuted ? "UNMUTE" : "MUTE"}
              </button>
            </div>
          </section>
        </section>

        <aside className="side-panel">
          <section className="history-card" aria-labelledby="history-heading">
            <div className="side-card-heading">
              <div>
                <span className="section-index">LIVE FEED</span>
                <h2 id="history-heading">Performance log</h2>
              </div>
              <span className="live-badge">LIVE</span>
            </div>

            <div
              className="history-list"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
              aria-label="Recent drum hits"
            >
              {history.length === 0 ? (
                <div className="empty-history">
                  <span className="empty-icon">◉</span>
                  <strong>No hits yet</strong>
                  <p>Play a pad to see your performance here.</p>
                </div>
              ) : (
                history.map((item) => (
                  <div className="history-entry" key={item.id}>
                    <span className="history-key">{item.key}</span>
                    <span className="history-name">{item.name}</span>
                    <time className="history-time">{item.time}</time>
                  </div>
                ))
              )}
            </div>

            <div className="history-footer">
              <span>{history.length} / 30 EVENTS</span>
              <button type="button" onClick={clearHistory}>
                CLEAR LOG ↗
              </button>
            </div>
          </section>

          <section className="notes-card">
            <div className="side-card-heading">
              <div>
                <span className="section-index">YOUR WORKSPACE</span>
                <h2>Session notes</h2>
              </div>
              <span className="notes-icon">✎</span>
            </div>

            <label className="notes-label" htmlFor="session-notes">
              WRITE DOWN YOUR IDEAS
            </label>
            <textarea
              id="session-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Try a new rhythm, save an idea..."
              rows="4"
            />
            <p className="notes-hint">
              Your notes stay here while this page is open.
            </p>
          </section>

          <section className="keyboard-card">
            <span className="section-index">QUICK GUIDE</span>
            <h2>Keyboard mapping</h2>
            <div className="mini-keyboard">
              {PADS.map((pad) => (
                <div className="mini-key-row" key={pad.code}>
                  <kbd>{pad.key}</kbd>
                  <span>{pad.name}</span>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <footer className="app-footer">
        <span>BEATSTUDIO <span className="footer-dot">●</span> DRUM MACHINE</span>
        <span>BUILT FOR RHYTHM & CREATIVITY</span>
        <span>WCAG 2.2 AA IN MIND</span>
      </footer>
    </main>
  );
}

export default App;
