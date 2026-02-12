/**
 * Mock for expo-location module
 */

module.exports = {
  requestForegroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestBackgroundPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getCurrentPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 3.8667,
      longitude: 11.5167,
      altitude: 750,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  })),
  getLastKnownPositionAsync: jest.fn(() => Promise.resolve({
    coords: {
      latitude: 3.8667,
      longitude: 11.5167,
      altitude: 750,
      accuracy: 5,
      altitudeAccuracy: 5,
      heading: 0,
      speed: 0,
    },
    timestamp: Date.now(),
  })),
  watchPositionAsync: jest.fn(() => Promise.resolve({ remove: jest.fn() })),
  geocodeAsync: jest.fn(() => Promise.resolve([{
    latitude: 3.8667,
    longitude: 11.5167,
  }])),
  reverseGeocodeAsync: jest.fn(() => Promise.resolve([{
    city: 'Douala',
    country: 'Cameroon',
    district: null,
    isoCountryCode: 'CM',
    name: 'Test Address',
    postalCode: null,
    region: 'Centre',
    street: 'Test Street',
    streetNumber: '123',
    subregion: null,
    timezone: null,
  }])),
  hasServicesEnabledAsync: jest.fn(() => Promise.resolve(true)),
  enableNetworkProviderAsync: jest.fn(() => Promise.resolve()),
  LocationAccuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  Accuracy: {
    Lowest: 1,
    Low: 2,
    Balanced: 3,
    High: 4,
    Highest: 5,
    BestForNavigation: 6,
  },
  PermissionStatus: {
    UNDETERMINED: 'undetermined',
    GRANTED: 'granted',
    DENIED: 'denied',
  },
};
