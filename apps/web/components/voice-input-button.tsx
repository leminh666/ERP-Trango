'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useToast } from '@/components/toast-provider';

interface VoiceInputButtonProps {
  mode: 'income' | 'expense';
  onTranscript: (transcript: string) => void;
  className?: string;
}

export function VoiceInputButton({ mode, onTranscript, className }: VoiceInputButtonProps) {
  const { showError } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
    };

    recognition.onend = () => {
      setIsListening(false);
      // If we have transcript, send it
      if (transcript && isLoading) {
        onTranscript(transcript);
        setIsLoading(false);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsLoading(false);
      // Show alert for errors
      let message = 'Đã xảy ra lỗi khi nhận giọng nói.';
      if (event.error === 'no-speech') {
        message = 'Không phát hiện giọng nói. Vui lòng thử lại.';
      } else if (event.error === 'audio-capture') {
        message = 'Không tìm thấy microphone. Vui lòng kiểm tra kết nối.';
      } else if (event.error === 'not-allowed') {
        message = 'Quyền truy cập microphone bị từ chối.';
      }
      showError('Lỗi microphone', message);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [mode, onTranscript, transcript, isLoading]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      showError('Không hỗ trợ', 'Trình duyệt không hỗ trợ nhận giọng nói. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    setIsLoading(true);
    try {
      recognitionRef.current.start();
      // Auto-stop after 30 seconds
      timeoutRef.current = setTimeout(() => {
        if (isListening) {
          stopListening();
        }
      }, 30000);
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setIsLoading(false);
      showError('Lỗi', 'Không thể bắt đầu nhận giọng nói.');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsListening(false);
  }, []);

  const handleClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <div className="relative inline-block">
      <Button
        variant="outline"
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className={`gap-2 ${isListening ? 'bg-red-50 text-red-600 border-red-200' : ''} ${className}`}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isListening ? (
          <Square className="h-4 w-4" />
        ) : (
          <Mic className="h-4 w-4" />
        )}
        <span className="hidden sm:inline">
          {isListening ? 'Dừng' : 'Nói'}
        </span>
      </Button>
      
      {/* Listening indicator */}
      {isListening && (
        <div className="absolute -top-1 -right-1 flex">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </div>
      )}
    </div>
  );
}

