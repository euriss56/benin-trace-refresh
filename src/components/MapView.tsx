import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icônes Leaflet (assets non résolus par défaut dans bundlers)
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

export interface IncidentPoint {
  id: string;
  case_number: string;
  brand: string;
  model: string;
  status: string;
  created_at: string;
  neighborhood_name: string;
  lat: number;
  lng: number;
}

interface ClusterPoint {
  key: string;
  name: string;
  lat: number;
  lng: number;
  incidents: IncidentPoint[];
}

export function MapView({ incidents }: { incidents: IncidentPoint[] }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const clusters: ClusterPoint[] = useMemo(() => {
    const map = new Map<string, ClusterPoint>();
    for (const inc of incidents) {
      const key = inc.neighborhood_name;
      const existing = map.get(key);
      if (existing) {
        existing.incidents.push(inc);
      } else {
        map.set(key, {
          key,
          name: inc.neighborhood_name,
          lat: inc.lat,
          lng: inc.lng,
          incidents: [inc],
        });
      }
    }
    return Array.from(map.values());
  }, [incidents]);

  if (!mounted) {
    return (
      <div className="h-[500px] rounded-lg bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">
        Chargement de la carte…
      </div>
    );
  }

  return (
    <div className="h-[500px] rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={[6.3654, 2.4183]}
        zoom={13}
        scrollWheelZoom
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clusters.map((c) => {
          const radius = Math.min(8 + c.incidents.length * 3, 30);
          return (
            <CircleMarker
              key={c.key}
              center={[c.lat, c.lng]}
              radius={radius}
              pathOptions={{
                color: "hsl(0, 84%, 60%)",
                fillColor: "hsl(0, 84%, 60%)",
                fillOpacity: 0.6,
                weight: 2,
              }}
            >
              <Popup maxHeight={250}>
                <div className="text-sm">
                  <p className="font-bold mb-2">
                    {c.name} — {c.incidents.length} signalement
                    {c.incidents.length > 1 ? "s" : ""}
                  </p>
                  <ul className="space-y-1.5 max-h-40 overflow-y-auto">
                    {c.incidents.slice(0, 10).map((i) => (
                      <li key={i.id} className="border-l-2 border-red-500 pl-2">
                        <p className="font-mono text-xs">{i.case_number}</p>
                        <p className="text-xs">
                          {i.brand} {i.model}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(i.created_at).toLocaleDateString("fr-FR")} —{" "}
                          <span className="capitalize">{i.status}</span>
                        </p>
                      </li>
                    ))}
                    {c.incidents.length > 10 && (
                      <li className="text-xs text-gray-500 italic">
                        + {c.incidents.length - 10} autres…
                      </li>
                    )}
                  </ul>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}

export default MapView;
