import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '../ui/LoadingOverlay';
import { MapMarker } from '../../types';

interface WebViewMapProps {
  markers: MapMarker[];
  userLocation?: { lat: number; lng: number } | null;
  selectedMarkerId?: string | null;
  onMarkerPress?: (marker: MapMarker) => void;
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta?: number;
    longitudeDelta?: number;
  };
  radiusKm?: number;
  showRadius?: boolean;
  isDark?: boolean;
}

// Category → color mapping
const CATEGORY_COLORS: Record<string, string> = {
  music: '#4F46E5',
  musique: '#4F46E5',
  sport: '#10B981',
  art: '#F59E0B',
  food: '#EF4444',
  cuisine: '#EF4444',
  gastronomie: '#EF4444',
  tech: '#3B82F6',
  technologie: '#3B82F6',
  business: '#6366F1',
  affaires: '#6366F1',
};

function getZoomFromRadius(radius: number): number {
  if (radius <= 0) return 10;
  if (radius <= 5) return 13;
  if (radius <= 10) return 12;
  if (radius <= 25) return 11;
  if (radius <= 50) return 10;
  if (radius <= 100) return 9;
  if (radius <= 200) return 8;
  return 7;
}

export default function WebViewMap({
  markers,
  userLocation,
  selectedMarkerId,
  onMarkerPress,
  initialRegion,
  radiusKm = 0,
  showRadius = false,
  isDark = false,
}: WebViewMapProps) {
  const { t } = useTranslation();
  // F5 — transmis à la WebView : ses animations CSS (pop, halo, cascade)
  // sont coupées si l'utilisateur a réduit les animations du système.
  const reduceMotion = useReducedMotion();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapReadyRef = useRef(false);
  const pendingMessagesRef = useRef<string[]>([]);

  const centerLat = initialRegion?.latitude || userLocation?.lat || 3.848;
  const centerLng = initialRegion?.longitude || userLocation?.lng || 11.502;

  const zoom = radiusKm > 0
    ? getZoomFromRadius(radiusKm)
    : initialRegion?.latitudeDelta
      ? Math.round(10 - Math.log2(initialRegion.latitudeDelta))
      : 10;

  // Send message to WebView, queue if not ready
  const sendToWebView = useCallback((msg: object) => {
    const json = JSON.stringify(msg);
    if (mapReadyRef.current && webViewRef.current) {
      webViewRef.current.postMessage(json);
    } else {
      pendingMessagesRef.current.push(json);
    }
  }, []);

  // Flush queued messages once map is ready
  const flushPending = useCallback(() => {
    if (webViewRef.current) {
      for (const msg of pendingMessagesRef.current) {
        webViewRef.current.postMessage(msg);
      }
    }
    pendingMessagesRef.current = [];
  }, []);

  // HTML generated once (or when isDark changes)
  const yourPositionLabel = t('componentsMaps.yourPosition');
  const htmlContent = useMemo(() => {
    // Les fonds CARTO exigent désormais une clé API (sinon chaque tuile est
    // une image « API KEY REQUIRED ») : OSM dans les deux thèmes, assombri en
    // mode sombre par un filtre CSS sur la classe map-tiles-dark.
    const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const tileAttrib = '&copy; OpenStreetMap';
    const tileClass = isDark ? 'map-tiles-dark' : '';
    const clusterBase = isDark ? '#818CF8' : '#4F46E5';
    const safeYourPosition = JSON.stringify(yourPositionLabel);

    return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.Default.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .map-tiles-dark { filter: invert(1) hue-rotate(180deg) brightness(.95) contrast(.9); }

    .leaflet-tooltip {
      background: ${isDark ? '#111827' : 'white'};
      color: ${isDark ? '#D1D5DB' : '#111827'};
      border: none;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      padding: 6px 12px;
      font-weight: 500;
    }
    .radius-label {
      background: transparent;
      border: none;
      box-shadow: none;
      color: ${clusterBase};
      font-weight: 600;
      font-size: 12px;
    }

    /* Enriched marker pills */
    .ev-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      white-space: nowrap;
      border: 2px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      cursor: pointer;
    }
    .ev-marker { position: relative; }
    .ev-marker-selected {
      transform: scale(1.25);
      border-width: 3px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.35);
      z-index: 1000 !important;
      animation: evPop .32s cubic-bezier(.22,1,.36,1);
    }
    @keyframes evPop { 0% { transform: scale(1); } 55% { transform: scale(1.35); } 100% { transform: scale(1.25); } }
    /* Halo en dégradé qui fait deux tours autour du marqueur choisi. */
    @property --ev-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
    .ev-marker-selected::after {
      content: '';
      position: absolute;
      inset: -6px;
      border-radius: 24px;
      padding: 2px;
      background: conic-gradient(from var(--ev-a), #4F46E5, #A855F7, #FF6B6B, #4F46E5);
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      pointer-events: none;
      animation: evSpin 1s linear 2, evHaloOut .4s ease 2s forwards;
    }
    @keyframes evSpin { to { --ev-a: 360deg; } }
    @keyframes evHaloOut { to { opacity: 0; } }
    /* Apparition en cascade après un chargement (20 premiers seulement). */
    .ev-marker-in { animation: evIn .36s cubic-bezier(.22,1,.36,1) backwards; }
    @keyframes evIn { from { opacity: 0; transform: scale(.6) translateY(4px); } }
    .rm .ev-marker, .rm .ev-marker::after { animation: none !important; }
    .rm .ev-marker-selected::after { display: none; }
    @media (prefers-reduced-motion: reduce) {
      .ev-marker, .ev-marker::after { animation: none !important; }
      .ev-marker-selected::after { display: none; }
    }
    /* V7 — en direct : halo corail lent (10 marqueurs au plus, seule boucle
       de la carte, coupée par « réduire les animations »). */
    .ev-marker-live::before {
      content: '';
      position: absolute;
      inset: -4px;
      border-radius: 24px;
      box-shadow: 0 0 0 0 rgba(255,107,107,.55);
      pointer-events: none;
      animation: evLive 2.4s cubic-bezier(.23,1,.32,1) infinite;
    }
    @keyframes evLive { 0% { box-shadow: 0 0 0 0 rgba(255,107,107,.55); } 100% { box-shadow: 0 0 0 12px rgba(255,107,107,0); } }
    .ev-marker-live-static { box-shadow: 0 0 0 3px rgba(255,107,107,.45), 0 2px 6px rgba(0,0,0,0.25); }
    /* « Ce soir » : contour corail fin, sans mouvement. */
    .ev-marker-tonight { outline: 2px solid #FF6B6B; outline-offset: 2px; }
    .rm .ev-marker-live::before { animation: none !important; display: none; }
    @media (prefers-reduced-motion: reduce) {
      .ev-marker-live::before { animation: none !important; display: none; }
    }
    .ev-marker-outside {
      opacity: 0.45;
      filter: saturate(0.3);
    }
    /* Markers sans label (events gratuits) : pastille compacte 14x14 */
    .ev-marker:empty {
      width: 14px;
      height: 14px;
      padding: 0;
      border-radius: 50%;
    }

    /* Cluster styles */
    .marker-cluster-small {
      background-color: ${clusterBase}33;
    }
    .marker-cluster-small div {
      background-color: ${clusterBase};
      color: #fff;
      font-weight: 700;
    }
    .marker-cluster-medium {
      background-color: ${clusterBase}55;
    }
    .marker-cluster-medium div {
      background-color: ${clusterBase};
      color: #fff;
      font-weight: 700;
    }
    .marker-cluster-large {
      background-color: ${clusterBase}77;
    }
    .marker-cluster-large div {
      background-color: ${clusterBase};
      color: #fff;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var CATEGORY_COLORS = ${JSON.stringify(CATEGORY_COLORS)};
    var DEFAULT_COLOR = '${clusterBase}';

    var map = L.map('map', {
      center: [${centerLat}, ${centerLng}],
      zoom: ${zoom},
      zoomControl: true
    });

    L.tileLayer('${tileUrl}', { attribution: '${tileAttrib}', className: '${tileClass}' }).addTo(map);

    var clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function(cluster) {
        var count = cluster.getChildCount();
        var size = count < 10 ? 'small' : count < 50 ? 'medium' : 'large';
        return L.divIcon({
          html: '<div>' + count + '</div>',
          className: 'marker-cluster marker-cluster-' + size,
          iconSize: L.point(40, 40)
        });
      }
    });
    map.addLayer(clusterGroup);

    var radiusCircle = null;
    var radiusLabel = null;
    var userMarker = null;
    var currentMarkers = {};
    var currentSelectedId = null;
    var currentUserLoc = null;
    var currentRadiusKm = 0;
    var currentShowRadius = false;

    function getCatColor(cat) {
      if (!cat) return DEFAULT_COLOR;
      var key = cat.toLowerCase().trim();
      return CATEGORY_COLORS[key] || DEFAULT_COLOR;
    }

    function escapeHtml(value) {
      // Rend une chaine litterale pour innerHTML. Leaflet traite les
      // contenus de tooltip/popup comme du HTML des lors que ce ne sont
      // pas des noeuds DOM : tout texte venant du serveur passe par ici.
      return String(value == null ? '' : value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function formatPrice(marker) {
      // Pas de label "Gratuit" sur la carte — les events gratuits sont
      // identifiés par l'absence de prix sur le marker (point coloré nu).
      // Les events payants affichent leur prix raccourci (ex: "5k", "12k").
      if (marker.is_free) return '';
      var p = marker.min_price || marker.price;
      if (p && p > 0) {
        if (p >= 1000) return Math.round(p/1000) + 'k';
        return p + '';
      }
      return '';
    }

    function isInRadius(lat, lng) {
      if (!currentShowRadius || !currentUserLoc || currentRadiusKm <= 0) return true;
      var d = map.distance([currentUserLoc.lat, currentUserLoc.lng], [lat, lng]) / 1000;
      return d <= currentRadiusKm;
    }

    // V7 — « ce soir » : commence dans moins de 3 h (et pas encore commencé).
    function isTonight(marker) {
      if (marker.is_live || !marker.start_date) return false;
      var start = Date.parse(marker.start_date);
      if (!isFinite(start)) return false;
      var diff = start - Date.now();
      return diff > 0 && diff < 3 * 3600 * 1000;
    }
    var liveHaloIds = {};

    function createMarkerIcon(marker, isSelected, enterIndex) {
      var inR = isInRadius(marker.lat, marker.lng);
      var color = inR ? getCatColor(marker.category) : '#9CA3AF';
      var entering = typeof enterIndex === 'number';
      var liveCls = '';
      if (marker.is_live) liveCls = liveHaloIds[marker.id] ? ' ev-marker-live' : ' ev-marker-live-static';
      else if (isTonight(marker)) liveCls = ' ev-marker-tonight';
      var cls = 'ev-marker' + (isSelected ? ' ev-marker-selected' : '') + (!inR ? ' ev-marker-outside' : '') + (entering ? ' ev-marker-in' : '') + liveCls;
      var delay = entering ? 'animation-delay:' + (enterIndex * 25) + 'ms;' : '';
      var label = formatPrice(marker);
      return L.divIcon({
        className: '',
        html: '<div class="' + cls + '" style="background:' + color + ';' + delay + '">' + label + '</div>',
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
    }

    var enterResetTimer = null;
    function updateMarkers(markers) {
      clusterGroup.clearLayers();
      currentMarkers = {};
      var entered = [];
      // Au plus 10 halos animés ; les autres événements en direct gardent un
      // anneau fixe (même information, sans mouvement).
      liveHaloIds = {};
      var halos = 0;
      markers.forEach(function(m) {
        if (m.is_live && halos < 10) { liveHaloIds[m.id] = true; halos++; }
      });
      markers.forEach(function(m) {
        if (!m.lat || !m.lng) return;
        var isSelected = m.id === currentSelectedId;
        // Cascade plafonnée aux 20 premiers marqueurs.
        var enterIndex = entered.length < 20 ? entered.length : undefined;
        if (enterIndex !== undefined) entered.push(m.id);
        var leafMarker = L.marker([m.lat, m.lng], {
          icon: createMarkerIcon(m, isSelected, enterIndex),
          zIndexOffset: isSelected ? 1000 : 0
        });
        // SECURITE (audit 2026-11) : bindTooltip assigne la chaine a
        // innerHTML (Leaflet 1.9.4) — c'est un puits de BALISAGE, pas de
        // texte. Le titre vient de l'organisateur : sans echappement, un
        // titre porteur de balises injectait du DOM dans la WebView carte.
        leafMarker.bindTooltip(escapeHtml(m.title), { permanent: false, direction: 'top', offset: [0, -5] });
        leafMarker.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'markerPress', marker: m }));
        });
        leafMarker._evData = m;
        currentMarkers[m.id] = leafMarker;
        clusterGroup.addLayer(leafMarker);
      });
      // Une fois la cascade jouée, on retire la classe d'entrée : sinon le
      // cluster la rejouerait à chaque zoom (il recrée le DOM des marqueurs).
      if (enterResetTimer) clearTimeout(enterResetTimer);
      enterResetTimer = setTimeout(function() {
        entered.forEach(function(id) {
          var lm = currentMarkers[id];
          if (lm) lm.setIcon(createMarkerIcon(lm._evData, id === currentSelectedId));
        });
      }, 1200);
    }

    function updateSelection(newId) {
      var oldId = currentSelectedId;
      currentSelectedId = newId;
      // Update old selected marker
      if (oldId && currentMarkers[oldId]) {
        var oldM = currentMarkers[oldId];
        oldM.setIcon(createMarkerIcon(oldM._evData, false));
        oldM.setZIndexOffset(0);
      }
      // Update new selected marker
      if (newId && currentMarkers[newId]) {
        var newM = currentMarkers[newId];
        newM.setIcon(createMarkerIcon(newM._evData, true));
        newM.setZIndexOffset(1000);
      }
    }

    function updateRadius(radiusKm, showRadius, userLoc) {
      currentRadiusKm = radiusKm;
      currentShowRadius = showRadius;
      currentUserLoc = userLoc;

      // Remove old radius elements
      if (radiusCircle) { map.removeLayer(radiusCircle); radiusCircle = null; }
      if (radiusLabel) { map.removeLayer(radiusLabel); radiusLabel = null; }

      if (showRadius && userLoc && radiusKm > 0) {
        radiusCircle = L.circle([userLoc.lat, userLoc.lng], {
          radius: radiusKm * 1000,
          color: DEFAULT_COLOR,
          fillColor: DEFAULT_COLOR,
          fillOpacity: 0.08,
          weight: 2,
          dashArray: '8, 8'
        }).addTo(map);

        radiusLabel = L.marker([userLoc.lat + (radiusKm * 0.009), userLoc.lng], {
          icon: L.divIcon({
            className: 'radius-label',
            html: radiusKm + ' km',
            iconSize: [50, 20]
          })
        }).addTo(map);

        map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
      }

      // Update user location marker
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (userLoc) {
        var pulseIcon = L.divIcon({
          className: 'user-location-pulse',
          html: '<div style="width:20px;height:20px;background:#3B82F6;border:3px solid white;border-radius:50%;box-shadow:0 0 10px rgba(59,130,246,0.5);"></div>',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: pulseIcon });
        userMarker.bindTooltip(${safeYourPosition}, { permanent: false, direction: 'top' });
        userMarker.addTo(map);
      }
    }

    function setCenter(lat, lng, zoom) {
      if (zoom) map.setView([lat, lng], zoom);
      else map.panTo([lat, lng]);
    }

    function fitToMarkers(markers, userLoc) {
      var valid = markers.filter(function(m) { return m.lat && m.lng; });
      if (valid.length > 1) {
        var bounds = L.latLngBounds(valid.map(function(m) { return [m.lat, m.lng]; }));
        if (userLoc) bounds.extend([userLoc.lat, userLoc.lng]);
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (valid.length === 1) {
        map.setView([valid[0].lat, valid[0].lng], 13);
      }
    }

    // Listen for messages from React Native
    var handleRNMessage = function(event) {
      try {
        var msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        switch (msg.type) {
          case 'updateMarkers':
            updateMarkers(msg.markers || []);
            if (!currentShowRadius || currentRadiusKm <= 0) {
              fitToMarkers(msg.markers || [], currentUserLoc);
            }
            break;
          case 'updateSelection':
            updateSelection(msg.selectedId);
            break;
          case 'updateRadius':
            updateRadius(msg.radiusKm, msg.showRadius, msg.userLoc);
            break;
          case 'setCenter':
            setCenter(msg.lat, msg.lng, msg.zoom);
            break;
          case 'reduceMotion':
            document.body.classList.toggle('rm', !!msg.value);
            break;
        }
      } catch(e) { if (__DEV__) console.error('handleRNMessage:', e); }
    };

    // Both Android and iOS
    document.addEventListener('message', handleRNMessage);
    window.addEventListener('message', handleRNMessage);

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
  </script>
</body>
</html>`;
  }, [isDark, centerLat, centerLng, zoom, yourPositionLabel]);

  // Handle messages from WebView
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        mapReadyRef.current = true;
        setIsLoading(false);
        flushPending();
        // Send initial data
        sendToWebView({
          type: 'updateRadius',
          radiusKm,
          showRadius,
          userLoc: userLocation || null,
        });
        sendToWebView({
          type: 'updateMarkers',
          markers,
        });
        if (selectedMarkerId) {
          sendToWebView({ type: 'updateSelection', selectedId: selectedMarkerId });
        }
      } else if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.marker);
      }
    } catch (e) {
      if (__DEV__) console.error('Error parsing WebView message:', e);
    }
  }, [markers, userLocation, selectedMarkerId, radiusKm, showRadius, onMarkerPress, sendToWebView, flushPending]);

  // Update markers when they change
  useEffect(() => {
    if (!mapReadyRef.current) return;
    sendToWebView({ type: 'updateMarkers', markers });
  }, [markers, sendToWebView]);

  // Réduire les animations : passé par message (le flag arrive en asynchrone ;
  // régénérer le HTML rechargerait toute la carte). Mis en file si pas prêt.
  useEffect(() => {
    sendToWebView({ type: 'reduceMotion', value: reduceMotion });
  }, [reduceMotion, sendToWebView]);

  // Update selection when it changes
  useEffect(() => {
    if (!mapReadyRef.current) return;
    sendToWebView({ type: 'updateSelection', selectedId: selectedMarkerId || null });
  }, [selectedMarkerId, sendToWebView]);

  // Update radius/user location when they change
  useEffect(() => {
    if (!mapReadyRef.current) return;
    sendToWebView({
      type: 'updateRadius',
      radiusKm,
      showRadius,
      userLoc: userLocation || null,
    });
  }, [radiusKm, showRadius, userLocation, sendToWebView]);

  return (
    <View style={[styles.container, isDark && styles.containerDark]}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
      />
      {isLoading && (
        <View style={[styles.loadingOverlay, isDark && styles.loadingOverlayDark]}>
          <LoadingSpinner />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  containerDark: {
    backgroundColor: '#111827',
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayDark: {
    backgroundColor: 'rgba(26, 26, 46, 0.9)',
  },
});
