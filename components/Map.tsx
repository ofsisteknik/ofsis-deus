'use client';

import { useEffect, useRef, useState } from 'react';
import { Earthquake } from '../types';
import { useThemeStore } from '../store/themeStore';

interface MapProps {
  earthquakes: Earthquake[];
  selectedEarthquakeId: string | null;
  onSelectEarthquake: (id: string | null) => void;
}

const getMagnitudeColor = (mag: number) => {
  if (mag < 3.0) return '#9EDE9E'; // Açık Yeşil (Light Green)
  if (mag < 4.0) return '#82B9B9'; // Teal/Light Blue
  if (mag < 5.0) return '#1B5E4C'; // Dark Green
  if (mag < 6.0) return '#DFA868'; // Orange-Yellow
  if (mag < 7.0) return '#D67035'; // Orange
  return '#C93545';                // Red
};

const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#161d26' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#161d26' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8c9ba5' }] },
  { featureType: 'administrative.country', elementType: 'geometry.stroke', stylers: [{ color: '#2b3644' }] },
  { featureType: 'administrative.province', elementType: 'geometry.stroke', stylers: [{ color: '#2b3644' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#c5d1db' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8c9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1c2633' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b7f94' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#25303f' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1c2633' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#8c9ba5' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c3b4e' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1a2432' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#212c3b' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#8c9ba5' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0c121b' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4a5768' }] },
];

const lightMapStyle = [
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [{ color: '#EAF6EA' }] // Extremely pale pastel green
  },
  {
    featureType: 'landscape.natural',
    elementType: 'geometry',
    stylers: [{ color: '#F7FAF3' }] // Extremely pale pastel cream/beige
  }
];

// Helper to dynamically load the Google Maps API Script
const loadGoogleMapsScript = (callback: () => void) => {
  if (typeof window === 'undefined') return;
  
  if ((window as any).google && (window as any).google.maps) {
    callback();
    return;
  }

  const existingScript = document.getElementById('googleMapsScript');
  if (existingScript) {
    existingScript.addEventListener('load', callback);
    return;
  }

  const script = document.createElement('script');
  script.id = 'googleMapsScript';
  script.src = 'https://maps.googleapis.com/maps/api/js?key=AIzaSyAyd-oPZCzHMXwGpvbTebYqs5Bh5e6W4jY&libraries=geometry';
  script.async = true;
  script.defer = true;
  script.onload = () => callback();
  document.head.appendChild(script);
};

declare const google: any;

export default function EarthquakeMap({
  earthquakes,
  selectedEarthquakeId,
  onSelectEarthquake,
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const activePulseRef = useRef<any>(null);
  const activePulseIntervalRef = useRef<any>(null);
  const activeInfoWindowRef = useRef<any>(null);
  const recentPulsesRef = useRef<any[]>([]);
  const recentPulseIntervalRef = useRef<any>(null);

  const theme = useThemeStore((state) => state.theme);

  // Load Google Maps API Script
  useEffect(() => {
    loadGoogleMapsScript(() => {
      setIsApiLoaded(true);
    });
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!isApiLoaded || !mapContainerRef.current || mapRef.current) return;

    const map = new google.maps.Map(mapContainerRef.current, {
      center: { lat: 39.0, lng: 35.0 },
      zoom: 6,
      minZoom: 5,
      maxZoom: 12,
      disableDefaultUI: true,
      zoomControl: true,
      styles: theme === 'dark' ? darkMapStyle : lightMapStyle,
      backgroundColor: theme === 'dark' ? '#161d26' : '#ffffff',
    });

    mapRef.current = map;
  }, [isApiLoaded]);

  // Dynamically update map theme
  useEffect(() => {
    if (mapRef.current && typeof google !== 'undefined') {
      mapRef.current.setOptions({
        styles: theme === 'dark' ? darkMapStyle : lightMapStyle,
      });
    }
  }, [theme]);

  // Clear existing markers and shockwaves
  const clearMapOverlays = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    circlesRef.current.forEach((c) => c.setMap(null));
    markersRef.current = [];
    circlesRef.current = [];
    if (activeInfoWindowRef.current) {
      activeInfoWindowRef.current.close();
      activeInfoWindowRef.current = null;
    }
  };

  // Re-render markers and shockwaves
  useEffect(() => {
    if (!isApiLoaded || !mapRef.current) return;

    const google = (window as any).google;
    const map = mapRef.current;

    clearMapOverlays();

    // Reset old recent pulse animation
    if (recentPulseIntervalRef.current) {
      clearInterval(recentPulseIntervalRef.current);
      recentPulseIntervalRef.current = null;
    }
    if (recentPulsesRef.current && recentPulsesRef.current.length > 0) {
      recentPulsesRef.current.forEach((c) => {
        if (c) c.setMap(null);
      });
      recentPulsesRef.current = [];
    }

    earthquakes.forEach((eq, idx) => {
      const isMostRecent = idx === 0;
      const color = getMagnitudeColor(eq.magnitude);

      // Inner epicenter vector marker
      const marker = new google.maps.Marker({
        position: { lat: eq.latitude, lng: eq.longitude },
        map: map,
        title: `${eq.magnitude} - ${eq.location}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: color,
          fillOpacity: 0.95,
          strokeColor: isMostRecent ? '#EF4444' : '#FFFFFF',
          strokeWeight: isMostRecent ? 2.5 : 1.5,
          scale: isMostRecent ? Math.max(10, eq.magnitude * 2.4) : Math.max(6, eq.magnitude * 1.8),
        },
      });

      // Special permanent neon red pulse waves for the most recent earthquake
      if (isMostRecent) {
        const pulseCount = 3;
        const pulses: any[] = [];

        // Magnitude-based scaling:
        // M<3 → tight local ring, M≥7 → country-scale wave
        const magClamped = Math.max(1.0, Math.min(eq.magnitude, 9.0));
        const maxRadius = magClamped * 55000;           // e.g. M3→165km, M5→275km, M7→385km
        const strokeBase = 1.2 + magClamped * 0.25;    // thin for micro, thicker for strong
        const speed = Math.max(0.003, 0.009 - magClamped * 0.0007); // slower for larger quakes
        
        for (let i = 0; i < pulseCount; i++) {
          const pulseCircle = new google.maps.Circle({
            center: { lat: eq.latitude, lng: eq.longitude },
            radius: 0,
            fillColor: 'transparent',
            strokeColor: '#EF4444',
            strokeOpacity: 0.8,
            strokeWeight: Math.max(1, strokeBase - i * 0.3),
            map: map,
          });
          pulses.push(pulseCircle);
        }
        
        recentPulsesRef.current = pulses;

        let tick = 0;
        recentPulseIntervalRef.current = setInterval(() => {
          if (!recentPulsesRef.current || recentPulsesRef.current.length === 0) return;
          
          tick += 1;
          recentPulsesRef.current.forEach((circle, index) => {
            const offset = index / pulseCount;
            let factor = ((tick * speed) + offset) % 1.0;
            
            if (factor < 0.04) factor = 0.04;

            circle.setRadius(maxRadius * factor);
            circle.setOptions({
              strokeOpacity: 0.9 * (1.0 - factor),
              strokeColor: '#EF4444',
            });
          });
        }, 40);
      }

      // Outer shockwave impact circle (meters)
      const shockwave = new google.maps.Circle({
        center: { lat: eq.latitude, lng: eq.longitude },
        radius: eq.magnitude * 15000,
        fillColor: color,
        fillOpacity: isMostRecent ? 0.08 : 0.04,
        strokeColor: color,
        strokeOpacity: isMostRecent ? 0.4 : 0.15,
        strokeWeight: isMostRecent ? 2 : 1,
        map: map,
      });

      // Popup content template
      const popupContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; min-width: 180px; padding: 4px 8px; color: #1e293b; line-height: 1.4;">
          ${isMostRecent ? `
            <div style="font-size: 8px; font-weight: 800; color: #FFFFFF; background: #EF4444; padding: 3px 6px; border-radius: 4px; text-align: center; margin-bottom: 8px; letter-spacing: 0.08em;">
              🚨 EN SON SİSMİK AKTİVİTE (SON 24 SAAT)
            </div>
          ` : ''}
          <h4 style="margin: 0 0 6px 0; font-size: 14px; font-weight: 800; color: ${color};">
            ${eq.magnitude.toFixed(1)} ${eq.magnitudeScale}
          </h4>
          <div style="font-size: 12px; font-weight: 600; color: #0f172a; margin-bottom: 4px;">${eq.location}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 2px;">Derinlik: <strong>${eq.depth} km</strong></div>
          <div style="font-size: 11px; color: #475569;">Tarih: <strong>${new Date(eq.timestamp).toLocaleString('tr-TR')}</strong></div>
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: popupContent,
      });

      marker.addListener('click', () => {
        if (activeInfoWindowRef.current) {
          activeInfoWindowRef.current.close();
        }
        infoWindow.open(map, marker);
        activeInfoWindowRef.current = infoWindow;
        onSelectEarthquake(eq.id);
      });



      markersRef.current.push(marker);
      circlesRef.current.push(shockwave);
    });
  }, [isApiLoaded, earthquakes]);

  // Selected Earthquake centering & radar pulse ring
  useEffect(() => {
    if (!isApiLoaded || !mapRef.current) return;

    const google = (window as any).google;
    const map = mapRef.current;

    // Reset old pulse animation
    if (activePulseIntervalRef.current) {
      clearInterval(activePulseIntervalRef.current);
      activePulseIntervalRef.current = null;
    }
    if (activePulseRef.current) {
      activePulseRef.current.setMap(null);
      activePulseRef.current = null;
    }

    if (!selectedEarthquakeId) return;

    const eq = earthquakes.find((e) => e.id === selectedEarthquakeId);
    if (!eq) return;

    // Center map on epicenter
    map.panTo({ lat: eq.latitude, lng: eq.longitude });
    map.setZoom(8);

    // Glowing radar pulse circle
    const color = getMagnitudeColor(eq.magnitude);
    const pulseRing = new google.maps.Circle({
      center: { lat: eq.latitude, lng: eq.longitude },
      radius: eq.magnitude * 20000,
      fillColor: 'transparent',
      strokeColor: color,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      map: map,
    });

    activePulseRef.current = pulseRing;

    let radiusFactor = 0.1;
    activePulseIntervalRef.current = setInterval(() => {
      if (!activePulseRef.current) return;
      radiusFactor += 0.05;
      if (radiusFactor > 1) radiusFactor = 0.1;
      
      activePulseRef.current.setRadius(eq.magnitude * 25000 * radiusFactor);
      activePulseRef.current.setOptions({
        strokeOpacity: 0.9 * (1 - radiusFactor),
      });
    }, 80);

    return () => {
      if (activePulseIntervalRef.current) {
        clearInterval(activePulseIntervalRef.current);
      }
    };
  }, [selectedEarthquakeId, earthquakes, isApiLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearMapOverlays();
      if (activePulseIntervalRef.current) {
        clearInterval(activePulseIntervalRef.current);
      }
      if (recentPulseIntervalRef.current) {
        clearInterval(recentPulseIntervalRef.current);
      }
      if (recentPulsesRef.current && recentPulsesRef.current.length > 0) {
        recentPulsesRef.current.forEach((c) => {
          if (c) c.setMap(null);
        });
        recentPulsesRef.current = [];
      }
    };
  }, []);

  return (
    <div className="relative w-full h-full">
      {/* Radar Overlay Grid Background */}
      <div className="absolute inset-0 pointer-events-none z-[400] border border-white/5 bg-[radial-gradient(rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:20px_20px]" />
      
      {/* Compass rose / tech target decoration in bottom right */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-[400] w-24 h-24 rounded-full border border-white/10 flex items-center justify-center opacity-40">
        <div className="w-16 h-16 rounded-full border border-white/5 flex items-center justify-center animate-sweep">
          <div className="absolute top-0 bottom-0 left-1/2 w-[1px] bg-cyan-500/20" />
          <div className="absolute left-0 right-0 top-1/2 h-[1px] bg-cyan-500/20" />
        </div>
      </div>

      <div ref={mapContainerRef} className="w-full h-full overflow-hidden" />
    </div>
  );
}
