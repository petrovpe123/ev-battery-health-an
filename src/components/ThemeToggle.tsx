import { useEffect, useState } from 'react';
import { Moon, Sun } from '@phosphor-icons/react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === 'dark';
  const accessibleLabel = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  return (
    <Button
      type="button"
      variant="outline"
      className="gap-2"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={accessibleLabel}
      aria-pressed={isDark}
      title={accessibleLabel}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  );
}
