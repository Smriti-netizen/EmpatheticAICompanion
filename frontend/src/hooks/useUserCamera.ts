import { useCallback, useEffect, useRef, useState } from "react";

interface UseUserCameraResult {
  enabled: boolean;
  error: string | null;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  enable: () => Promise<void>;
  disable: () => void;
  toggle: () => Promise<void>;
}

export function useUserCamera(): UseUserCameraResult {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const enabledRef = useRef(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setEnabledState = useCallback((value: boolean) => {
    enabledRef.current = value;
    setEnabled(value);
  }, []);

  const disable = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setEnabledState(false);
  }, [setEnabledState]);

  const enable = useCallback(async () => {
    setError(null);
    try {
      // Stop any prior stream so toggle never leaves a ghost feed.
      streamRef.current?.getTracks().forEach((track) => track.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setEnabledState(true);
    } catch {
      setError("Camera permission denied or unavailable.");
      setEnabledState(false);
    }
  }, [setEnabledState]);

  const toggle = useCallback(async () => {
    if (enabledRef.current) disable();
    else await enable();
  }, [disable, enable]);

  useEffect(() => () => disable(), [disable]);

  useEffect(() => {
    if (enabled && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play();
    }
  }, [enabled]);

  return { enabled, error, videoRef, enable, disable, toggle };
}
