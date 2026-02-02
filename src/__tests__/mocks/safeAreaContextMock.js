/**
 * Mock for react-native-safe-area-context module
 */

const React = require('react');

const SafeAreaProvider = ({ children }) => {
  return React.createElement('View', { testID: 'safe-area-provider' }, children);
};

const SafeAreaView = React.forwardRef(({ children, edges, style, ...props }, ref) => {
  return React.createElement('View', { ...props, ref, testID: 'safe-area-view', style }, children);
});

SafeAreaView.displayName = 'SafeAreaView';

const useSafeAreaInsets = () => ({
  top: 44,
  right: 0,
  bottom: 34,
  left: 0,
});

const useSafeAreaFrame = () => ({
  x: 0,
  y: 0,
  width: 375,
  height: 812,
});

const SafeAreaInsetsContext = React.createContext({
  top: 44,
  right: 0,
  bottom: 34,
  left: 0,
});

const SafeAreaFrameContext = React.createContext({
  x: 0,
  y: 0,
  width: 375,
  height: 812,
});

const withSafeAreaInsets = (Component) => {
  return React.forwardRef((props, ref) => {
    return React.createElement(Component, {
      ...props,
      ref,
      insets: { top: 44, right: 0, bottom: 34, left: 0 },
    });
  });
};

const initialWindowMetrics = {
  insets: { top: 44, right: 0, bottom: 34, left: 0 },
  frame: { x: 0, y: 0, width: 375, height: 812 },
};

module.exports = {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  withSafeAreaInsets,
  initialWindowMetrics,
};
