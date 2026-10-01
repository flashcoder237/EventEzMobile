Pod::Spec.new do |s|
  s.name           = 'EventezNative'
  s.version        = '1.0.0'
  s.summary        = 'Ponts natifs EventEz : widgets, Live Activities, Handoff, proximité, Core Haptics.'
  s.description    = 'Module Expo local (modules/eventez-native). Voir src/index.ts.'
  s.author         = 'OverBrand'
  s.homepage       = 'https://eventez.online'
  s.license        = { :type => 'UNLICENSED' }
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Liens faibles : ActivityKit/WidgetKit n'existent pas sur les iOS anciens,
  # l'app doit continuer de démarrer (les appels sont gardés par #available).
  s.weak_frameworks = 'ActivityKit', 'WidgetKit', 'CoreHaptics'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
  s.source_files = '**/*.{h,m,swift}'
end
