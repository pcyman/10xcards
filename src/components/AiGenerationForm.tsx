import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { CharacterCounter } from '@/components/CharacterCounter';
import { LoadingScreen } from '@/components/LoadingScreen';
import { useCharacterValidation } from '@/hooks/useCharacterValidation';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { toast } from 'sonner';
import type { AiGenerationFormProps, GenerateFlashcardsCommand, GenerateFlashcardsResponseDTO } from '@/types';

/**
 * Primary React component managing the flashcard generation form
 * Handles text input, real-time character validation, form submission,
 * and navigation to review view
 */
export function AiGenerationForm({ deckId, deckName }: AiGenerationFormProps) {
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const characterCount = useCharacterValidation(inputText);
  useNavigationGuard(inputText.length > 0 && !isGenerating);

  const handleGenerate = async (text: string) => {
    setIsGenerating(true);
    setError(null);
    abortController.current = new AbortController();

    try {
      // Get session from localStorage
      const sessionData = localStorage.getItem('session');
      if (!sessionData) {
        toast.error('Session expired. Please log in again.');
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      const session = JSON.parse(sessionData);
      const accessToken = session.access_token;

      const response = await fetch(`/api/decks/${deckId}/flashcards/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ text } as GenerateFlashcardsCommand),
        signal: abortController.current.signal
      });

      if (response.status === 401) {
        toast.error('Session expired. Please log in again.');
        localStorage.removeItem('session');
        window.location.href = `/login?returnTo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }

      if (response.status === 404) {
        toast.error('Deck not found or access denied');
        window.location.href = '/decks';
        return;
      }

      if (response.status === 503) {
        toast.error('AI service temporarily unavailable, please try again later', {
          duration: 5000,
        });
        setIsGenerating(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Generation failed, please try again');
      }

      const data: GenerateFlashcardsResponseDTO = await response.json();

      // Store candidates in sessionStorage
      sessionStorage.setItem(
        `flashcard-candidates-${deckId}`,
        JSON.stringify(data.candidates)
      );

      // Navigate to review view
      window.location.href = `/decks/${deckId}/review`;

    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          // Request was cancelled by user
          return;
        }

        if (err.message.includes('fetch')) {
          setError('Network error. Please check your connection and try again.');
          toast.error('Network error. Please check your connection and try again.');
        } else {
          setError(err.message);
          toast.error(err.message);
        }
      } else {
        setError('An unexpected error occurred');
        toast.error('An unexpected error occurred');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (characterCount.state !== 'valid') return;

    await handleGenerate(inputText);
  };

  const handleCancel = () => {
    if (inputText.length > 0 && !isGenerating) {
      if (!confirm('Discard unsaved text?')) return;
    }

    window.location.href = `/decks/${deckId}`;
  };

  const handleCancelGeneration = () => {
    abortController.current?.abort();
    setIsGenerating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (characterCount.state === 'valid') {
        handleSubmit(e as any);
      }
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Generate Flashcards</h1>
          <p className="text-gray-600">for {deckName}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="input-text" className="text-lg mb-2">
              Paste your study material
            </Label>
            <p className="text-sm text-gray-600 mb-3">
              Enter text between 1,000 and 10,000 characters. The AI will analyze your content and generate flashcards.
            </p>
            <Textarea
              id="input-text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Paste your study material here (1000-10000 characters)..."
              className="min-h-[300px] resize-y"
              autoFocus
              disabled={isGenerating}
            />
            <div className="mt-2">
              <CharacterCounter
                count={characterCount.count}
                state={characterCount.state}
                message={characterCount.message}
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              aria-live="polite"
              className="p-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg"
            >
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={characterCount.state !== 'valid' || isGenerating}
            >
              Generate Flashcards
            </Button>
          </div>

          <div className="text-sm text-gray-500 text-center">
            Tip: Press Ctrl+Enter (Cmd+Enter on Mac) to submit
          </div>
        </form>
      </div>

      {isGenerating && <LoadingScreen onCancel={handleCancelGeneration} />}
    </>
  );
}
