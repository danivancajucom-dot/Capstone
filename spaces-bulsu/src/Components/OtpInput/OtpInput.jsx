import { useRef } from "react";

export default function OtpInput({ value, onChange, length = 6, disabled }) {
  const refs = useRef([]);

  const handleChange = (idx, e) => {
    const v = e.target.value.replace(/\D/g, "");
    if (!v) {
      const next = [...value];
      next[idx] = "";
      onChange(next);
      return;
    }
    const digits = v.split("");
    const next = [...value];
    digits.forEach((d, i) => {
      if (idx + i < length) next[idx + i] = d;
    });
    onChange(next);
    const nextIdx = Math.min(idx + digits.length, length - 1);
    refs.current[nextIdx]?.focus();
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && idx > 0) refs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handlePaste = (e) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!text) return;
    e.preventDefault();
    const next = Array.from({ length }, (_, i) => text[i] || "");
    onChange(next);
    refs.current[Math.min(text.length, length - 1)]?.focus();
  };

  return (
    <div className="otp-wrap" onPaste={handlePaste}>
      {value.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          className="otp-input"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
        />
      ))}
    </div>
  );
}