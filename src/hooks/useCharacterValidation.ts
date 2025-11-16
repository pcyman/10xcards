import { useMemo } from 'react';
import type { CharacterCountState } from '@/types';

/**
 * Hook to validate character count for AI generation input
 * @param text - Input text to validate
 * @returns CharacterCountState with count, validation state, and message
 */
export function useCharacterValidation(text: string): CharacterCountState {
  return useMemo(() => {
    const trimmedText = text.trim();
    const count = trimmedText.length;

    if (count < 1000) {
      return {
        count,
        state: 'invalid-min',
        message: 'Minimum 1,000 characters required'
      };
    } else if (count > 10000) {
      return {
        count,
        state: 'invalid-max',
        message: 'Exceeds maximum of 10,000 characters'
      };
    } else {
      return {
        count,
        state: 'valid',
        message: 'Ready to generate'
      };
    }
  }, [text]);
}
