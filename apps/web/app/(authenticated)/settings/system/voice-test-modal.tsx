'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mic, Square, Copy, X, AlertCircle, CheckCircle } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface VoiceConfig {
  enabled: boolean;
  provider: 'browser';
  language: string;
  autoPunctuation: boolean;
  interimResults: boolean;
  maxSecondsPerSegment: number;
  pushToTalk: boolean;
}

interface VoiceTestModalProps {
  open: boolean;
  onClose: () => void;
  config?: VoiceConfig;
}

export function VoiceTestModal({ open, onClose, config }: VoiceTestModalProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [isCopying, setIsCopying] = useState(false);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!open) return;

    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Trình duyệt không hỗ trợ nhận giọng nói. Vui lòng dùng Chrome hoặc Edge.');
      return;
    }

    setIsSupported(true);
    setError(null);

    // Initialize recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = config?.interimResults || true;
    recognition.lang = config?.language || 'vi-VN';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);

      switch (event.error) {
        case 'no-speech':
          setError('Không phát hiện giọng nói. Vui lòng thử lại.');
          break;
        case 'audio-capture':
          setError('Không tìm thấy microphone. Vui lòng kiểm tra kết nối.');
          break;
        case 'not-allowed':
          setError('Quyền truy cập microphone bị từ chối. Vui lòng cho phép trong cài đặt trình duyệt.');
          break;
        default:
          setError(`Lỗi: ${event.error}`);
      }
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          let text = result[0].transcript;
          // Auto punctuation if enabled
          if (config?.autoPunctuation) {
            text = text.trim();
            if (!text.endsWith('.') && !text.endsWith('!') && !text.endsWith('?')) {
              text += '.';
            }
          }
          finalTranscript += text;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
      setInterimTranscript(interim);
    };

    recognitionRef.current = recognition;

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [open, config]);

  const startListening = useCallback(() => {
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    if (!recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setIsSupported(false);
        setError('Trình duyệt không hỗ trợ nhận giọng nói. Vui lòng dùng Chrome hoặc Edge.');
        return;
      }
    }

    try {
      recognitionRef.current?.start();

      // Auto-stop after maxSecondsPerSegment
      if (config?.maxSecondsPerSegment) {
        timeoutRef.current = setTimeout(() => {
          if (isListening) {
            recognitionRef.current?.stop();
          }
        }, config.maxSecondsPerSegment * 1000);
      }
    } catch (err) {
      console.error('Failed to start recognition:', err);
      setError('Không thể bắt đầu nhận giọng nói. Vui lòng thử lại.');
    }
  }, [config, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const copyTranscript = async () => {
    setIsCopying(true);
    try {
      await navigator.clipboard.writeText(transcript);
    } catch (err) {
      console.error('Failed to copy:', err);
    } finally {
      setIsCopying(false);
    }
  };

  const handleClose = () => {
    stopListening();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Mic className="h-5 w-5 text-blue-600" />
            Test Microphone
          </h3>
          <button onClick={handleClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Status */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-gray-50">
            {isSupported ? (
              <>
                {isListening ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-700 font-medium">Đang nghe...</span>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <span className="text-gray-600">Sẵn sàng</span>
                  </>
                )}
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                <span className="text-red-700">Không hỗ trợ</span>
              </>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Transcript Display */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              Kết quả nhận diện
            </label>
            <div className="border rounded-lg p-3 min-h-[120px] bg-gray-50 whitespace-pre-wrap">
              {transcript ? (
                <>
                  {transcript}
                  {interimTranscript && (
                    <span className="text-gray-400">{interimTranscript}</span>
                  )}
                </>
              ) : (
                <span className="text-gray-400 italic">
                  {isListening ? 'Đang lắng nghe...' : 'Chưa có kết quả. Nhấn "Bắt đầu" để test.'}
                </span>
              )}
            </div>
          </div>

          {/* Language Info */}
          <div className="text-sm text-gray-500">
            Ngôn ngữ: <span className="font-medium">{config?.language || 'vi-VN'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t bg-gray-50">
          <Button variant="outline" onClick={handleClose}>
            Đóng
          </Button>

          {isSupported && (
            <>
              <Button
                variant="outline"
                onClick={copyTranscript}
                disabled={!transcript || isCopying}
              >
                {isCopying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                Copy
              </Button>

              {config?.pushToTalk ? (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isListening ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Dừng
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      Giữ để nói
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={isListening ? stopListening : startListening}
                  className={isListening ? 'bg-red-600 hover:bg-red-700' : ''}
                >
                  {isListening ? (
                    <>
                      <Square className="h-4 w-4 mr-1" />
                      Dừng
                    </>
                  ) : (
                    <>
                      <Mic className="h-4 w-4 mr-1" />
                      Bắt đầu
                    </>
                  )}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

