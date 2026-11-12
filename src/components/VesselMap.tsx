import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { GPSData, GPSWaypoint, RiskLevel } from '../types/iot';

interface VesselMapProps {
  gps: GPSData;
  vesselName: string;
  riskStatus: RiskLevel;
  routeHistory?: GPSWaypoint[];
  height?: string;
  interactive?: boolean;
}

export const VesselMap: React.FC<VesselMapProps> = ({
  gps,
  vesselName,
  riskStatus,
  routeHistory = [],
  height = '340px',
  interactive = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Default coordinate if GPS has no fix yet: Sadarghat Launch Terminal, Dhaka
  const defaultLat = 23.7042;
  const defaultLng = 90.4183;

  const lat = gps.latitude ?? defaultLat;
  const lng = gps.longitude ?? defaultLng;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize Leaflet map
      const map = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 12,
        zoomControl: interactive,
        dragging: interactive,
        scrollWheelZoom: interactive ? 'center' : false
      });

      // Standard OpenStreetMap tiles (100% free, no API key required, full Bangladesh river coverage)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      // Add major terminal markers along Bangladesh river route
      const terminals = [
        { name: 'Sadarghat Launch Terminal', lat: 23.7042, lng: 90.4183, desc: 'Dhaka Main River Port' },
        { name: 'Narayanganj River Port', lat: 23.6200, lng: 90.5050, desc: 'Shitalakshya River' },
        { name: 'Munshiganj Launch Ghat', lat: 23.5420, lng: 90.5340, desc: 'Dhaleshwari Confluence' },
        { name: 'Chandpur Launch Terminal', lat: 23.2300, lng: 90.6500, desc: 'Padma-Meghna Estuary' }
      ];

      terminals.forEach(term => {
        const portIcon = L.divIcon({
          className: 'custom-port-icon',
          html: `<div class="w-3 h-3 rounded-full bg-cyan-400 border-2 border-slate-900 shadow-sm"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });

        L.marker([term.lat, term.lng], { icon: portIcon })
          .addTo(map)
          .bindPopup(`<strong>${term.name}</strong><br/><span style="font-size:11px;color:#94a3b8">${term.desc}</span>`);
      });

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Custom Vessel Marker with heading indicator and risk color ring
    const markerColor =
      riskStatus === 'CRITICAL' ? '#f43f5e' :
      riskStatus === 'HIGH RISK' ? '#f97316' :
      riskStatus === 'WARNING' ? '#f59e0b' : '#06b6d4';

    const vesselHeading = gps.course ?? 145;

    const vesselHtml = `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 34px; height: 34px; border-radius: 50%; background: ${markerColor}22; border: 2px solid ${markerColor}; animation: pulse 2s infinite;"></div>
        <div style="transform: rotate(${vesselHeading}deg); width: 22px; height: 22px; display: flex; align-items: center; justify-content: center;">
          <svg viewBox="0 0 24 24" fill="${markerColor}" width="22" height="22">
            <path d="M12 2L4 20l8-4 8 4L12 2z" stroke="#0f172a" stroke-width="1.5" />
          </svg>
        </div>
      </div>
    `;

    const vesselIcon = L.divIcon({
      className: 'vessel-marker-div',
      html: vesselHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });

    if (!markerRef.current) {
      markerRef.current = L.marker([lat, lng], { icon: vesselIcon }).addTo(map);
      markerRef.current.bindPopup(`
        <div style="font-family: sans-serif; min-width: 160px;">
          <strong style="color: #0284c7;">${vesselName}</strong><br/>
          <div style="font-size: 11px; margin-top: 4px; color: #334155;">
            GPS Fix: ${gps.fixValid ? 'Locked (3D)' : 'No Fix'}<br/>
            Speed: ${gps.speedKmh ? gps.speedKmh + ' km/h' : '0 km/h'}<br/>
            Heading: ${gps.course ? gps.course + '°' : 'N/A'}<br/>
            Satellites: ${gps.satellites ?? 'N/A'}
          </div>
        </div>
      `);
    } else {
      markerRef.current.setLatLng([lat, lng]);
      markerRef.current.setIcon(vesselIcon);
    }

    // Historical Route Trail
    const latLngs: [number, number][] = routeHistory.length > 0
      ? routeHistory.map(p => [p.latitude, p.longitude])
      : [[lat, lng]];

    if (!polylineRef.current) {
      polylineRef.current = L.polyline(latLngs, {
        color: '#06b6d4',
        weight: 3.5,
        opacity: 0.75,
        dashArray: '6, 6'
      }).addTo(map);
    } else {
      polylineRef.current.setLatLngs(latLngs);
    }

    if (gps.fixValid) {
      map.panTo([lat, lng], { animate: true, duration: 0.8 });
    }

    return () => {
      // Map cleanup handled on component unmount
    };
  }, [lat, lng, gps, vesselName, riskStatus, routeHistory, interactive]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden border border-slate-800 shadow-md">
      {/* Map container */}
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {/* GPS Status HUD Overlay */}
      <div className="absolute top-2 left-2 z-[400] bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono shadow-lg flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-full ${
            gps.fixValid ? 'bg-emerald-400 animate-pulse' :
            gps.isStale ? 'bg-amber-400' : 'bg-rose-500'
          }`}></span>
          <span className="font-semibold text-slate-200">
            {gps.fixValid ? 'GPS FIX 3D' : gps.isStale ? 'GPS STALE' : 'SEARCHING SATELLITES'}
          </span>
        </div>
        <div className="text-slate-400 border-l border-slate-800 pl-3">
          Sats: <span className="text-cyan-400 font-bold">{gps.satellites ?? 0}</span>
        </div>
        <div className="text-slate-400 border-l border-slate-800 pl-3">
          Speed: <span className="text-slate-200 font-bold">{gps.speedKmh ? `${gps.speedKmh} km/h` : '0.0'}</span>
        </div>
      </div>

      {/* Lat/Lng Coordinates HUD Overlay */}
      <div className="absolute bottom-2 left-2 z-[400] bg-slate-950/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 shadow-lg">
        {gps.latitude !== null && gps.longitude !== null ? (
          <span>
            LAT: <strong className="text-cyan-400">{gps.latitude.toFixed(5)}°N</strong> &nbsp;|&nbsp;
            LNG: <strong className="text-cyan-400">{gps.longitude.toFixed(5)}°E</strong> &nbsp;|&nbsp;
            COURSE: <strong className="text-slate-100">{gps.course ? `${gps.course}°` : '145°'}</strong>
          </span>
        ) : (
          <span className="text-amber-400">Waiting for NEO-6M NMEA sentence lock...</span>
        )}
      </div>

      {/* River Route Badge */}
      <div className="absolute top-2 right-2 z-[400] bg-slate-950/85 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[10px] font-mono text-slate-300">
        🚢 Dhaka Sadarghat ↔ Chandpur Route
      </div>
    </div>
  );
};
