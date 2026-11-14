import React from 'react';
import { SensorTelemetry, VesselConfig, GPSWaypoint } from '../types/iot';
import { VesselMap } from '../components/VesselMap';
import { Navigation, Download, Clock } from 'lucide-react';

interface VesselTrackingViewProps {
  telemetry: SensorTelemetry;
  config: VesselConfig;
  routeHistory: GPSWaypoint[];
}

export const VesselTrackingView: React.FC<VesselTrackingViewProps> = ({
  telemetry,
  config,
  routeHistory
}) => {
  const gps = telemetry.gps;

  const handleExportGeoJson = () => {
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: routeHistory.map(pt => [pt.longitude, pt.latitude])
          },
          properties: {
            vesselId: telemetry.deviceId,
            vesselName: telemetry.vesselName,
            route: config.route
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vessel_route_${telemetry.deviceId}_${new Date().toISOString().slice(0, 10)}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top GPS Status Ribbon */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Navigation className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              <h2 className="text-base font-bold text-[#0F172A] dark:text-white tracking-wide">
                u-blox NEO-6M GPS Navigation &amp; River Course Tracking
              </h2>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase border ${
                gps.fixValid
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-500/40'
                  : gps.isStale
                  ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500/40'
                  : 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-400 dark:border-rose-500/40 animate-pulse'
              }`}>
                {gps.fixValid ? '3D FIX (GNSS LOCKED)' : gps.isStale ? 'LAST KNOWN STALE FIX' : 'ACQUIRING FIX'}
              </span>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-mono">
              Route: {config.route} | Mode: {telemetry.mode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportGeoJson}
              className="px-3 py-1.5 rounded-lg bg-[#F1F5F9] hover:bg-slate-200 text-[#0F172A] border border-[#CBD5E1] dark:bg-[#1F2937] dark:hover:bg-slate-700 dark:text-slate-200 dark:border-[#334155] text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Export GeoJSON
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Size Map */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow-xl">
        <VesselMap
          gps={gps}
          vesselName={telemetry.vesselName}
          riskStatus={telemetry.riskStatus}
          routeHistory={routeHistory}
          height="460px"
          interactive={true}
        />
      </div>

      {/* GPS Telemetry Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">Latitude</span>
          <span className="text-base font-black text-cyan-700 dark:text-cyan-300 font-mono mt-1 block">
            {gps.latitude !== null ? `${gps.latitude.toFixed(5)}°N` : 'N/A'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">Longitude</span>
          <span className="text-base font-black text-cyan-700 dark:text-cyan-300 font-mono mt-1 block">
            {gps.longitude !== null ? `${gps.longitude.toFixed(5)}°E` : 'N/A'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">Speed Over Ground</span>
          <span className="text-base font-black text-emerald-700 dark:text-emerald-400 font-mono mt-1 block">
            {gps.speedKmh !== null ? `${gps.speedKmh.toFixed(1)} km/h` : '0.0'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">Course Heading</span>
          <span className="text-base font-black text-amber-700 dark:text-amber-300 font-mono mt-1 block">
            {gps.course !== null ? `${gps.course.toFixed(0)}°` : '145°'}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">Satellites Tracked</span>
          <span className="text-base font-black text-indigo-700 dark:text-indigo-300 font-mono mt-1 block">
            {gps.satellites ?? 0}
          </span>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-3 text-center shadow-xs">
          <span className="text-[10px] text-[#64748B] dark:text-[#94A3B8] uppercase font-mono block">GPS Time (UTC)</span>
          <span className="text-xs font-bold text-[#0F172A] dark:text-slate-300 font-mono mt-1.5 block truncate">
            {gps.gpsTimestamp ? new Date(gps.gpsTimestamp).toLocaleTimeString() : 'Waiting NMEA'}
          </span>
        </div>
      </div>

      {/* Historical Waypoint Log Table */}
      <div className="bg-white dark:bg-[#111827] border border-[#E2E8F0] dark:border-[#334155] rounded-xl p-4 shadow-sm dark:shadow">
        <h3 className="text-xs font-bold text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wider font-mono mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          Recorded River Waypoint History ({routeHistory.length} recorded positions)
        </h3>

        <div className="overflow-x-auto max-h-60 overflow-y-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-[#F8FAFC] dark:bg-[#1F2937] text-[#64748B] dark:text-[#94A3B8] border-b border-[#E2E8F0] dark:border-[#334155] sticky top-0">
              <tr>
                <th className="p-2">Timestamp</th>
                <th className="p-2">Latitude</th>
                <th className="p-2">Longitude</th>
                <th className="p-2">Speed</th>
                <th className="p-2">Course</th>
                <th className="p-2">Safety Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#334155] text-[#0F172A] dark:text-slate-300">
              {routeHistory.slice().reverse().map((wp, i) => (
                <tr key={i} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1F2937]/50">
                  <td className="p-2 text-[#64748B] dark:text-[#94A3B8]">{new Date(wp.timestamp).toLocaleTimeString()}</td>
                  <td className="p-2 text-cyan-700 dark:text-cyan-300 font-semibold">{wp.latitude.toFixed(5)}°N</td>
                  <td className="p-2 text-cyan-700 dark:text-cyan-300 font-semibold">{wp.longitude.toFixed(5)}°E</td>
                  <td className="p-2">{wp.speedKmh.toFixed(1)} km/h</td>
                  <td className="p-2">{wp.course}°</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      wp.riskStatus === 'CRITICAL'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-500'
                        : wp.riskStatus === 'HIGH RISK'
                        ? 'bg-orange-50 text-orange-800 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-500'
                        : wp.riskStatus === 'WARNING'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-500'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800'
                    }`}>
                      {wp.riskStatus}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
