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

const sharedPalettes = {
  ember: ['#FFF1E8', '#FFD6C2', '#FFB08A', '#FF8555', '#FF622B', '#F94A18', '#E83A0C', '#D12F08', '#AE2708', '#8C2109'],
  copper: ['#FFF3EC', '#FBE5D9', '#F3C9B1', '#EBAE8A', '#E19A72', '#D98B68', '#CE7A55', '#AD613F', '#8D4D32', '#733F2B'],
  gold: ['#FFF9E8', '#F8EDC9', '#F0DDA0', '#E6C76D', '#D8AE42', '#C29429', '#A87A16', '#8F650B', '#745009', '#5B3F07'],
  amethyst: ['#F5EEFF', '#E7D6FF', '#CEB1FF', '#B48AFF', '#9A68F0', '#824BDB', '#6D37C2', '#5B2DA8', '#492586', '#391E68'],
  teal: ['#E8F3F1', '#CFE2DE', '#A9C8C2', '#7FA9A1', '#5A877F', '#3D6D65', '#2B5A52', '#20483F', '#193B34', '#122F2A'],
  emerald: ['#E9FBF2', '#C9F3DC', '#9CE8BF', '#68D99B', '#3BC779', '#22AA60', '#168B4C', '#11723E', '#0F5C34', '#0D482B'],
};

const themeDefinitions = {
  hellbot: {
    value: 'hellbot',
    label: 'Hellbot Dark',
    scheme: 'dark',
    primaryColor: 'ember',
    colors: {
      dark: ['#F2EFED', '#D8D0CC', '#B2A6A0', '#897C75', '#594D47', '#382E29', '#211B18', '#171311', '#100D0B', '#0A0807'],
      surface: ['#F5F0ED', '#E7DDD8', '#D2C4BC', '#B7A69D', '#958177', '#594A42', '#2B211C', '#241B17', '#1D1613', '#17110F'],
      ...sharedPalettes,
    },
  },
  light: {
    value: 'light',
    label: 'Hellbot Light',
    scheme: 'light',
    primaryColor: 'ember',
    colors: {
      dark: ['#EDF0F4', '#D1D7E0', '#A5AEBB', '#7D8797', '#4B5461', '#303641', '#252B34', '#1C2027', '#14171C', '#101318'],
      surface: ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FCFCFD', '#F8F9FA', '#F1F3F5', '#E9ECEF', '#DEE2E6'],
      ...sharedPalettes,
    },
  },
  creamLight: {
    value: 'cream-light',
    label: 'Cream Light',
    scheme: 'light',
    primaryColor: 'gold',
    colors: {
      dark: ['#F8F5ED', '#E8E0D0', '#CFC3AC', '#A99B82', '#81745E', '#625641', '#493E2D', '#372F22', '#292319', '#1D1912'],
      surface: ['#FDFBF7', '#FCFAF4', '#FBF8F0', '#FAF6EB', '#F9F4E7', '#F8F2E2', '#F7F3E9', '#F0E9D9', '#E6DCC6', '#D9CCB1'],
      ...sharedPalettes,
    },
  },
  creamDark: {
    value: 'cream-dark',
    label: 'Cream Dark',
    scheme: 'dark',
    primaryColor: 'gold',
    colors: {
      dark: ['#F2ECE0', '#D9CDB3', '#B5A580', '#887957', '#5E523C', '#413829', '#2E271C', '#1B1711', '#14100B', '#0D0A07'],
      surface: ['#F2ECE0', '#E5D8BD', '#C9B58E', '#A98F60', '#806B45', '#413729', '#211B13', '#1B1711', '#15110C', '#0F0C08'],
      ...sharedPalettes,
    },
  },
  amethyst: {
    value: 'amethyst',
    label: 'Amethyst',
    scheme: 'dark',
    primaryColor: 'amethyst',
    colors: {
      dark: ['#F5F0FA', '#E0D7EA', '#BDAFCB', '#9585A8', '#665776', '#453852', '#312840', '#241C32', '#191322', '#100D18'],
      surface: ['#F5F0FA', '#E8DEF0', '#CFBFDD', '#AB98C2', '#79678F', '#49395D', '#342744', '#291F38', '#1D172B', '#151020'],
      ...sharedPalettes,
    },
  },
  emerald: {
    value: 'emerald',
    label: 'Emerald',
    scheme: 'light',
    primaryColor: 'emerald',
    colors: {
      dark: ['#F0F7F3', '#D8E5DE', '#B5C9BE', '#8CA797', '#5F7B6A', '#3F5A49', '#294634', '#1E3829', '#152A1E', '#0E1E15'],
      surface: ['#F2F8F3', '#EDF5EF', '#E7F1E9', '#E1EDE4', '#D9E8DD', '#D0E2D5', '#E6F1E8', '#DBEADF', '#CDE1D2', '#BED6C5'],
      ...sharedPalettes,
    },
  },
};

const cssVariablesResolver = () => ({
  variables: {
    '--hellbot-ai-usage-input-token-color': 'var(--mantine-primary-color-filled)',
    '--hellbot-ai-usage-output-token-color': 'var(--mantine-primary-color-3)',
    '--hellbot-surface-color': 'var(--mantine-color-surface-6)',
  },
  light: {
    '--mantine-color-body': 'var(--mantine-color-surface-0)',
  },
  dark: {},
});

export const themeOptions = [
  themeDefinitions.hellbot,
  themeDefinitions.creamDark,
  themeDefinitions.amethyst,
  themeDefinitions.light,
  themeDefinitions.creamLight,
  themeDefinitions.emerald,
];

export function getThemePreviewColors(themeName) {
  const definition = Object.values(themeDefinitions).find((theme) => theme.value === themeName)
    || themeDefinitions.hellbot;
  const { colors, scheme, primaryColor } = definition;
  const light = scheme === 'light';
  const canvas = light ? colors.surface[0] : colors.dark[7];

  return {
    canvas,
    sidebar: light ? colors.surface[0] : colors.surface[6],
    surface: colors.surface[6],
    border: light ? colors.dark[1] : colors.dark[4],
    text: light ? colors.dark[6] : colors.dark[0],
    muted: light ? colors.dark[3] : colors.dark[2],
    accent: colors[primaryColor][7],
    active: light
      ? colors[primaryColor][0]
      : `color-mix(in srgb, ${colors[primaryColor][9]} 35%, ${canvas})`,
  };
}

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
      ...selectedTheme.colors,
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
