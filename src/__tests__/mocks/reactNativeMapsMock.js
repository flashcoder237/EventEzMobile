/**
 * Mock for react-native-maps module
 */

const React = require('react');

const MapView = ({ children, ...props }) => {
  return React.createElement('MapView', props, children);
};

MapView.Marker = ({ children, ...props }) => {
  return React.createElement('Marker', props, children);
};

MapView.Callout = ({ children, ...props }) => {
  return React.createElement('Callout', props, children);
};

MapView.Polyline = (props) => {
  return React.createElement('Polyline', props);
};

MapView.Polygon = (props) => {
  return React.createElement('Polygon', props);
};

MapView.Circle = (props) => {
  return React.createElement('Circle', props);
};

module.exports = {
  __esModule: true,
  default: MapView,
  Marker: MapView.Marker,
  Callout: MapView.Callout,
  Polyline: MapView.Polyline,
  Polygon: MapView.Polygon,
  Circle: MapView.Circle,
  PROVIDER_GOOGLE: 'google',
  PROVIDER_DEFAULT: null,
  MAP_TYPES: {
    STANDARD: 'standard',
    SATELLITE: 'satellite',
    HYBRID: 'hybrid',
    TERRAIN: 'terrain',
    NONE: 'none',
    MUTEDSTANDARD: 'mutedStandard',
  },
  Animated: MapView,
  AnimatedRegion: jest.fn(),
  enableLatestRenderer: jest.fn(),
};
