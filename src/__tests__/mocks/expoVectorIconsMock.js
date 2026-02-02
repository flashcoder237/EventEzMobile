/**
 * Mock for @expo/vector-icons module
 */

const React = require('react');

const createMockIcon = (name) => {
  const MockIcon = React.forwardRef((props, ref) => {
    return React.createElement('Text', {
      ...props,
      ref,
      testID: `icon-${props.name || name}`,
      children: props.name || name,
    });
  });
  MockIcon.displayName = name;
  return MockIcon;
};

module.exports = {
  Ionicons: createMockIcon('Ionicons'),
  MaterialIcons: createMockIcon('MaterialIcons'),
  FontAwesome: createMockIcon('FontAwesome'),
  FontAwesome5: createMockIcon('FontAwesome5'),
  Feather: createMockIcon('Feather'),
  MaterialCommunityIcons: createMockIcon('MaterialCommunityIcons'),
  AntDesign: createMockIcon('AntDesign'),
  Entypo: createMockIcon('Entypo'),
  EvilIcons: createMockIcon('EvilIcons'),
  Foundation: createMockIcon('Foundation'),
  Octicons: createMockIcon('Octicons'),
  SimpleLineIcons: createMockIcon('SimpleLineIcons'),
  Zocial: createMockIcon('Zocial'),
  createIconSet: jest.fn(() => createMockIcon('CustomIcon')),
  createIconSetFromFontello: jest.fn(() => createMockIcon('FontelloIcon')),
  createIconSetFromIcoMoon: jest.fn(() => createMockIcon('IcoMoonIcon')),
};
