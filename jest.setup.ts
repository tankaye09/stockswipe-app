import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
jest.mock('expo-haptics', () => ({ selectionAsync: jest.fn(() => Promise.resolve()) }));

beforeEach(async () => {
  await mockAsyncStorage.clear();
});

// Screens are tested without the real navigator; e2e flows cover real navigation.
jest.mock('expo-router', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const Screen = ({ name, options }: { name: string; options?: { title?: string } }) =>
    React.createElement(View, { testID: `screen-${name}`, accessibilityLabel: options?.title });
  const Navigator = ({ children }: { children?: unknown }) => React.createElement(View, null, children);
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    DarkTheme: { colors: {} },
    ThemeProvider: ({ children }: { children?: unknown }) => children,
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `redirect:${href}`),
    Stack: Object.assign(Navigator, { Screen }),
    Tabs: Object.assign(Navigator, { Screen }),
  };
});

type MockIconPair = string | { default?: string; selected: string };

// Native tabs render each trigger as a plain view showing its icon names and label.
jest.mock('expo-router/native-tabs', () => {
  const React = require('react');
  const { Text, View } = require('react-native');
  const show = (icon: MockIconPair) => (typeof icon === 'string' ? icon : `${icon.default}/${icon.selected}`);
  const Trigger = ({ name, testID, children }: { name: string; testID?: string; children?: unknown }) =>
    React.createElement(View, { testID: `screen-${name}`, accessibilityHint: testID }, children);
  const Icon = ({ sf, md }: { sf: MockIconPair; md: MockIconPair }) =>
    React.createElement(Text, null, `sf:${show(sf)} md:${show(md)}`);
  const Label = ({ children }: { children?: string }) => React.createElement(Text, null, children);
  const NativeTabs = ({ children }: { children?: unknown }) => React.createElement(View, null, children);
  return { NativeTabs: Object.assign(NativeTabs, { Trigger: Object.assign(Trigger, { Icon, Label }) }) };
});

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
