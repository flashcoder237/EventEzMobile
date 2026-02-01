import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  location_city?: string;
  start_date?: string;
}

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
}

export default function WebViewMap({
  markers,
  userLocation,
  selectedMarkerId,
  onMarkerPress,
  initialRegion,
}: WebViewMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);

  const centerLat = initialRegion?.latitude || userLocation?.lat || 3.848;
  const centerLng = initialRegion?.longitude || userLocation?.lng || 11.502;
  const zoom = initialRegion?.latitudeDelta ? Math.round(10 - Math.log2(initialRegion.latitudeDelta)) : 10;

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

    markers.forEach(function(marker) {
      if (marker.lat && marker.lng) {
        var isSelected = marker.id === selectedId;
        var circleMarker = L.circleMarker([marker.lat, marker.lng], {
          radius: isSelected ? 14 : 10,
          fillColor: '#7c3aed',
          color: '#fff',
          weight: 3,
          opacity: 1,
          fillOpacity: isSelected ? 1 : 0.85
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

    var userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};
    if (userLoc) {
      var userMarker = L.circleMarker([userLoc.lat, userLoc.lng], {
        radius: 8,
        fillColor: '#3B82F6',
        color: '#fff',
        weight: 3,
        opacity: 1,
        fillOpacity: 1
      });
      userMarker.bindTooltip('Votre position', { permanent: false, direction: 'top' });
      userMarker.addTo(map);
    }

    if (markers.length > 0) {
      var validMarkers = markers.filter(function(m) { return m.lat && m.lng; });
      if (validMarkers.length > 1) {
        var bounds = L.latLngBounds(validMarkers.map(function(m) { return [m.lat, m.lng]; }));
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

  return (
    <View style={styles.container}>
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
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#7c3aed" />
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
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
