/**
 * Mock for react-native-webview module
 */

const React = require('react');

const WebView = React.forwardRef(({ source, onMessage, onLoad, onError, ...props }, ref) => {
  return React.createElement('View', {
    ...props,
    ref,
    testID: 'webview',
    'data-source': JSON.stringify(source),
  });
});

WebView.displayName = 'WebView';

module.exports = {
  WebView,
  default: WebView,
};
