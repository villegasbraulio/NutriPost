import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const numericValue = Number(value) || 0;
  const [displayValue, setDisplayValue] = useState(numericValue);
  const previousValueRef = useRef(numericValue);

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      previousValueRef.current = numericValue;
      setDisplayValue(numericValue);
      return;
    }

    let frame = 0;
    let startTime = null;
    const duration = 850;
    const startValue = previousValueRef.current;
    const easeOutCubic = (progress) => 1 - (1 - progress) ** 3;

    const step = (timestamp) => {
      if (startTime === null) {
        startTime = timestamp;
      }
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easedProgress = easeOutCubic(progress);
      setDisplayValue(startValue + (numericValue - startValue) * easedProgress);
      if (progress < 1) {
        frame = window.requestAnimationFrame(step);
      } else {
        previousValueRef.current = numericValue;
      }
    };

    frame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(frame);
  }, [numericValue]);

  return (
    <span>
      {prefix}
      {Number(displayValue).toFixed(decimals)}
      {suffix}
    </span>
  );
}
