import { useCallback, useEffect, useRef, useState } from 'react';

type RecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type RecognitionResultEvent = {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
};

type RecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: RecognitionResultEvent) => void) | null;
  onerror: ((event: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    webkitAudioContext?: typeof AudioContext;
  }
}

export type SpeechCaptureStatus = 'idle' | 'listening' | 'complete' | 'error';

function recognitionConstructor(): SpeechRecognitionConstructor | undefined {
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

export function useSpeechCapture() {
  const [status, setStatus] = useState<SpeechCaptureStatus>('idle');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const finalTranscriptRef = useRef('');
  const intentionalStopRef = useRef(false);
  const captureRequestRef = useRef(0);
  const mountedRef = useRef(true);

  const releaseAudio = useCallback(() => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    const context = audioContextRef.current;
    audioContextRef.current = null;
    if (context && context.state !== 'closed') {
      void context.close().catch((error: unknown) => {
        console.error('Could not close the microphone audio context.', error);
      });
    }
  }, []);

  const stop = useCallback(() => {
    captureRequestRef.current += 1;
    intentionalStopRef.current = true;
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      recognition.abort();
    }
    recognitionRef.current = null;
    releaseAudio();
    setAudioLevel(0);
    setStatus('idle');
  }, [releaseAudio]);

  const start = useCallback(async (language: string) => {
    stop();
    const captureRequest = ++captureRequestRef.current;
    intentionalStopRef.current = false;
    finalTranscriptRef.current = '';
    setTranscript('');
    setError('');

    const Recognition = recognitionConstructor();
    if (!Recognition) {
      setError('Speech recognition is not supported by this browser. Try a current Chromium-based browser.');
      setStatus('error');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Microphone capture is unavailable. Use HTTPS and allow microphone access.');
      setStatus('error');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mountedRef.current || captureRequest !== captureRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
      if (AudioContextConstructor) {
        const context = new AudioContextConstructor();
        audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream);
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        const updateLevel = () => {
          analyser.getFloatTimeDomainData(samples);
          let energy = 0;
          for (const sample of samples) energy += sample * sample;
          setAudioLevel(Math.min(1, Math.sqrt(energy / samples.length) * 5));
          animationFrameRef.current = window.requestAnimationFrame(updateLevel);
        };
        animationFrameRef.current = window.requestAnimationFrame(updateLevel);
        if (context.state === 'suspended') await context.resume();
      }
      if (!mountedRef.current || captureRequest !== captureRequestRef.current) {
        releaseAudio();
        return;
      }

      const recognition = new Recognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.onresult = (event) => {
        let text = '';
        let finalText = '';
        for (let index = 0; index < event.results.length; index += 1) {
          const result = event.results[index];
          text += result[0].transcript;
          if (result.isFinal) finalText += result[0].transcript;
        }
        setTranscript(text.trim());
        if (finalText.trim()) finalTranscriptRef.current = finalText.trim();
      };
      recognition.onerror = (event) => {
        intentionalStopRef.current = true;
        recognitionRef.current = null;
        releaseAudio();
        setAudioLevel(0);
        setError(event.error === 'not-allowed'
          ? 'Microphone access was denied. Allow microphone access in the browser to use voice input.'
          : `Speech recognition failed (${event.error}). Please try again.`);
        setStatus('error');
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        releaseAudio();
        setAudioLevel(0);
        if (finalTranscriptRef.current) {
          setTranscript(finalTranscriptRef.current);
          setStatus('complete');
        } else if (!intentionalStopRef.current) {
          setError('No speech was recognized. Please try again.');
          setStatus('error');
        }
      };
      recognitionRef.current = recognition;
      recognition.start();
      setStatus('listening');
    } catch (captureError) {
      if (!mountedRef.current || captureRequest !== captureRequestRef.current) return;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
        recognitionRef.current = null;
      }
      releaseAudio();
      setStatus('error');
      setError(captureError instanceof Error
        ? `Unable to start microphone capture: ${captureError.message}`
        : 'Unable to start microphone capture. Check browser permissions and try again.');
    }
  }, [releaseAudio, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      captureRequestRef.current += 1;
      intentionalStopRef.current = true;
      const recognition = recognitionRef.current;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort();
      }
      recognitionRef.current = null;
      releaseAudio();
    };
  }, [releaseAudio]);

  return { status, transcript, error, audioLevel, start, stop };
}
