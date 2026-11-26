import { useEffect, useState } from 'react';

/**
 * Tracks a `429 Retry-After` cooldown purely from server-returned seconds.
 * Never invents a countdown when `Retry-After` is absent (Spec ID-19, ADR-05).
 */
export function useRateLimitCountdown() {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timer = globalThis.setInterval(() => {
      setRemainingSeconds((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);

    return () => {
      globalThis.clearInterval(timer);
    };
  }, [remainingSeconds]);

  const startCountdown = (seconds: number | undefined) => {
    if (typeof seconds === 'number' && seconds > 0) {
      setRemainingSeconds(seconds);
    } else {
      setRemainingSeconds(0);
    }
  };

  return {
    remainingSeconds,
    isRateLimited: remainingSeconds > 0,
    startCountdown,
  };
}
