/**
 * Ouvre « Favoris » quel que soit le profil.
 *
 * Pour qui a du travail d'organisation, l'onglet « Favoris » est REMPLACÉ par
 * « Organiser » (cf. MainTabNavigator) : `navigate('Main', { screen: 'Saved' })`
 * visait alors un onglet inexistant et ne faisait RIEN. On ouvre dans ce cas le
 * même écran empilé (`SavedEvents`), avec retour.
 */
import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useOrganizerRole } from './useOrganizerRole';

export function useGoToSaved() {
  const navigation = useNavigation<any>();
  const { hasOrganizerWork } = useOrganizerRole();
  return useCallback(() => {
    if (hasOrganizerWork) {
      navigation.navigate('SavedEvents');
    } else {
      navigation.navigate('Main', { screen: 'Saved' });
    }
  }, [navigation, hasOrganizerWork]);
}
