import { useEffect } from 'react';

/**
 * Hook to prompt user confirmation when navigating away with unsaved content
 * @param shouldWarn - Whether to show the warning prompt
 */
export function useNavigationGuard(shouldWarn: boolean): void {
  useEffect(() => {
    if (!shouldWarn) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requires returnValue to be set
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [shouldWarn]);
}
