import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../../contexts/AuthContext';
import { usersAPI } from '../../api/client';
import { RootStackParamList } from '../../types';
import {
  Colors,
  FontSizes,
  FontWeights,
  BorderRadius,
  Spacing,
} from '../../constants/theme';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SettingItem {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  isToggle?: boolean;
  destructive?: boolean;
}

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, logout, updateUser } = useAuth();

  const [emailNotifications, setEmailNotifications] = useState(
    user?.email_notifications ?? true
  );
  const [pushNotifications, setPushNotifications] = useState(
    user?.push_notifications ?? true
  );
  const [smsNotifications, setSmsNotifications] = useState(
    user?.sms_notifications ?? false
  );

  const handleToggleNotification = async (
    type: 'email' | 'push' | 'sms',
    value: boolean
  ) => {
    try {
      const updateData: Record<string, boolean> = {};

      switch (type) {
        case 'email':
          setEmailNotifications(value);
          updateData.email_notifications = value;
          break;
        case 'push':
          setPushNotifications(value);
          updateData.push_notifications = value;
          break;
        case 'sms':
          setSmsNotifications(value);
          updateData.sms_notifications = value;
          break;
      }

      await usersAPI.updateCurrentUser(updateData);
      updateUser({ ...user, ...updateData } as any);
    } catch (error) {
      console.error('Erreur mise à jour notifications:', error);
      // Revert
      switch (type) {
        case 'email':
          setEmailNotifications(!value);
          break;
        case 'push':
          setPushNotifications(!value);
          break;
        case 'sms':
          setSmsNotifications(!value);
          break;
      }
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: logout,
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Supprimer le compte',
      'Cette action est irréversible. Toutes vos données seront supprimées définitivement.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            // TODO: Implement account deletion
            Alert.alert('Info', 'Contactez le support pour supprimer votre compte.');
          },
        },
      ]
    );
  };

  const sections: { title: string; items: SettingItem[] }[] = [
    {
      title: 'Compte',
      items: [
        {
          icon: 'person-outline',
          title: 'Modifier le profil',
          subtitle: 'Nom, photo, informations',
          onPress: () => navigation.navigate('EditProfile'),
        },
        {
          icon: 'lock-closed-outline',
          title: 'Mot de passe',
          subtitle: 'Changer votre mot de passe',
          onPress: () => Alert.alert('Info', 'Cette fonctionnalité sera bientôt disponible'),
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'mail-outline',
          title: 'Notifications email',
          subtitle: 'Recevoir les mises à jour par email',
          isToggle: true,
          value: emailNotifications,
          onToggle: (value) => handleToggleNotification('email', value),
        },
        {
          icon: 'notifications-outline',
          title: 'Notifications push',
          subtitle: 'Recevoir les notifications sur votre appareil',
          isToggle: true,
          value: pushNotifications,
          onToggle: (value) => handleToggleNotification('push', value),
        },
        {
          icon: 'chatbubble-outline',
          title: 'Notifications SMS',
          subtitle: 'Recevoir les rappels par SMS',
          isToggle: true,
          value: smsNotifications,
          onToggle: (value) => handleToggleNotification('sms', value),
        },
      ],
    },
    {
      title: 'Application',
      items: [
        {
          icon: 'language-outline',
          title: 'Langue',
          subtitle: 'Français',
          onPress: () => Alert.alert('Info', 'Langue française uniquement'),
        },
        {
          icon: 'information-circle-outline',
          title: 'À propos',
          subtitle: 'Version 1.0.0',
          onPress: () => {},
        },
        {
          icon: 'document-text-outline',
          title: 'Conditions d\'utilisation',
          onPress: () => Alert.alert('Info', 'Consulter les CGU'),
        },
        {
          icon: 'shield-outline',
          title: 'Politique de confidentialité',
          onPress: () => Alert.alert('Info', 'Consulter la politique de confidentialité'),
        },
      ],
    },
    {
      title: 'Danger',
      items: [
        {
          icon: 'log-out-outline',
          title: 'Déconnexion',
          onPress: handleLogout,
          destructive: true,
        },
        {
          icon: 'trash-outline',
          title: 'Supprimer le compte',
          subtitle: 'Cette action est irréversible',
          onPress: handleDeleteAccount,
          destructive: true,
        },
      ],
    },
  ];

  const renderSettingItem = (item: SettingItem, index: number, total: number) => (
    <TouchableOpacity
      key={item.title}
      style={[
        styles.settingItem,
        index === 0 && styles.settingItemFirst,
        index === total - 1 && styles.settingItemLast,
      ]}
      onPress={item.onPress}
      disabled={item.isToggle}
      activeOpacity={item.isToggle ? 1 : 0.7}
    >
      <View style={[
        styles.settingIcon,
        item.destructive && styles.settingIconDestructive,
      ]}>
        <Ionicons
          name={item.icon}
          size={20}
          color={item.destructive ? Colors.error : Colors.gray700}
        />
      </View>
      <View style={styles.settingContent}>
        <Text style={[
          styles.settingTitle,
          item.destructive && styles.settingTitleDestructive,
        ]}>
          {item.title}
        </Text>
        {item.subtitle && (
          <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
        )}
      </View>
      {item.isToggle ? (
        <Switch
          value={item.value}
          onValueChange={item.onToggle}
          trackColor={{ false: Colors.gray200, true: Colors.primaryLight }}
          thumbColor={item.value ? Colors.primary : Colors.gray400}
        />
      ) : (
        !item.destructive && (
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        )
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) =>
                renderSettingItem(item, index, section.items.length)
              )}
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray50,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },
  section: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
    color: Colors.gray500,
    textTransform: 'uppercase',
    marginBottom: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  sectionContent: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray100,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  settingItemFirst: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  settingItemLast: {
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
    borderBottomWidth: 0,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingIconDestructive: {
    backgroundColor: Colors.errorLight,
  },
  settingContent: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  settingTitle: {
    fontSize: FontSizes.base,
    fontWeight: FontWeights.medium,
    color: Colors.gray900,
  },
  settingTitleDestructive: {
    color: Colors.error,
  },
  settingSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.gray500,
    marginTop: 2,
  },
});
