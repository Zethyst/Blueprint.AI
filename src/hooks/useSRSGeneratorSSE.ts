/**
 * Custom hook for SSE-based SRS generation
 * Handles real-time progress updates from FastAPI backend
 */

import { useState, useCallback } from 'react';

export interface SRSStreamData {
  status: 'initiated' | 'processing' | 'completed' | 'error';
  message: string;
  title?: string;
  pdfName?: string;
  wordName?: string;
  pdfPath?: string;
  wordPath?: string;
  text?: string;
}

export interface SRSGenerationRequest {
  main: string;
  selectedPurpose: string;
  selectedTarget: string;
  selectedKeys: string | string[];
  selectedPlatforms: string | string[];
  selectedIntegrations: string | string[];
  selectedPerformance: string | string[];
  selectedSecurity: string | string[];
  selectedStorage: string;
  selectedEnvironment: string;
  selectedLanguage: string | string[];
}

export function useSRSGeneratorSSE() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string[]>([]);
  const [currentMessage, setCurrentMessage] = useState<string>('');
  const [result, setResult] = useState<SRSStreamData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercentage, setProgressPercentage] = useState<number>(0);

  const generateSRS = useCallback(async (formData: SRSGenerationRequest) => {
    setIsGenerating(true);
    setProgress([]);
    setCurrentMessage('');
    setResult(null);
    setError(null);
    setProgressPercentage(0);

    // Store generation start in localStorage
    localStorage.setItem('srs_generation_active', 'true');
    localStorage.setItem('srs_generation_data', JSON.stringify(formData));

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_PYTHON_BASE_URL}/generate-srs-stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Response body is null');
      }

      let buffer = '';
      let eventCount = 0;
      const totalSteps = 7; // initiated, processing (5 steps), completed

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('Stream complete');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: close')) {
            console.log('Stream closed by server');
            setIsGenerating(false);
            localStorage.removeItem('srs_generation_active');
            return;
          }

          if (line.startsWith('data: ')) {
            const data = line.substring(6);
            try {
              const parsed: SRSStreamData = JSON.parse(data);
              
              // Update progress messages
              setProgress(prev => [...prev, parsed.message]);
              setCurrentMessage(parsed.message);

              // Calculate progress percentage
              eventCount++;
              const percentage = Math.min((eventCount / totalSteps) * 100, 100);
              setProgressPercentage(percentage);

              if (parsed.status === 'completed') {
                setResult(parsed);
                setIsGenerating(false);
                setProgressPercentage(100);
                
                // Store result in localStorage
                localStorage.setItem('srs_result', JSON.stringify(parsed));
                localStorage.removeItem('srs_generation_active');
              } else if (parsed.status === 'error') {
                setError(parsed.message);
                setIsGenerating(false);
                localStorage.removeItem('srs_generation_active');
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error during SRS generation:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      setIsGenerating(false);
      localStorage.removeItem('srs_generation_active');
    }
  }, []);

  const reset = useCallback(() => {
    setIsGenerating(false);
    setProgress([]);
    setCurrentMessage('');
    setResult(null);
    setError(null);
    setProgressPercentage(0);
    localStorage.removeItem('srs_generation_active');
    localStorage.removeItem('srs_generation_data');
    localStorage.removeItem('srs_result');
  }, []);

  return {
    isGenerating,
    progress,
    currentMessage,
    result,
    error,
    progressPercentage,
    generateSRS,
    reset
  };
}

