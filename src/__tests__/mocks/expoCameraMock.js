/**
 * Mock for expo-camera module
 */

const React = require('react');

const CameraView = React.forwardRef(({ children, onBarcodeScanned, ...props }, ref) => {
  return React.createElement('View', { ...props, ref, testID: 'camera-view' }, children);
});

CameraView.displayName = 'CameraView';

const Camera = React.forwardRef(({ children, onBarCodeScanned, ...props }, ref) => {
  return React.createElement('View', { ...props, ref, testID: 'camera' }, children);
});

Camera.displayName = 'Camera';

// Static constants
Camera.Constants = {
  Type: {
    front: 'front',
    back: 'back',
  },
  FlashMode: {
    off: 'off',
    on: 'on',
    auto: 'auto',
    torch: 'torch',
  },
  AutoFocus: {
    on: 'on',
    off: 'off',
  },
  WhiteBalance: {
    auto: 'auto',
    sunny: 'sunny',
    cloudy: 'cloudy',
    shadow: 'shadow',
    fluorescent: 'fluorescent',
    incandescent: 'incandescent',
  },
};

const useCameraPermissions = () => [
  { granted: true, status: 'granted', canAskAgain: true },
  jest.fn(() => Promise.resolve({ granted: true, status: 'granted' })),
];

const requestCameraPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true, status: 'granted' })
);

const getCameraPermissionsAsync = jest.fn(() =>
  Promise.resolve({ granted: true, status: 'granted' })
);

module.exports = {
  CameraView,
  Camera,
  useCameraPermissions,
  requestCameraPermissionsAsync,
  getCameraPermissionsAsync,
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
};
