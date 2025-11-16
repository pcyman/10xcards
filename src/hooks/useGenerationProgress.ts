import { useState, useEffect } from 'react';

/**
 * Hook to rotate through progress messages during AI generation
 * @returns Current progress message string
 */
export function useGenerationProgress(): string {
  const messages = [
    "Analyzing your text...",
    "Generating flashcards...",
    "Almost done..."
  ];

  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % messages.length);
    }, 4000); // Rotate every 4 seconds

    return () => clearInterval(interval);
  }, [messages.length]);

  return messages[messageIndex];
}
