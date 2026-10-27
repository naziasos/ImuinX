import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { api, errorMessage } from "../../services/api";
import PageHeader from "../../components/PageHeader";
import EmptyState from "../../components/EmptyState";
import Icon from "../../components/Icons";
import "./NearbyClinics.css";

// Dhaka city centre: used only if the citizen denies location access
// and has not searched for an area yet.
const FALLBACK_CENTER = { latitude: 23.8103, longitude: 90.4125 };
const RADIUS_OPTIONS = [
  { label: "2 km", value: 2 },
  { label: "5 km", value: 5 },
  { label: "10 km", value: 10 },
  { label: "25 km", value: 25 },
  { label: "Any", value: 0 },
];

const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;

// Rough walking/driving time so the number means something to a citizen.
const estimateMinutes = (km) => ({
  walk: Math.max(1, Math.round((km / 4.8) * 60)),
  drive: Math.max(1, Math.round((km / 22) * 60)),
});

const directionsUrl = (clinic, origin) =>
  `https://www.google.com/maps/dir/?api=1&destination=${clinic.latitude},${clinic.longitude}` +
  (origin ? `&origin=${origin.latitude},${origin.longitude}` : "");

// Branded map markers (blue → green), no image files needed.
const pinIcon = (label, active) =>
  L.divIcon({
    className: "nc-marker-wrap",
    html: `<span class="nc-marker ${active ? "is-active" : ""}"><b>${label}</b></span>`,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -40],
  });

const youIcon = L.divIcon({
  className: "nc-marker-wrap",
  html: `<span class="nc-you"><i></i></span>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function NearbyClinics({ onBookAppointment }) {
  const [origin, setOrigin] = useState(null);
  const [originLabel, setOriginLabel] = useState("");
  const [clinics, setClinics] = useState([]);
  const [radius, setRadius] = useState(10);
  const [query, setQuery] = useState("");
  const [areaQuery, setAreaQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [locating, setLocating] = useState(true); // starts by asking for location
  const [loadedKey, setLoadedKey] = useState("");
  const [notice, setNotice] = useState(""); // location / area-search messages
  const [fetchError, setFetchError] = useState("");

  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const markersRef = useRef({});
  const cardRefs = useRef({});

  // ---------- map setup (once) ----------
  useEffect(() => {
    const map = L.map(mapEl.current, { zoomControl: false }).setView(
      [FALLBACK_CENTER.latitude, FALLBACK_CENTER.longitude],
      12
    );

    L.control.zoom({ position: "bottomright" }).addTo(map);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // ---------- fetch clinics (re-runs when the origin or radius changes) ----------
  const requestKey = origin ? `${origin.latitude},${origin.longitude},${radius}` : "";

  useEffect(() => {
    if (!origin) return undefined;

    let cancelled = false;
    const params = { latitude: origin.latitude, longitude: origin.longitude };
    if (radius > 0) params.radius = radius;

    api
      .get("/clinics/nearby", { params })
      .then((res) => {
        if (cancelled) return;
        setClinics(res.data.clinics || []);
        setFetchError("");
        setLoadedKey(requestKey);
      })
      .catch((err) => {
        if (cancelled) return;
        setFetchError(errorMessage(err));
        setLoadedKey(requestKey);
      });

    return () => {
      cancelled = true;
    };
  }, [origin, radius, requestKey]);

  // ---------- location ----------
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      // Defer so state is not set synchronously inside an effect.
      Promise.resolve().then(() => {
        setNotice("Your browser does not support location. Search for an area instead.");
        setOrigin(FALLBACK_CENTER);
        setOriginLabel("Dhaka (default)");
        setLocating(false);
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setNotice("");
        setOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setOriginLabel("your current location");
        setLocating(false);
      },
      (err) => {
        setNotice(
          err.code === 1
            ? "Location permission was denied. Search for your area below."
            : "We could not detect your location. Search for your area below."
        );
        setOrigin(FALLBACK_CENTER);
        setOriginLabel("Dhaka (default)");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  // Ask for the citizen's location once when the page opens.
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const locateMe = () => {
    setLocating(true);
    setNotice("");
    requestLocation();
  };

  // Search an area by name (OpenStreetMap Nominatim, used from the browser).
  const searchArea = async (event) => {
    event.preventDefault();
    const text = areaQuery.trim();
    if (!text) return;

    setLocating(true);
    setNotice("");

    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=bd&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();

      if (!data.length) {
        setNotice(`We could not find "${text}". Try a nearby area or city name.`);
      } else {
        setOrigin({ latitude: Number(data[0].lat), longitude: Number(data[0].lon) });
        setOriginLabel(data[0].display_name.split(",").slice(0, 2).join(","));
      }
    } catch {
      setNotice("Area search is unavailable right now. Please try again.");
    } finally {
      setLocating(false);
    }
  };

  // ---------- filtering ----------
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return clinics;
    return clinics.filter((c) =>
      `${c.name} ${c.address}`.toLowerCase().includes(needle)
    );
  }, [clinics, query]);

  // ---------- draw markers ----------
  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersRef.current = {};
    const bounds = [];

    if (origin) {
      L.marker([origin.latitude, origin.longitude], { icon: youIcon, zIndexOffset: 1000 })
        .bindTooltip("You are here", { direction: "top" })
        .addTo(layer);
      bounds.push([origin.latitude, origin.longitude]);
    }

    visible.forEach((clinic, index) => {
      const marker = L.marker([clinic.latitude, clinic.longitude], {
        icon: pinIcon(index + 1, false),
      })
        .bindTooltip(clinic.name, { direction: "top", offset: [0, -34] })
        .on("click", () => setSelectedId(clinic.id))
        .addTo(layer);

      markersRef.current[clinic.id] = { marker, index };
      bounds.push([clinic.latitude, clinic.longitude]);
    });

    if (bounds.length > 1) {
      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 15, animate: true });
    } else if (bounds.length === 1) {
      map.setView(bounds[0], 14);
    }
  }, [visible, origin]);

  // Highlight the selected marker + scroll its card into view.
  useEffect(() => {
    Object.entries(markersRef.current).forEach(([id, { marker, index }]) => {
      marker.setIcon(pinIcon(index + 1, id === String(selectedId)));
      marker.setZIndexOffset(id === String(selectedId) ? 500 : 0);
    });

    const selected = visible.find((c) => c.id === selectedId);
    if (selected && mapRef.current) {
      mapRef.current.flyTo([selected.latitude, selected.longitude], 15, { duration: 0.7 });
    }
    cardRefs.current[selectedId]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedId, visible]);

  const loading = !!origin && loadedKey !== requestKey;
  const busy = locating || loading;
  const error = notice || fetchError;
  const ready = !busy && !fetchError && !!origin;

  return (
    <div className="nc-page">
      <PageHeader
        eyebrow="Find care"
        icon="pin"
        title="Nearby Clinics"
        description="Find vaccination clinics close to you, see how far they are, and book in a tap."
        actions={
          <button type="button" className="cz-btn cz-btn--primary" onClick={locateMe} disabled={busy}>
            <Icon name="refresh" size={17} className={busy ? "nc-spin" : ""} />
            Use my location
          </button>
        }
      />

      {/* ---- search + filters ---- */}
      <div className="cz-card nc-toolbar">
        <form className="nc-search" onSubmit={searchArea}>
          <Icon name="pin" size={18} />
          <input
            type="text"
            value={areaQuery}
            onChange={(e) => setAreaQuery(e.target.value)}
            placeholder="Search an area, e.g. Uttara, Gazipur, Mirpur"
            aria-label="Search an area"
          />
          <button type="submit" className="cz-btn cz-btn--secondary cz-btn--sm" disabled={busy}>
            Search
          </button>
        </form>

        <div className="nc-filters">
          <div className="nc-chips" role="group" aria-label="Distance">
            {RADIUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`nc-chip ${radius === option.value ? "is-active" : ""}`}
                onClick={() => setRadius(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <input
            className="nc-filter-input"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by clinic name"
            aria-label="Filter clinics by name"
          />
        </div>

        {originLabel && (
          <p className="nc-origin">
            Showing clinics near <strong>{originLabel}</strong>
          </p>
        )}
      </div>

      {error && (
        <div className="nc-alert" role="alert">
          <Icon name="alert" size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* ---- list + map ---- */}
      <div className="nc-layout">
        <section className="nc-list" aria-live="polite">
          <p className="nc-count">
            {busy
              ? "Looking for clinics…"
              : `${visible.length} clinic${visible.length === 1 ? "" : "s"} found`}
          </p>

          {busy &&
            [0, 1, 2].map((i) => <div className="nc-skeleton" key={i} />)}

          {ready && visible.length === 0 && (
            <EmptyState
              icon="pin"
              title="No clinics in this range"
              text="Try a wider distance or search a different area."
              action={
                radius !== 0 && (
                  <button type="button" className="cz-btn cz-btn--secondary cz-btn--sm" onClick={() => setRadius(0)}>
                    Show clinics at any distance
                  </button>
                )
              }
            />
          )}

          {!busy &&
            visible.map((clinic, index) => {
              const time = estimateMinutes(clinic.distance);
              const active = clinic.id === selectedId;

              return (
                <article
                  key={clinic.id}
                  ref={(el) => (cardRefs.current[clinic.id] = el)}
                  className={`nc-card ${active ? "is-active" : ""}`}
                  style={{ animationDelay: `${Math.min(index, 8) * 50}ms` }}
                  onClick={() => setSelectedId(clinic.id)}
                >
                  <span className="nc-card__num">{index + 1}</span>

                  <div className="nc-card__body">
                    <div className="nc-card__top">
                      <h3>{clinic.name}</h3>
                      <span className="nc-distance">{formatDistance(clinic.distance)}</span>
                    </div>

                    <p className="nc-card__addr">{clinic.address}</p>
                    <p className="nc-card__time">
                      <Icon name="clock" size={14} /> ~{time.walk} min walk · ~{time.drive} min drive
                    </p>

                    <div className="nc-card__actions">
                      <button
                        type="button"
                        className="cz-btn cz-btn--primary cz-btn--sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookAppointment?.(clinic);
                        }}
                      >
                        <Icon name="calendar" size={15} /> Book
                      </button>

                      <a
                        className="cz-btn cz-btn--secondary cz-btn--sm"
                        href={directionsUrl(clinic, origin)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Directions
                      </a>

                      {clinic.contact && (
                        <a
                          className="cz-btn cz-btn--ghost cz-btn--sm"
                          href={`tel:${clinic.contact}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
        </section>

        <div className="nc-map-wrap">
          <div ref={mapEl} className="nc-map" role="application" aria-label="Map of nearby clinics" />
          {busy && <div className="nc-map-loading"><span className="nc-pulse" /> Finding clinics…</div>}
        </div>
      </div>
    </div>
  );
}

export default NearbyClinics;
