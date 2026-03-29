/**
 * VoiceRecorder Component
 * Uses the browser's webkitSpeechRecognition API to record voice input.
 * Fires `onTranscript(text)` callback with the recognized text.
 */
'use client';

import { useState, useRef, useCallback } from 'react';

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
}

// Extend Window to include webkit speech recognition
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default function VoiceRecorder({ onTranscript }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const startRecording = useCallback(() => {
    // Check browser support
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please use Chrome.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English
    recognition.interimResults = true; // show results while speaking
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsRecording(true);
      setInterimText('');
    };

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }
      setInterimText(interim);
      if (final) {
        onTranscript(final);
        setInterimText('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [onTranscript]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mic Button */}
      <div className="relative">
        {/* Pulse rings when recording */}
        {isRecording && (
          <>
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)',
                animation: 'pulse-ring 1.5s ease-in-out infinite',
                transform: 'scale(1.4)',
              }}
            />
            <span
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 70%)',
                animation: 'pulse-ring 1.5s ease-in-out infinite 0.5s',
                transform: 'scale(1.8)',
              }}
            />
          </>
        )}

        <button
          onClick={isRecording ? stopRecording : startRecording}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            border: isRecording ? '3px solid #ef4444' : '3px solid #f97316',
            background: isRecording
              ? 'linear-gradient(135deg, #dc2626, #ef4444)'
              : 'linear-gradient(135deg, #ea580c, #f97316)',
            boxShadow: isRecording
              ? '0 0 30px rgba(239,68,68,0.5)'
              : '0 0 30px rgba(249,115,22,0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '30px',
            transition: 'all 0.3s ease',
            position: 'relative',
            zIndex: 10,
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
          }}
        >
          {isRecording ? '⏹' : '🎤'}
        </button>
      </div>

      {/* Status label */}
      <p
        style={{
          fontSize: '14px',
          fontWeight: 500,
          color: isRecording ? '#ef4444' : '#94a3b8',
          letterSpacing: '0.05em',
        }}
      >
        {isRecording ? '● Recording... click to stop' : 'Click mic to speak'}
      </p>

      {/* Interim live transcript */}
      {interimText && (
        <p
          style={{
            fontSize: '13px',
            color: '#f97316',
            fontStyle: 'italic',
            maxWidth: '300px',
            textAlign: 'center',
          }}
        >
          &ldquo;{interimText}&rdquo;
        </p>
      )}
    </div>
  );
}
