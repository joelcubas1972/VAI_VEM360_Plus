import 'react-native-maps-directions';

declare module 'react-native-maps-directions' {
  export interface MapViewDirectionsProps {
    alternativeRoutes?: boolean;
  }
}