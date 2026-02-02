/**
 * Mock for expo-blur module
 */

const React = require('react');

const BlurView = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement('View', { ...props, ref, testID: 'blur-view' }, children);
});

BlurView.displayName = 'BlurView';

module.exports = {
  BlurView,
};
