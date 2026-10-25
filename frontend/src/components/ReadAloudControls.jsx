
import { useState } from "react";
import useTextToSpeech from "../hooks/useTextToSpeech";

export default function ReadAloudControls({ guidance = "" }) {
  const {
    speak,
    stop,
    speaking,
    enabled,
    toggleEnabled,
    speed,
    setSpeed,
    error,
  } = useTextToSpeech();

  const [language, setLanguage] = useState("en");

  const handleRead = () => {
    const instruction =
      typeof guidance === "string"
        ? guidance.trim()
        : guidance[language]?.trim();

    if (!instruction) {
      speak(
        language === "bn"
          ? "এই পেজের নির্দেশনা এখনো যোগ করা হয়নি।"
          : "Instructions for this page have not been added yet.",
        language
      );
      return;
    }

    speak(instruction, language);
  };

  return (
    <section
      className="mx-auto my-3 flex max-w-4xl flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-3"
      aria-label="Read aloud controls"
    >
      <label className="flex items-center gap-2">
        <span>Language</span>
        <select
          value={language}
          onChange={(event) => setLanguage(event.target.value)}
          className="rounded-md border border-slate-300 p-2"
          disabled={speaking}
        >
          <option value="en">English</option>
          <option value="bn">বাংলা</option>
        </select>
      </label>

      <button
        type="button"
        onClick={handleRead}
        disabled={!enabled || speaking}
        className="rounded-md bg-blue-700 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        Read aloud
      </button>

      <button
        type="button"
        onClick={stop}
        disabled={!speaking}
        className="rounded-md border border-slate-300 px-4 py-2 disabled:opacity-50"
      >
        Stop
      </button>

      <label className="flex items-center gap-2">
        <span>Speed</span>
        <select
          value={speed}
          onChange={(event) => setSpeed(Number(event.target.value))}
          className="rounded-md border border-slate-300 p-2"
          disabled={!enabled}
        >
          <option value={0.75}>0.75×</option>
          <option value={1}>1×</option>
          <option value={1.25}>1.25×</option>
          <option value={1.5}>1.5×</option>
        </select>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={toggleEnabled}
        />
        <span>Read aloud On/Off</span>
      </label>

      {error && (
        <p
          role="status"
          aria-live="polite"
          className="w-full text-sm text-red-700"
        >
          {error}
        </p>
      )}
    </section>
  );
}
