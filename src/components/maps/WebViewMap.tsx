import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { Colors } from '../../constants/theme';
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
  radiusKm?: number; // Rayon en km à afficher
  showRadius?: boolean; // Afficher le cercle de rayon
}

export default function WebViewMap({
  markers,
  userLocation,
  selectedMarkerId,
  onMarkerPress,
  initialRegion,
  radiusKm = 0,
  showRadius = false }: WebViewMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  const centerLat = initialRegion?.latitude || userLocation?.lat || 3.848;
  const centerLng = initialRegion?.longitude || userLocation?.lng || 11.502;

  // Calculer le zoom basé sur le rayon
  const getZoomFromRadius = (radius: number): number => {
    if (radius <= 0) return 10;
    // Formule approximative pour convertir km en niveau de zoom
    if (radius <= 5) return 13;
    if (radius <= 10) return 12;
    if (radius <= 25) return 11;
    if (radius <= 50) return 10;
    if (radius <= 100) return 9;
    if (radius <= 200) return 8;
    return 7;
  };

  const zoom = radiusKm > 0 ? getZoomFromRadius(radiusKm) :
    (initialRegion?.latitudeDelta ? Math.round(10 - Math.log2(initialRegion.latitudeDelta)) : 10);

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #map { width: 100%; height: 100%; }
    .leaflet-tooltip {
      background: white;
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
      color: #6366F1;
      font-weight: 600;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${centerLat}, ${centerLng}],
      zoom: ${zoom},
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap'
    }).addTo(map);

    var markersLayer = L.layerGroup().addTo(map);
    var markers = ${JSON.stringify(markers)};
    var selectedId = ${selectedMarkerId ? `"${selectedMarkerId}"` : 'null'};
    var userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};
    var radiusKm = ${radiusKm};
    var showRadius = ${showRadius};

    // Dessiner le cercle de rayon si demandé
    if (showRadius && userLoc && radiusKm > 0) {
      var radiusCircle = L.circle([userLoc.lat, userLoc.lng], {
        radius: radiusKm * 1000, // Convertir km en mètres
        color: '#6366F1',
        fillColor: '#6366F1',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '8, 8'
      }).addTo(map);

      // Label du rayon
      var radiusLabel = L.marker([userLoc.lat + (radiusKm * 0.009), userLoc.lng], {
        icon: L.divIcon({
          className: 'radius-label',
          html: radiusKm + ' km',
          iconSize: [50, 20]
        })
      }).addTo(map);

      // Ajuster la vue pour montrer tout le cercle
      map.fitBounds(radiusCircle.getBounds(), { padding: [20, 20] });
    }

    // Ajouter les marqueurs d'événements
    markers.forEach(function(marker) {
      if (marker.lat && marker.lng) {
        var isSelected = marker.id === selectedId;

        // Vérifier si le marqueur est dans le rayon
        var isInRadius = true;
        if (showRadius && userLoc && radiusKm > 0) {
          var distance = map.distance([userLoc.lat, userLoc.lng], [marker.lat, marker.lng]) / 1000;
          isInRadius = distance <= radiusKm;
        }

        var circleMarker = L.circleMarker([marker.lat, marker.lng], {
          radius: isSelected ? 14 : 10,
          fillColor: isInRadius ? '#7c3aed' : '#9CA3AF',
          color: '#fff',
          weight: 3,
          opacity: isInRadius ? 1 : 0.5,
          fillOpacity: isSelected ? 1 : (isInRadius ? 0.85 : 0.4)
        });

        circleMarker.bindTooltip(marker.title, {
          permanent: false,
          direction: 'top',
          offset: [0, -10]
        });

        circleMarker.on('click', function() {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'markerPress',
            marker: marker
          }));
        });

        markersLayer.addLayer(circleMarker);
      }
    });

    // Marqueur de position utilisateur
    if (userLoc) {
      var pulseIcon = L.divIcon({
        className: 'user-location-pulse',
        html: '<div style="width: 20px; height: 20px; background: #3B82F6; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(59,130,246,0.5);"></div>',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });

      var userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: pulseIcon });
      userMarker.bindTooltip('Votre position', { permanent: false, direction: 'top' });
      userMarker.addTo(map);
    }

    // Si pas de rayon mais des marqueurs, ajuster la vue
    if ((!showRadius || radiusKm <= 0) && markers.length > 0) {
      var validMarkers = markers.filter(function(m) { return m.lat && m.lng; });
      if (validMarkers.length > 1) {
        var bounds = L.latLngBounds(validMarkers.map(function(m) { return [m.lat, m.lng]; }));
        if (userLoc) {
          bounds.extend([userLoc.lat, userLoc.lng]);
        }
        map.fitBounds(bounds, { padding: [30, 30] });
      } else if (validMarkers.length === 1) {
        map.setView([validMarkers[0].lat, validMarkers[0].lng], 13);
      }
    }

    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
  </script>
</body>
</html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'mapReady') {
        setIsLoading(false);
      } else if (data.type === 'markerPress' && onMarkerPress) {
        onMarkerPress(data.marker);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // Générer une clé unique pour forcer le re-render du WebView
  const webViewKey = `map-${radiusKm}-${showRadius}-${markers.length}-${userLocation?.lat || 0}-${userLocation?.lng || 0}-${selectedMarkerId || 'none'}`;

  return (
    <View style={styles.container}>
      <WebView
        key={webViewKey}
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        cacheEnabled={false}
        incognito={true}
      />
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <LoadingSpinner />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0' },
  webView: {
    flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center' } });
