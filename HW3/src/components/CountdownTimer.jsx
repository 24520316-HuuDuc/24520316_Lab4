
import { useState } from "react";
import { Clock3, Radio } from "lucide-react";
import { usePubgAirdropTimer } from "../hooks/usePubgAirdropTimer";

function TimeUnit({ value, label }) {
  return (
    <div className="time-unit">
      <strong>{String(value).padStart(2, "0")}</strong>
      <span>{label}</span>
    </div>
  );
}

export default function CountdownTimer() {
  // Demo: sự kiện bắt đầu sau 2 giờ.
  // Sau này có thể thay bằng timestamp từ Backend.
  const [targetEpochMs] = useState(
    () => Date.now() + 2 * 60 * 60 * 1000
  );

  const {
    days,
    hours,
    minutes,
    seconds,
    isLive,
  } = usePubgAirdropTimer(targetEpochMs, 0);

  return (
    <section className="countdown-card">
      <div className="countdown-heading">
        <div>
          <span className="eyebrow">AIRDROP EVENT</span>
          <h2>Vietnam Championship</h2>
          <p>Thời gian mở sự kiện nhận thưởng</p>
        </div>

        <div className="live-status">
          <Radio size={16} />
          {isLive ? "EVENT LIVE" : "UPCOMING"}
        </div>
      </div>

      {isLive ? (
        <div className="event-live">
          <Radio size={24} />
          SỰ KIỆN ĐÃ BẮT ĐẦU!
        </div>
      ) : (
        <div className="countdown">
          <TimeUnit value={days} label="DAYS" />
          <span className="time-colon">:</span>
          <TimeUnit value={hours} label="HOURS" />
          <span className="time-colon">:</span>
          <TimeUnit value={minutes} label="MINUTES" />
          <span className="time-colon">:</span>
          <TimeUnit value={seconds} label="SECONDS" />
        </div>
      )}

      <div className="countdown-footer">
        <Clock3 size={15} />
        Đồng hồ tự đồng bộ khi quay lại tab
      </div>
    </section>
  );
}
