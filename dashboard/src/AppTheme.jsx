import { createContext, useContext, useMemo, useState } from 'react';
import { createTheme, MantineProvider } from '@mantine/core';

const THEME_STORAGE_KEY = 'hellbot-dashboard-theme';
const FONT_STORAGE_KEY = 'hellbot-dashboard-font';

const sharedTheme = {
  defaultRadius: 'md',
  headings: { fontWeight: '650' },
  components: {
    Button: { defaultProps: { fw: 600 } },
    Paper: { defaultProps: { radius: 'md' } },
    Input: { defaultProps: { size: 'sm' } },
  },
};

const darkPalettes = {
  hellbot: ['#F2EFED', '#D8D0CC', '#B2A6A0', '#897C75', '#594D47', '#382E29', '#211B18', '#171311', '#100D0B', '#0A0807'],
};

const accentPalettes = {
  ember: ['#FFF1E8', '#FFD6C2', '#FFB08A', '#FF8555', '#FF622B', '#F94A18', '#E83A0C', '#D12F08', '#AE2708', '#8C2109'],
  copper: ['#FFF3EC', '#FBE5D9', '#F3C9B1', '#EBAE8A', '#E19A72', '#D98B68', '#CE7A55', '#AD613F', '#8D4D32', '#733F2B'],
};

const surfacePalettes = {
  hellbot: ['#F5F0ED', '#E7DDD8', '#D2C4BC', '#B7A69D', '#958177', '#594A42', '#2B211C', '#241B17', '#1D1613', '#17110F'],
};

const cssVariablesResolver = () => ({
  variables: {
    '--hellbot-ai-usage-input-token-color': 'var(--mantine-primary-color-filled)',
    '--hellbot-ai-usage-output-token-color': 'var(--mantine-primary-color-3)',
  },
  light: {
    '--hellbot-surface-color': 'var(--mantine-color-gray-0)',
  },
  dark: {
    '--hellbot-surface-color': 'var(--mantine-color-surface-6)',
  },
});

export const themeOptions = [
  { value: 'hellbot', label: 'Hellbot Dark', scheme: 'dark', primaryColor: 'ember' },
  { value: 'light', label: 'Hellbot Light', scheme: 'light', primaryColor: 'ember' },
];

export const fontOptions = [
  { value: 'system', label: 'System UI', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { value: 'manrope', label: 'Manrope', family: 'Manrope, system-ui, sans-serif' },
  { value: 'georgia', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
];

const ThemeContext = createContext(null);

function readPreference(key, options, fallback) {
  try {
    const storedValue = window.localStorage.getItem(key);
    return options.some((option) => option.value === storedValue) ? storedValue : fallback;
  } catch {
    return fallback;
  }
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used inside AppThemeProvider.');
  return context;
}

export function AppThemeProvider({ children }) {
  const [themeName, setThemeName] = useState(() => readPreference(THEME_STORAGE_KEY, themeOptions, 'hellbot'));
  const [fontName, setFontName] = useState(() => readPreference(FONT_STORAGE_KEY, fontOptions, 'system'));
  const selectedTheme = themeOptions.find((option) => option.value === themeName) || themeOptions[0];
  const selectedFont = fontOptions.find((option) => option.value === fontName) || fontOptions[0];
  const theme = useMemo(() => createTheme({
    ...sharedTheme,
    fontFamily: selectedFont.family,
    headings: { ...sharedTheme.headings, fontFamily: selectedFont.family },
    primaryColor: selectedTheme.primaryColor,
    primaryShade: 7,
    colors: {
      dark: darkPalettes[selectedTheme.value] || darkPalettes.hellbot,
      copper: accentPalettes.copper,
      ember: accentPalettes.ember,
      surface: surfacePalettes.hellbot,
    },
  }), [selectedFont, selectedTheme]);
  const contextValue = useMemo(() => ({
    themeName,
    fontName,
    setThemeName: (value) => {
      if (!themeOptions.some((option) => option.value === value)) return;
      setThemeName(value);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, value);
      } catch {
        // Keep the selected theme for this session when storage is unavailable.
      }
    },
    setFontName: (value) => {
      if (!fontOptions.some((option) => option.value === value)) return;
      setFontName(value);
      try {
        window.localStorage.setItem(FONT_STORAGE_KEY, value);
      } catch {
        // Keep the selected font for this session when storage is unavailable.
      }
    },
  }), [fontName, themeName]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MantineProvider
        theme={theme}
        cssVariablesResolver={cssVariablesResolver}
        forceColorScheme={selectedTheme.scheme}
      >
        {children}
      </MantineProvider>
    </ThemeContext.Provider>
  );
}
