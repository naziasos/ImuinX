import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "imunix-tts-enabled";
const SPEED_KEY = "imunix-tts-speed";

export default function useTextToSpeech() {
  const [enabled, setEnabled] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "false"
  );

  const [speed, setSpeed] = useState(() => {
    const saved = Number(localStorage.getItem(SPEED_KEY));
    return [0.75, 1, 1.25, 1.5].includes(saved) ? saved : 1;
  });

  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }

    setSpeaking(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(enabled));

    if (!enabled) {
      stop();
    }
  }, [enabled, stop]);

  useEffect(() => {
    localStorage.setItem(SPEED_KEY, String(speed));
  }, [speed]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setError("Text-to-Speech is not supported by this browser.");
      return;
    }

    const updateVoices = () => {
      window.speechSynthesis.getVoices();
    };

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      updateVoices
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        updateVoices
      );

      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (text, language = "en") => {
      if (!enabled) {
        setError("Read aloud is turned off in settings.");
        return;
      }

      if (!("speechSynthesis" in window)) {
        setError("Text-to-Speech is not supported by this browser.");
        return;
      }

      const cleanText = text?.trim();

      if (!cleanText) {
        setError("There is no instruction text to read.");
        return;
      }

      stop();
      setError("");

      const languageCode = language === "bn" ? "bn" : "en";

      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();

      const matchingVoices = voices.filter((voice) =>
        voice.lang.toLowerCase().startsWith(languageCode)
      );

      if (matchingVoices.length === 0) {
        setError(
          languageCode === "bn"
            ? "No Bangla voice is available in this browser. Please enable a Bangla speech voice."
            : "No English voice is available in this browser. Please enable an English speech voice."
        );
        return;
      }

      utterance.voice = matchingVoices[0];
      utterance.lang = matchingVoices[0].lang;
      utterance.rate = speed;

      utterance.onstart = () => {
        setSpeaking(true);
      };

      utterance.onend = () => {
        setSpeaking(false);
      };

      utterance.onerror = (event) => {
        setSpeaking(false);

        if (
          event.error !== "canceled" &&
          event.error !== "interrupted"
        ) {
          setError("Unable to read this text. Please try again.");
        }
      };

      window.speechSynthesis.speak(utterance);
    },
    [enabled, speed, stop]
  );

  const toggleEnabled = useCallback(() => {
    setEnabled((previous) => !previous);
    setError("");
  }, []);

  return {
    speak,
    stop,
    speaking,
    enabled,
    toggleEnabled,
    speed,
    setSpeed,
    error,
  };
}