/**
 * Mock for expo-image-picker module
 */

module.exports = {
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file:///mock/image.jpg',
          width: 800,
          height: 600,
          type: 'image',
          fileName: 'image.jpg',
          fileSize: 12345,
        },
      ],
    })
  ),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({
      canceled: false,
      assets: [
        {
          uri: 'file:///mock/camera.jpg',
          width: 800,
          height: 600,
          type: 'image',
          fileName: 'camera.jpg',
          fileSize: 12345,
        },
      ],
    })
  ),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  requestCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  getCameraPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted', granted: true })
  ),
  MediaTypeOptions: {
    All: 'All',
    Videos: 'Videos',
    Images: 'Images',
  },
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  UIImagePickerControllerQualityType: {
    High: 0,
    Medium: 1,
    Low: 2,
    VGA640x480: 3,
    IFrame1280x720: 4,
    IFrame960x540: 5,
  },
  UIImagePickerPresentationStyle: {
    FullScreen: 0,
    PageSheet: 1,
    FormSheet: 2,
    CurrentContext: 3,
    Custom: 4,
    OverFullScreen: 5,
    OverCurrentContext: 6,
    Popover: 7,
    BlurOverFullScreen: 8,
    Automatic: -1,
  },
};
