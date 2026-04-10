import { useEffect, useState } from "react";

export function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frame = 0;
    let startTime = 0;
    const duration = 700;

    const step = (timestamp) => {
      if (!startTime) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / duration, 1);
      setDisplayValue(value * progress);
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      }
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span>
      {prefix}
      {Number(displayValue).toFixed(decimals)}
      {suffix}
    </span>
  );
}
