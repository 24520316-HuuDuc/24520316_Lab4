
import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

// ==============================
// CẤU HÌNH PIANO
// ==============================

const MIN_MIDI = 21; // A0
const MAX_MIDI = 108; // C8
const MAX_VOICES = 8;

const NOTE_NAMES = [
  "C", "C#", "D", "D#", "E", "F",
  "F#", "G", "G#", "A", "A#", "B",
];

const BLACK_NOTES = [1, 3, 6, 8, 10];

// Công thức tính tần số từ MIDI
function midiToFrequency(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

// Chuyển MIDI thành tên nốt
function getNoteName(midi) {
  const name = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;

  return `${name}${octave}`;
}

// Tạo danh sách 88 phím
function createPianoKeys() {
  const keys = [];
  let whiteIndex = 0;

  for (let midi = MIN_MIDI; midi <= MAX_MIDI; midi++) {
    const noteIndex = midi % 12;
    const isBlack = BLACK_NOTES.includes(noteIndex);

    keys.push({
      midi,
      name: getNoteName(midi),
      frequency: midiToFrequency(midi),
      isBlack,
      whiteIndex: isBlack ? whiteIndex - 1 : whiteIndex,
    });

    if (!isBlack) {
      whiteIndex++;
    }
  }

  return keys;
}

// ==============================
// COMPONENT TỪNG PHÍM
// React.memo giúp hạn chế render lại
// ==============================

const PianoKey = memo(function PianoKey({
  note,
  active,
  left,
  onNoteStart,
  onNoteEnd,
}) {
  const handlePointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    onNoteStart(note.midi);
  };

  const handlePointerUp = () => {
    onNoteEnd(note.midi);
  };

  const handlePointerCancel = () => {
    onNoteEnd(note.midi);
  };

  return (
    <button
      type="button"
      className={[
        "piano-key",
        note.isBlack ? "black-key" : "white-key",
        active ? "active" : "",
      ].join(" ")}
      style={note.isBlack ? { left: `${left}px` } : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`${note.name}, ${note.frequency.toFixed(2)} Hz`}
      title={`${note.name} - ${note.frequency.toFixed(2)} Hz`}
    >
      {(!note.isBlack &&
        (note.name === "C" || note.midi === MIN_MIDI)) && (
        <span className="key-label">{note.name}</span>
      )}
    </button>
  );
});

// ==============================
// COMPONENT PIANO CHÍNH
// ==============================

function Piano() {
  const notes = useMemo(() => createPianoKeys(), []);

  // Map lưu các oscillator đang hoạt động.
  // Map giữ thứ tự thêm phần tử nên lấy phần tử đầu tiên O(1).
  const activeVoicesRef = useRef(new Map());

  const audioContextRef = useRef(null);

  // Quản lý bản ghi
  const [recording, setRecording] = useState([]);
  const recordingRef = useRef([]);
  const recordingEnabledRef = useRef(false);
  const lastRecordStartRef = useRef(null);
  const recordIdRef = useRef(0);

  const [isRecording, setIsRecording] = useState(false);
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Quản lý playback
  const playbackAbortRef = useRef(null);
  const playbackTimersRef = useRef(new Set());

  // ==============================
  // KHỞI TẠO AUDIO CONTEXT
  // ==============================

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        alert("Trình duyệt của bạn không hỗ trợ Web Audio API.");
        return null;
      }

      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;

    if (context.state === "suspended") {
      context.resume();
    }

    return context;
  }, []);

  // ==============================
  // GIẢI PHÓNG MỘT GIỌNG
  // ADSR Release tránh tiếng bụp
  // ==============================

  const releaseVoice = useCallback((voice) => {
    if (!voice || voice.released) return;

    voice.released = true;

    const context = audioContextRef.current;

    if (activeVoicesRef.current.get(voice.midi) === voice) {
      activeVoicesRef.current.delete(voice.midi);
      setActiveKeys(new Set(activeVoicesRef.current.keys()));
    }

    if (!context || context.state === "closed") return;

    const now = context.currentTime;

    try {
      const gain = voice.gain;

      gain.gain.cancelScheduledValues(now);

      const currentGain = Math.max(
        gain.gain.value,
        0.0001
      );

      gain.gain.setValueAtTime(currentGain, now);

      // Release stage
      gain.gain.exponentialRampToValueAtTime(
        0.0001,
        now + 0.2
      );

      voice.oscillator.stop(now + 0.22);

      voice.oscillator.onended = () => {
        try {
          voice.oscillator.disconnect();
          voice.gain.disconnect();
        } catch {
          // Đã ngắt kết nối
        }
      };
    } catch {
      // Oscillator đã dừng
    }
  }, []);

  // ==============================
  // DỪNG TẤT CẢ GIỌNG
  // ==============================

  const stopAllVoices = useCallback(() => {
    const voices = [
      ...activeVoicesRef.current.values(),
    ];

    voices.forEach(releaseVoice);

    activeVoicesRef.current.clear();
    setActiveKeys(new Set());
  }, [releaseVoice]);

  // ==============================
  // PHÁT MỘT NỐT NHẠC
  // ==============================

  const noteOn = useCallback(
    (midi, shouldRecord = true) => {
      const context = getAudioContext();

      if (!context) return null;

      // Nếu nốt đó đang được giữ, giải phóng trước
      const existingVoice =
        activeVoicesRef.current.get(midi);

      if (existingVoice) {
        releaseVoice(existingVoice);
      }

      // Giới hạn tối đa 8 giọng
      if (
        activeVoicesRef.current.size >= MAX_VOICES
      ) {
        // Phần tử đầu tiên là giọng cũ nhất trong FIFO
        const oldestMidi =
          activeVoicesRef.current.keys().next().value;

        const oldestVoice =
          activeVoicesRef.current.get(oldestMidi);

        releaseVoice(oldestVoice);
      }

      const oscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "sine";

      const frequency = midiToFrequency(midi);

      oscillator.frequency.setValueAtTime(
        frequency,
        context.currentTime
      );

      // Kết nối oscillator -> gain -> output
      oscillator.connect(gain);
      gain.connect(context.destination);

      // ADSR: Attack
      const now = context.currentTime;

      gain.gain.setValueAtTime(0.0001, now);

      gain.gain.exponentialRampToValueAtTime(
        0.7,
        now + 0.015
      );

      // Decay và Sustain
      gain.gain.exponentialRampToValueAtTime(
        0.4,
        now + 0.12
      );

      oscillator.start(now);

      const voice = {
        midi,
        oscillator,
        gain,
        released: false,
        startedAt: performance.now(),
        recordId: null,
      };

      // Map lưu giọng theo MIDI
      activeVoicesRef.current.set(midi, voice);

      setActiveKeys(new Set(activeVoicesRef.current.keys()));

      // ==========================
      // GHI LẠI NỐT NHẠC
      // ==========================

      if (
        shouldRecord &&
        recordingEnabledRef.current
      ) {
        const startTime = performance.now();

        const deltaMs =
          lastRecordStartRef.current === null
            ? 0
            : startTime - lastRecordStartRef.current;

        lastRecordStartRef.current = startTime;

        const recordId = ++recordIdRef.current;

        voice.recordId = recordId;

        const event = {
          id: recordId,
          midi,
          freqHz: Number(frequency.toFixed(3)),
          durationMs: 0,
          deltaMs: Number(deltaMs.toFixed(2)),
        };

        recordingRef.current = [
          ...recordingRef.current,
          event,
        ];

        setRecording([...recordingRef.current]);
      }

      return voice;
    },
    [getAudioContext, releaseVoice]
  );

  // ==============================
  // NHẢ PHÍM
  // ==============================

  const noteOff = useCallback(
    (midi) => {
      const voice =
        activeVoicesRef.current.get(midi);

      if (!voice) return;

      // Cập nhật thời lượng bản ghi
      if (
        voice.recordId !== null &&
        recordingEnabledRef.current
      ) {
        const durationMs =
          performance.now() - voice.startedAt;

        recordingRef.current =
          recordingRef.current.map((event) =>
            event.id === voice.recordId
              ? {
                  ...event,
                  durationMs: Number(
                    durationMs.toFixed(2)
                  ),
                }
              : event
          );

        setRecording([...recordingRef.current]);
      }

      releaseVoice(voice);
    },
    [releaseVoice]
  );

  // ==============================
  // BẮT ĐẦU GHI ÂM
  // ==============================

  const startRecording = () => {
    stopPlayback();

    recordingRef.current = [];
    setRecording([]);

    lastRecordStartRef.current = null;
    recordIdRef.current = 0;

    recordingEnabledRef.current = true;
    setIsRecording(true);
  };

  // ==============================
  // KẾT THÚC GHI ÂM
  // ==============================

  const finishRecording = () => {
    recordingEnabledRef.current = false;
    setIsRecording(false);

    // Hoàn thiện thời lượng các nốt vẫn đang giữ
    const now = performance.now();

    recordingRef.current =
      recordingRef.current.map((event) => {
        if (event.durationMs !== 0) return event;

        const voice = [
          ...activeVoicesRef.current.values(),
        ].find((item) => item.recordId === event.id);

        if (!voice) return event;

        return {
          ...event,
          durationMs: Number(
            (now - voice.startedAt).toFixed(2)
          ),
        };
      });

    setRecording([...recordingRef.current]);
  };

  // ==============================
  // HÀM CHỜ CÓ ABORT SIGNAL
  // ==============================

  const wait = (milliseconds, signal) => {
    return new Promise((resolve, reject) => {
      if (signal.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }

      const timer = setTimeout(() => {
        signal.removeEventListener("abort", handleAbort);
        resolve();
      }, milliseconds);

      function handleAbort() {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      }

      signal.addEventListener("abort", handleAbort, {
        once: true,
      });
    });
  };

  // ==============================
  // DỪNG PLAYBACK
  // AbortController + dừng oscillator
  // ==============================

  const stopPlayback = useCallback(() => {
    if (playbackAbortRef.current) {
      playbackAbortRef.current.abort();
      playbackAbortRef.current = null;
    }

    playbackTimersRef.current.forEach(clearTimeout);
    playbackTimersRef.current.clear();

    stopAllVoices();
    setIsPlaying(false);
  }, [stopAllVoices]);

  // ==============================
  // PHÁT LẠI BẢN GHI
  // ==============================

  const playRecording = async () => {
    if (recordingRef.current.length === 0) {
      alert("Bạn chưa có bản ghi nào!");
      return;
    }

    stopPlayback();

    const controller = new AbortController();

    playbackAbortRef.current = controller;

    const signal = controller.signal;
    const speed = playbackSpeed;

    setIsPlaying(true);

    try {
      for (const event of recordingRef.current) {
        // Chờ khoảng cách giữa các lần nhấn
        await wait(event.deltaMs / speed, signal);

        if (signal.aborted) break;

        const voice = noteOn(event.midi, false);

        if (!voice) continue;

        // Lên lịch nhả phím
        const timer = setTimeout(() => {
          playbackTimersRef.current.delete(timer);
          releaseVoice(voice);
        }, Math.max(30, event.durationMs / speed));

        playbackTimersRef.current.add(timer);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Playback error:", error);
      }
    } finally {
      if (playbackAbortRef.current === controller) {
        playbackAbortRef.current = null;
        setIsPlaying(false);
      }
    }
  };

  // ==============================
  // XÓA BẢN GHI
  // ==============================

  const clearRecording = () => {
    stopPlayback();

    recordingRef.current = [];
    setRecording([]);

    lastRecordStartRef.current = null;
  };

  // ==============================
  // DỌN DẸP KHI UNMOUNT
  // ==============================

  useEffect(() => {
    return () => {
      playbackAbortRef.current?.abort();

      playbackTimersRef.current.forEach(clearTimeout);

      activeVoicesRef.current.forEach((voice) => {
        try {
          voice.oscillator.stop();
          voice.oscillator.disconnect();
          voice.gain.disconnect();
        } catch {
          // Đã dừng
        }
      });

      activeVoicesRef.current.clear();

      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ==============================
  // TÁCH PHÍM TRẮNG VÀ ĐEN
  // ==============================

  const whiteKeys = notes.filter(
    (note) => !note.isBlack
  );

  const blackKeys = notes.filter(
    (note) => note.isBlack
  );

  const WHITE_KEY_WIDTH = 44;
  const BLACK_KEY_WIDTH = 28;

  return (
    <section className="piano-section">

      {/* Bảng điều khiển */}
      <div className="piano-toolbar">

        <div className="piano-info">
          <span className="status-dot"></span>
          <span>88 KEYS</span>
          <span className="toolbar-divider">|</span>
          <span>POLYPHONY: 8</span>
        </div>

        <div className="piano-controls">

          {!isRecording ? (
            <button
              className="control-button record-button"
              onClick={startRecording}
              disabled={isPlaying}
            >
              <span>●</span> Record
            </button>
          ) : (
            <button
              className="control-button stop-button"
              onClick={finishRecording}
            >
              ■ Stop Recording
            </button>
          )}

          {!isPlaying ? (
            <button
              className="control-button play-button"
              onClick={playRecording}
              disabled={recording.length === 0 || isRecording}
            >
              ▶ Play
            </button>
          ) : (
            <button
              className="control-button stop-button"
              onClick={stopPlayback}
            >
              ■ Stop
            </button>
          )}

          <button
            className="control-button clear-button"
            onClick={clearRecording}
            disabled={recording.length === 0}
          >
            Clear
          </button>

        </div>
      </div>

      {/* Tốc độ phát */}
      <div className="playback-settings">
        <span>Playback speed:</span>

        {[0.5, 1, 2].map((speed) => (
          <button
            key={speed}
            className={
              playbackSpeed === speed
                ? "speed-button selected"
                : "speed-button"
            }
            onClick={() => setPlaybackSpeed(speed)}
            disabled={isPlaying}
          >
            {speed}x
          </button>
        ))}
      </div>

      {/* Bàn phím 88 phím */}
      <div className="keyboard-scroll">

        <div
          className="keyboard"
          style={{
            width: `${whiteKeys.length * WHITE_KEY_WIDTH}px`,
          }}
        >

          <div className="white-keys">
            {whiteKeys.map((note) => (
              <PianoKey
                key={note.midi}
                note={note}
                active={activeKeys.has(note.midi)}
                onNoteStart={noteOn}
                onNoteEnd={noteOff}
              />
            ))}
          </div>

          <div className="black-keys">
            {blackKeys.map((note) => (
              <PianoKey
                key={note.midi}
                note={note}
                active={activeKeys.has(note.midi)}
                left={
                  (note.whiteIndex + 1) * WHITE_KEY_WIDTH -
                  BLACK_KEY_WIDTH / 2
                }
                onNoteStart={noteOn}
                onNoteEnd={noteOff}
              />
            ))}
          </div>

        </div>
      </div>

      {/* Thông tin bản ghi */}
      <div className="recording-panel">

        <div className="recording-heading">
          <div>
            <h3>Recording Sequence</h3>
            <p>
              Các nốt nhạc đã được ghi lại theo thứ tự thời gian.
            </p>
          </div>

          <span className="record-count">
            {recording.length} NOTES
          </span>
        </div>

        {recording.length === 0 ? (
          <div className="empty-recording">
            Chưa có bản ghi. Nhấn Record và chơi thử Piano.
          </div>
        ) : (
          <div className="recording-table-wrapper">
            <table className="recording-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>MIDI</th>
                  <th>Frequency (Hz)</th>
                  <th>Duration (ms)</th>
                  <th>Delta (ms)</th>
                </tr>
              </thead>

              <tbody>
                {recording.map((event, index) => (
                  <tr key={event.id}>
                    <td>{index + 1}</td>
                    <td>{event.midi}</td>
                    <td>{event.freqHz}</td>
                    <td>{event.durationMs}</td>
                    <td>{event.deltaMs}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </section>
  );
}

export default memo(Piano);
