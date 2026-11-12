
import { useEffect, useState } from "react";

export function usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0) {
  const calculateRemaining = () => {
    return Math.max(
      0,
      targetEpochMs - (Date.now() + serverOffsetMs)
    );
  };

  const [remainingMs, setRemainingMs] = useState(calculateRemaining);

  useEffect(() => {
    const syncClock = () => {
      setRemainingMs(calculateRemaining());
    };

    // Đồng bộ ngay khi component được mount
    syncClock();

    // Không cộng/trừ thời gian theo từng tick.
    // Mỗi lần cập nhật đều tính lại từ thời điểm mục tiêu.
    const intervalId = window.setInterval(syncClock, 200);

    // Khi quay lại tab, tính lại thời gian ngay lập tức
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncClock();
      }
    };

    document.addEventListener(
      "visibilitychange",
      handleVisibilityChange
    );

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        handleVisibilityChange
      );
    };
  }, [targetEpochMs, serverOffsetMs]);

  const totalSeconds = Math.ceil(remainingMs / 1000);

  return {
    remainingMs,
    isLive: remainingMs === 0,
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}
