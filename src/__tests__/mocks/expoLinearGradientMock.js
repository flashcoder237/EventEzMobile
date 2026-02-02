/**
 * Mock for expo-linear-gradient module
 */

const React = require('react');

const LinearGradient = React.forwardRef(({ children, ...props }, ref) => {
  return React.createElement('View', { ...props, ref, testID: 'linear-gradient' }, children);
});

LinearGradient.displayName = 'LinearGradient';

module.exports = {
  LinearGradient,
};
