/**
 * TourTarget — wrap un element pour qu'il puisse etre spotlight par le tour.
 *
 * Usage :
 *   <TourTarget id="tab-discover">
 *     <MyTabButton />
 *   </TourTarget>
 *
 * Le wrapper enregistre le ref de la View dans le FeatureTourContext.
 * Le ref est utilise par TourOverlay pour mesurer la position via measureInWindow.
 *
 * Note : on rend une View transparente autour, qui ne change rien au layout
 * (display: contents-style impossible en RN, mais on utilise collapsable={false}
 * pour s'assurer que la View existe bien au natif et peut etre mesuree).
 */

import React, { useEffect, useRef } from 'react';
import { View, ViewProps, StyleProp, ViewStyle } from 'react-native';
import { useTour } from './FeatureTourContext';

interface TourTargetProps extends Omit<ViewProps, 'children'> {
  id: string;
  children: React.ReactNode;
  /** Style applique au wrapper. Default: pas de style — le wrapper est transparent. */
  style?: StyleProp<ViewStyle>;
}

export default function TourTarget({ id, children, style, ...rest }: TourTargetProps) {
  const ref = useRef<View | null>(null);
  const { __register, __unregister } = useTour();

  useEffect(() => {
    __register(id, { ref });
    return () => {
      __unregister(id);
    };
  }, [id, __register, __unregister]);

  return (
    <View ref={ref} collapsable={false} style={style} {...rest}>
      {children}
    </View>
  );
}
