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
  const Screen = ({ name, options }: { name: string; options?: { tabBarIcon?: (p: object) => unknown } }) =>
    React.createElement(
      View,
      { testID: `screen-${name}` },
      options?.tabBarIcon?.({ color: '#fff', focused: false, size: 20 }),
    );
  const Navigator = ({ children }: { children?: unknown }) => React.createElement(View, null, children);
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn() },
    useLocalSearchParams: jest.fn(() => ({})),
    Redirect: ({ href }: { href: string }) => React.createElement(Text, null, `redirect:${href}`),
    Stack: Object.assign(Navigator, { Screen }),
    Tabs: Object.assign(Navigator, { Screen }),
  };
});

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
