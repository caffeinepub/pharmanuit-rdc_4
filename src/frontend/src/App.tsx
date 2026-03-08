import { useCallback, useEffect, useRef, useState } from "react";
import type { Pharmacy } from "./backend.d";
import {
  useAllPharmacies,
  useApprovePharmacy,
  useApprovedPharmacies,
  useInitializeSeedData,
  useRejectPharmacy,
  useRevokePharmacy,
  useSubmitPharmacy,
  useTogglePharmacyVisibility,
} from "./hooks/useQueries";

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = "home" | "nearby" | "register" | "admin";

// ─── Haversine distance (km) ─────────────────────────────────────────────────
function haversine(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Night pharmacy: open 20:00 – 06:00 ──────────────────────────────────────
function isPharmacyOpen(): boolean {
  const h = new Date().getHours();
  return h >= 20 || h < 6;
}

// ─── SVG Icons ───────────────────────────────────────────────────────────────
function CrossIcon({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <rect x="15" y="4" width="10" height="32" rx="2" fill="#00c853" />
      <rect x="4" y="15" width="32" height="10" rx="2" fill="#00c853" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4l-6 6 6 6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1-9.4 0-17-7.6-17-17 0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z"
        fill="currentColor"
      />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
        fill="currentColor"
      />
    </svg>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
      <div className="spinner" />
    </div>
  );
}

// ─── Inline spinner (for buttons) ────────────────────────────────────────────
function BtnSpinner() {
  return (
    <div
      style={{
        width: 20,
        height: 20,
        border: "2px solid #000",
        borderTopColor: "transparent",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

// ─── Back button (reusable) ───────────────────────────────────────────────────
function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "0.625rem",
        color: "#ffffff",
        padding: "0.625rem",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        minWidth: 40,
        minHeight: 40,
      }}
      aria-label="Retour"
    >
      <BackIcon />
    </button>
  );
}

// ─── Screen: HOME ─────────────────────────────────────────────────────────────
function HomeScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleLogoCoffeeTap = useCallback(
    (e?: React.MouseEvent | React.KeyboardEvent) => {
      // For keyboard events, only count Enter/Space presses
      if (e && "key" in e && e.key !== "Enter" && e.key !== " ") return;

      tapCountRef.current += 1;

      // Reset timer
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }

      if (tapCountRef.current >= 5) {
        tapCountRef.current = 0;
        onNavigate("admin");
        return;
      }

      // Reset counter after 3 seconds of inactivity
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 3000);
    },
    [onNavigate],
  );

  return (
    <div
      className="screen-fade-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 1rem",
      }}
    >
      {/* Header */}
      <header
        style={{
          paddingTop: "3rem",
          paddingBottom: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "1rem",
          }}
        >
          <div
            className="cross-pulse"
            role="img"
            aria-label="PharmaNuit RDC"
            onClick={handleLogoCoffeeTap}
            onKeyDown={handleLogoCoffeeTap}
            style={{
              background: "radial-gradient(circle, #0a2e17 0%, #050f0a 100%)",
              borderRadius: "50%",
              padding: "1.25rem",
              border: "1px solid #00c85333",
              boxShadow: "0 0 30px rgba(0,200,83,0.15)",
              cursor: "default",
              userSelect: "none",
              WebkitUserSelect: "none",
            }}
          >
            <CrossIcon size={48} />
          </div>
        </div>
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-0.02em",
            marginBottom: "0.375rem",
            lineHeight: 1.2,
          }}
        >
          PharmaNuit <span style={{ color: "#00c853" }}>RDC</span>
        </h1>
        <p style={{ color: "#888888", fontSize: "15px", fontWeight: 500 }}>
          Pharmacies de nuit en République Démocratique du Congo
        </p>
      </header>

      {/* Main CTAs */}
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.875rem",
        }}
      >
        <button
          type="button"
          data-ocid="home.find_pharmacy.primary_button"
          className="pharma-btn-primary"
          onClick={() => onNavigate("nearby")}
          style={{ fontSize: "1.125rem", minHeight: "64px" }}
        >
          <span style={{ fontSize: "1.25rem" }}>🔍</span>
          Trouver pharmacie proche
        </button>

        <button
          type="button"
          data-ocid="home.itinerary.secondary_button"
          className="pharma-btn-secondary"
          onClick={() => onNavigate("nearby")}
          style={{ minHeight: "64px" }}
        >
          <span style={{ fontSize: "1.25rem" }}>🗺️</span>
          Itinéraire
        </button>

        <hr className="divider" />

        <button
          type="button"
          data-ocid="home.register.tab"
          className="pharma-btn-secondary"
          onClick={() => onNavigate("register")}
          style={{ minHeight: "56px" }}
        >
          <span style={{ fontSize: "1.125rem" }}>📝</span>
          Inscrire ma pharmacie
        </button>
      </main>

      {/* Info block */}
      <div
        className="pharma-card"
        style={{
          margin: "1.5rem 0",
          padding: "1rem",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        <span style={{ fontSize: "1.25rem", flexShrink: 0, marginTop: "2px" }}>
          🌙
        </span>
        <p
          style={{
            color: "#aaaaaa",
            fontSize: "14px",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          Les pharmacies de nuit sont ouvertes de{" "}
          <strong style={{ color: "#00c853" }}>20h00 à 06h00</strong>. Trouvez
          la pharmacie agréée la plus proche de votre position.
        </p>
      </div>
    </div>
  );
}

// ─── Screen: NEARBY ───────────────────────────────────────────────────────────
function NearbyScreen({ onBack }: { onBack: () => void }) {
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const { data: pharmacies, isLoading: pharmaLoading } =
    useApprovedPharmacies();

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("La géolocalisation n'est pas disponible sur cet appareil.");
      setGeoLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoLoading(false);
      },
      (err) => {
        if (err.code === 1) {
          setGeoError(
            "Accès à la localisation refusé. Veuillez autoriser l'accès dans les paramètres.",
          );
        } else if (err.code === 2) {
          setGeoError("Position introuvable. Vérifiez que le GPS est activé.");
        } else {
          setGeoError("Impossible d'obtenir votre position. Réessayez.");
        }
        setGeoLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: false },
    );
  }, []);

  const isLoading = geoLoading || pharmaLoading;
  const isOpen = isPharmacyOpen();

  const nearest: Pharmacy | null = (() => {
    if (!userCoords || !pharmacies || pharmacies.length === 0) return null;
    let best: Pharmacy | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const p of pharmacies) {
      const d = haversine(userCoords.lat, userCoords.lng, p.lat, p.lng);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  })();

  const mapsUrl = nearest
    ? `https://www.google.com/maps/dir/?api=1&destination=${nearest.lat},${nearest.lng}`
    : "#";

  return (
    <div
      className="screen-fade-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 1rem",
      }}
    >
      {/* Header */}
      <header
        style={{
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <BackButton onClick={onBack} />
        <div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Pharmacie la plus proche
          </h2>
          <p style={{ color: "#888888", fontSize: "13px", margin: 0 }}>
            Basé sur votre position GPS
          </p>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {isLoading && (
          <div
            data-ocid="nearby.loading_state"
            style={{ textAlign: "center", paddingTop: "3rem" }}
          >
            <Spinner />
            <p
              style={{ color: "#888888", marginTop: "1rem", fontSize: "16px" }}
            >
              {geoLoading
                ? "Localisation en cours…"
                : "Recherche des pharmacies…"}
            </p>
          </div>
        )}

        {!isLoading && (geoError || (!nearest && !geoError)) && (
          <div
            data-ocid="nearby.error_state"
            className="pharma-card"
            style={{
              padding: "1.5rem",
              textAlign: "center",
              marginTop: "1rem",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>
              {geoError ? "📍" : "🏥"}
            </div>
            <p
              style={{
                color: "#ff5252",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "0.75rem",
              }}
            >
              {geoError ?? "Aucune pharmacie approuvée trouvée"}
            </p>
            <p style={{ color: "#888888", fontSize: "14px" }}>
              {geoError
                ? "Activez la localisation et rechargez la page."
                : "Aucune pharmacie de nuit n'est encore disponible dans votre zone."}
            </p>
          </div>
        )}

        {!isLoading && !geoError && nearest && (
          <div
            data-ocid="nearby.pharmacy.card"
            className="pharma-card"
            style={{ padding: "1.5rem", marginTop: "0.5rem" }}
          >
            {/* Status */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                flexWrap: "wrap",
                gap: "0.5rem",
              }}
            >
              <span
                style={{ fontSize: "13px", color: "#666666", fontWeight: 500 }}
              >
                🏥 Pharmacie de nuit
              </span>
              <span className={isOpen ? "status-open" : "status-closed"}>
                {isOpen ? "✅ Ouvert" : "❌ Fermé"}
              </span>
            </div>

            <h3
              style={{
                fontSize: "1.625rem",
                fontWeight: 800,
                color: "#ffffff",
                marginBottom: "0.75rem",
                lineHeight: 1.2,
              }}
            >
              {nearest.nom}
            </h3>

            <p
              style={{
                color: "#cccccc",
                fontSize: "16px",
                marginBottom: "0.5rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.5rem",
              }}
            >
              <span style={{ flexShrink: 0, marginTop: "2px" }}>📍</span>
              {nearest.adresse}
            </p>

            <p
              style={{
                color: "#888888",
                fontSize: "15px",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>📞</span>
              {nearest.tel}
            </p>

            <hr className="divider" style={{ margin: "1rem 0" }} />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <a
                data-ocid="nearby.call.primary_button"
                href={`tel:${nearest.tel}`}
                className="pharma-btn-primary"
                style={{ textDecoration: "none" }}
              >
                <PhoneIcon />📞 APPEL 1 MIN
              </a>

              <a
                data-ocid="nearby.maps.secondary_button"
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="pharma-btn-secondary"
                style={{ textDecoration: "none" }}
              >
                <MapIcon />
                🗺️ Google Maps
              </a>
            </div>
          </div>
        )}

        {!isLoading && !geoError && nearest && (
          <div
            className="pharma-card"
            style={{
              padding: "1rem",
              marginTop: "1rem",
              display: "flex",
              gap: "0.75rem",
              alignItems: "flex-start",
            }}
          >
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>ℹ️</span>
            <p
              style={{
                color: "#888888",
                fontSize: "13px",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              Horaires:{" "}
              <strong style={{ color: "#00c853" }}>20h00 – 06h00</strong>. Le
              bouton "APPEL 1 MIN" vous connecte directement à la pharmacie.
            </p>
          </div>
        )}
      </main>

      <footer
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          paddingTop: "1.5rem",
        }}
      >
        <button
          type="button"
          data-ocid="nearby.back.button"
          className="pharma-btn-secondary"
          onClick={onBack}
          style={{ fontSize: "16px", minHeight: "48px" }}
        >
          <BackIcon />
          Retour à l'accueil
        </button>
      </footer>
    </div>
  );
}

// ─── Screen: REGISTER ─────────────────────────────────────────────────────────
function RegisterScreen({ onBack }: { onBack: () => void }) {
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [adresse, setAdresse] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { mutateAsync: submitPharmacy, isPending } = useSubmitPharmacy();

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormError(null);

      if (!nom.trim() || !tel.trim() || !adresse.trim()) {
        setFormError("Veuillez remplir tous les champs obligatoires.");
        return;
      }

      const latNum = lat ? Number.parseFloat(lat) : 0;
      const lngNum = lng ? Number.parseFloat(lng) : 0;

      try {
        await submitPharmacy({
          nom: nom.trim(),
          tel: tel.trim(),
          adresse: adresse.trim(),
          lat: latNum,
          lng: lngNum,
        });
        setSubmitted(true);
        setNom("");
        setTel("");
        setAdresse("");
        setLat("");
        setLng("");
      } catch {
        setFormError("Une erreur s'est produite. Veuillez réessayer.");
      }
    },
    [nom, tel, adresse, lat, lng, submitPharmacy],
  );

  return (
    <div
      className="screen-fade-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 1rem",
      }}
    >
      <header
        style={{
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <BackButton onClick={onBack} />
        <div>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Inscrire ma pharmacie
          </h2>
          <p style={{ color: "#888888", fontSize: "13px", margin: 0 }}>
            Soumission pour approbation
          </p>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {submitted ? (
          <div
            data-ocid="register.success_state"
            className="pharma-card"
            style={{ padding: "2rem", textAlign: "center", marginTop: "1rem" }}
          >
            <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>✅</div>
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#00c853",
                marginBottom: "0.75rem",
              }}
            >
              Soumission réussie !
            </h3>
            <p style={{ color: "#cccccc", fontSize: "16px", lineHeight: 1.6 }}>
              Votre pharmacie a été soumise pour approbation. Vous serez
              contacté une fois la vérification effectuée.
            </p>
            <button
              type="button"
              className="pharma-btn-primary"
              onClick={() => setSubmitted(false)}
              style={{ marginTop: "1.5rem" }}
            >
              Soumettre une autre
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              {/* Nom */}
              <div>
                <label
                  htmlFor="reg-nom"
                  style={{
                    display: "block",
                    color: "#cccccc",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Nom de la pharmacie{" "}
                  <span style={{ color: "#00c853" }}>*</span>
                </label>
                <input
                  id="reg-nom"
                  data-ocid="register.nom.input"
                  className="pharma-input"
                  type="text"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex: Pharmacie Centrale Gombe"
                  required
                  autoComplete="organization"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label
                  htmlFor="reg-tel"
                  style={{
                    display: "block",
                    color: "#cccccc",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Téléphone <span style={{ color: "#00c853" }}>*</span>
                </label>
                <input
                  id="reg-tel"
                  data-ocid="register.tel.input"
                  className="pharma-input"
                  type="tel"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  placeholder="+243 81 234 5678"
                  required
                  autoComplete="tel"
                />
              </div>

              {/* Adresse */}
              <div>
                <label
                  htmlFor="reg-adresse"
                  style={{
                    display: "block",
                    color: "#cccccc",
                    fontSize: "14px",
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                  }}
                >
                  Adresse complète <span style={{ color: "#00c853" }}>*</span>
                </label>
                <input
                  id="reg-adresse"
                  data-ocid="register.adresse.input"
                  className="pharma-input"
                  type="text"
                  value={adresse}
                  onChange={(e) => setAdresse(e.target.value)}
                  placeholder="Ex: Avenue Kisangani, Commune Gombe, Kinshasa"
                  required
                />
              </div>

              {/* Coordinates */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "0.75rem",
                }}
              >
                <div>
                  <label
                    htmlFor="reg-lat"
                    style={{
                      display: "block",
                      color: "#cccccc",
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Latitude
                  </label>
                  <input
                    id="reg-lat"
                    data-ocid="register.lat.input"
                    className="pharma-input"
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="-4.3217"
                  />
                </div>
                <div>
                  <label
                    htmlFor="reg-lng"
                    style={{
                      display: "block",
                      color: "#cccccc",
                      fontSize: "14px",
                      fontWeight: 600,
                      marginBottom: "0.5rem",
                    }}
                  >
                    Longitude
                  </label>
                  <input
                    id="reg-lng"
                    data-ocid="register.lng.input"
                    className="pharma-input"
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="15.3222"
                  />
                </div>
              </div>

              {formError && (
                <div
                  data-ocid="register.error_state"
                  style={{
                    background: "#2e0a0a",
                    border: "1px solid #c62828",
                    borderRadius: "0.75rem",
                    padding: "0.875rem 1rem",
                    color: "#ff5252",
                    fontSize: "14px",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  ❌ {formError}
                </div>
              )}

              <div
                className="pharma-card"
                style={{
                  padding: "0.875rem",
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "flex-start",
                }}
              >
                <span style={{ flexShrink: 0, marginTop: "2px" }}>ℹ️</span>
                <p
                  style={{
                    color: "#888888",
                    fontSize: "13px",
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  Les coordonnées GPS permettent aux utilisateurs de trouver
                  votre pharmacie via Google Maps. Utilisez Google Maps pour
                  obtenir vos coordonnées exactes.
                </p>
              </div>

              <button
                data-ocid="register.submit.submit_button"
                className="pharma-btn-primary"
                type="submit"
                disabled={isPending}
                style={{
                  opacity: isPending ? 0.7 : 1,
                  minHeight: "60px",
                  fontSize: "1.125rem",
                }}
              >
                {isPending ? (
                  <>
                    <BtnSpinner />
                    Envoi en cours…
                  </>
                ) : (
                  <>📝 Soumettre ma pharmacie</>
                )}
              </button>
            </div>
          </form>
        )}
      </main>

      <footer
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          paddingTop: "1.5rem",
        }}
      >
        <button
          type="button"
          className="pharma-btn-secondary"
          onClick={onBack}
          style={{ fontSize: "16px", minHeight: "48px" }}
        >
          <BackIcon />
          Retour à l'accueil
        </button>
      </footer>
    </div>
  );
}

// ─── Admin: Pending Pharmacy Card ─────────────────────────────────────────────
function PendingPharmacyCard({
  pharmacy,
  index,
  onApprove,
  onReject,
  isAnyPending,
}: {
  pharmacy: Pharmacy;
  index: number;
  onApprove: (id: bigint) => void;
  onReject: (id: bigint) => void;
  isAnyPending: boolean;
}) {
  return (
    <div
      data-ocid={`admin.pending.item.${index}`}
      className="pharma-card"
      style={{ padding: "1rem" }}
    >
      <p
        style={{
          fontWeight: 700,
          fontSize: "1rem",
          color: "#ffffff",
          marginBottom: "0.25rem",
        }}
      >
        {pharmacy.nom}
      </p>
      <p
        style={{ color: "#888888", fontSize: "14px", marginBottom: "0.125rem" }}
      >
        📞 {pharmacy.tel}
      </p>
      <p style={{ color: "#888888", fontSize: "14px", marginBottom: "1rem" }}>
        📍 {pharmacy.adresse}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.625rem",
        }}
      >
        <button
          type="button"
          data-ocid={`admin.approve.button.${index}`}
          className="pharma-btn-success"
          onClick={() => onApprove(pharmacy.id)}
          disabled={isAnyPending}
          style={{
            opacity: isAnyPending ? 0.6 : 1,
            minHeight: 44,
            fontSize: "14px",
          }}
        >
          ✅ Approuver
        </button>
        <button
          type="button"
          data-ocid={`admin.reject.button.${index}`}
          className="pharma-btn-danger"
          onClick={() => onReject(pharmacy.id)}
          disabled={isAnyPending}
          style={{
            opacity: isAnyPending ? 0.6 : 1,
            minHeight: 44,
            fontSize: "14px",
          }}
        >
          ❌ Rejeter
        </button>
      </div>
    </div>
  );
}

// ─── Admin: Approved Pharmacy Card ───────────────────────────────────────────
function ApprovedPharmacyCard({
  pharmacy,
  index,
  onRevoke,
  onToggleVisibility,
  isAnyPending,
  isTogglingVisibility,
}: {
  pharmacy: Pharmacy;
  index: number;
  onRevoke: (id: bigint) => void;
  onToggleVisibility: (id: bigint) => void;
  isAnyPending: boolean;
  isTogglingVisibility: boolean;
}) {
  return (
    <div
      data-ocid={`admin.approved.item.${index}`}
      className="pharma-card"
      style={{ padding: "1rem" }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <p
          style={{
            fontWeight: 700,
            fontSize: "1rem",
            color: "#ffffff",
            margin: 0,
            flex: 1,
          }}
        >
          {pharmacy.nom}
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "9999px",
              background: pharmacy.visible ? "#0a2e17" : "#2e0a0a",
              color: pharmacy.visible ? "#00c853" : "#ff5252",
              border: `1px solid ${pharmacy.visible ? "#00c85355" : "#ff525255"}`,
            }}
          >
            {pharmacy.visible ? "🟢 Visible" : "🔴 Masqué"}
          </span>
          <span className="status-open" style={{ fontSize: "12px" }}>
            ✅
          </span>
        </div>
      </div>
      <p
        style={{ color: "#888888", fontSize: "14px", marginBottom: "0.125rem" }}
      >
        📞 {pharmacy.tel}
      </p>
      <p style={{ color: "#888888", fontSize: "14px", marginBottom: "1rem" }}>
        📍 {pharmacy.adresse}
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.625rem",
        }}
      >
        <button
          type="button"
          data-ocid={`admin.toggle_visibility.button.${index}`}
          className={
            pharmacy.visible ? "pharma-btn-danger" : "pharma-btn-success"
          }
          onClick={() => onToggleVisibility(pharmacy.id)}
          disabled={isAnyPending || isTogglingVisibility}
          style={{
            opacity: isAnyPending || isTogglingVisibility ? 0.6 : 1,
            minHeight: 44,
            fontSize: "13px",
          }}
        >
          {pharmacy.visible ? "👁️ Masquer" : "👁️ Afficher"}
        </button>
        <button
          type="button"
          data-ocid={`admin.revoke.button.${index}`}
          className="pharma-btn-danger"
          onClick={() => onRevoke(pharmacy.id)}
          disabled={isAnyPending || isTogglingVisibility}
          style={{
            opacity: isAnyPending || isTogglingVisibility ? 0.6 : 1,
            minHeight: 44,
            fontSize: "13px",
          }}
        >
          🔄 Révoquer
        </button>
      </div>
    </div>
  );
}

// ─── Admin password gate ──────────────────────────────────────────────────────
const ADMIN_PASSWORD = "pharma2026@!!!!";

// ─── Screen: ADMIN ────────────────────────────────────────────────────────────
function AdminScreen({ onBack }: { onBack: () => void }) {
  const [adminAuthed, setAdminAuthed] = useState(
    () => sessionStorage.getItem("pharma_admin_authed") === "1",
  );
  const [passwordInput, setPasswordInput] = useState("");
  const [pwError, setPwError] = useState(false);

  const { data: allPharmacies, isLoading: pharmaLoading } = useAllPharmacies();
  const { mutate: approve, isPending: isApproving } = useApprovePharmacy();
  const { mutate: reject, isPending: isRejecting } = useRejectPharmacy();
  const { mutate: revoke, isPending: isRevoking } = useRevokePharmacy();
  const { mutate: toggleVisibility, isPending: isTogglingVisibility } =
    useTogglePharmacyVisibility();
  const { mutate: initSeed, isPending: isSeeding } = useInitializeSeedData();

  const [seedDone, setSeedDone] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "stats">(
    "pending",
  );

  useEffect(() => {
    if (adminAuthed && !seedDone && !isSeeding) {
      setSeedDone(true);
      initSeed();
    }
  }, [adminAuthed, seedDone, isSeeding, initSeed]);

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === ADMIN_PASSWORD) {
        sessionStorage.setItem("pharma_admin_authed", "1");
        setAdminAuthed(true);
        setPwError(false);
      } else {
        setPwError(true);
        setTimeout(() => {
          setPasswordInput("");
          setPwError(false);
        }, 1000);
      }
    },
    [passwordInput],
  );

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem("pharma_admin_authed");
    setAdminAuthed(false);
    setPasswordInput("");
    setPwError(false);
  }, []);

  const pendingPharmacies =
    allPharmacies?.filter((p) => p.statut === "en_attente") ?? [];
  const approvedPharmacies =
    allPharmacies?.filter((p) => p.statut === "approuve") ?? [];
  const visiblePharmacies =
    allPharmacies?.filter((p) => p.statut === "approuve" && p.visible) ?? [];

  const isMutating =
    isApproving || isRejecting || isRevoking || isTogglingVisibility;

  return (
    <div
      className="screen-fade-in"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding: "0 1rem",
      }}
    >
      {/* Header */}
      <header
        style={{
          paddingTop: "1.5rem",
          paddingBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <BackButton onClick={onBack} />
        <div style={{ flex: 1 }}>
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#ffffff",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            Administration
          </h2>
          <p style={{ color: "#888888", fontSize: "13px", margin: 0 }}>
            Gestion des pharmacies
          </p>
        </div>
        {adminAuthed && (
          <button
            type="button"
            data-ocid="admin.logout.button"
            onClick={handleLogout}
            style={{
              background: "#1a1a1a",
              border: "1px solid #2a2a2a",
              borderRadius: "0.625rem",
              color: "#888888",
              padding: "0.5rem 0.875rem",
              cursor: "pointer",
              fontSize: "13px",
              flexShrink: 0,
            }}
          >
            Déconnexion
          </button>
        )}
      </header>

      <main style={{ flex: 1 }}>
        {/* Password gate */}
        {!adminAuthed && (
          <div style={{ paddingTop: "2rem" }}>
            <div
              className="pharma-card"
              style={{ padding: "2rem", marginBottom: "1.5rem" }}
            >
              {/* Lock icon */}
              <div
                style={{
                  background:
                    "radial-gradient(circle, #0a2e17 0%, #050f0a 100%)",
                  borderRadius: "50%",
                  width: 72,
                  height: 72,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 1.25rem",
                  border: "1px solid #00c85333",
                  boxShadow: "0 0 20px rgba(0,200,83,0.1)",
                }}
              >
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="11"
                    width="18"
                    height="11"
                    rx="2"
                    fill="#00c853"
                    fillOpacity="0.15"
                    stroke="#00c853"
                    strokeWidth="1.5"
                  />
                  <path
                    d="M7 11V7a5 5 0 0 1 10 0v4"
                    stroke="#00c853"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <circle cx="12" cy="16" r="1.5" fill="#00c853" />
                </svg>
              </div>

              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#ffffff",
                  marginBottom: "0.5rem",
                  textAlign: "center",
                }}
              >
                Espace Administrateur
              </h3>

              <form
                onSubmit={handlePasswordSubmit}
                noValidate
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  marginTop: "1.5rem",
                }}
              >
                <input
                  data-ocid="admin.password.input"
                  className="pharma-input"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (pwError) setPwError(false);
                  }}
                  placeholder="Mot de passe administrateur"
                  autoComplete="current-password"
                  style={{
                    border: pwError ? "1px solid #ff5252" : "1px solid #2a2a2a",
                  }}
                />

                {pwError && (
                  <div
                    data-ocid="admin.password.error_state"
                    style={{
                      background: "#2e0a0a",
                      border: "1px solid #c62828",
                      borderRadius: "0.75rem",
                      padding: "0.75rem 1rem",
                      color: "#ff5252",
                      fontSize: "14px",
                      textAlign: "center",
                      fontWeight: 600,
                    }}
                  >
                    Mot de passe incorrect
                  </div>
                )}

                <button
                  data-ocid="admin.password.submit_button"
                  type="submit"
                  className="pharma-btn-primary"
                  style={{ minHeight: "56px", fontSize: "1rem" }}
                >
                  🔓 Accéder
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Admin dashboard */}
        {adminAuthed && (
          <div>
            {/* Tabs */}
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                marginBottom: "1.25rem",
                overflowX: "auto",
                paddingBottom: "0.25rem",
              }}
            >
              <button
                type="button"
                data-ocid="admin.pending.tab"
                className={`tab-btn ${activeTab === "pending" ? "tab-btn-active" : "tab-btn-inactive"}`}
                onClick={() => setActiveTab("pending")}
              >
                ⏳ En attente
                {pendingPharmacies.length > 0 && (
                  <span
                    style={{
                      background: activeTab === "pending" ? "#000" : "#00c853",
                      color: activeTab === "pending" ? "#00c853" : "#000",
                      borderRadius: "9999px",
                      padding: "0 6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginLeft: "0.375rem",
                    }}
                  >
                    {pendingPharmacies.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                data-ocid="admin.approved.tab"
                className={`tab-btn ${activeTab === "approved" ? "tab-btn-active" : "tab-btn-inactive"}`}
                onClick={() => setActiveTab("approved")}
              >
                ✅ Approuvées
                {approvedPharmacies.length > 0 && (
                  <span
                    style={{
                      background: activeTab === "approved" ? "#000" : "#00c853",
                      color: activeTab === "approved" ? "#00c853" : "#000",
                      borderRadius: "9999px",
                      padding: "0 6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginLeft: "0.375rem",
                    }}
                  >
                    {approvedPharmacies.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                data-ocid="admin.stats.tab"
                className={`tab-btn ${activeTab === "stats" ? "tab-btn-active" : "tab-btn-inactive"}`}
                onClick={() => setActiveTab("stats")}
              >
                📊 Statistiques
              </button>
            </div>

            {pharmaLoading || isSeeding ? (
              <div data-ocid="admin.loading_state">
                <Spinner />
              </div>
            ) : activeTab === "pending" ? (
              <div data-ocid="admin.pending.list">
                {pendingPharmacies.length === 0 ? (
                  <div
                    data-ocid="admin.pending.empty_state"
                    className="pharma-card"
                    style={{ padding: "2rem", textAlign: "center" }}
                  >
                    <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                      🎉
                    </p>
                    <p style={{ color: "#888888", fontSize: "16px" }}>
                      Aucune pharmacie en attente d'approbation.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                    }}
                  >
                    {pendingPharmacies.map((p, i) => (
                      <PendingPharmacyCard
                        key={p.id.toString()}
                        pharmacy={p}
                        index={i + 1}
                        onApprove={(id) => approve(id)}
                        onReject={(id) => reject(id)}
                        isAnyPending={isMutating}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === "approved" ? (
              <div data-ocid="admin.approved.list">
                {approvedPharmacies.length === 0 ? (
                  <div
                    data-ocid="admin.approved.empty_state"
                    className="pharma-card"
                    style={{ padding: "2rem", textAlign: "center" }}
                  >
                    <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                      🏥
                    </p>
                    <p style={{ color: "#888888", fontSize: "16px" }}>
                      Aucune pharmacie approuvée pour l'instant.
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.875rem",
                    }}
                  >
                    {approvedPharmacies.map((p, i) => (
                      <ApprovedPharmacyCard
                        key={p.id.toString()}
                        pharmacy={p}
                        index={i + 1}
                        onRevoke={(id) => revoke(id)}
                        onToggleVisibility={(id) => toggleVisibility(id)}
                        isAnyPending={isMutating}
                        isTogglingVisibility={isTogglingVisibility}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ─── Stats Tab ─── */
              <div data-ocid="admin.stats.panel">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.875rem",
                  }}
                >
                  {/* Total enregistrées */}
                  <div
                    data-ocid="admin.stats.total.card"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "0.875rem",
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#666666",
                          fontSize: "13px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Total enregistrées
                      </p>
                      <p
                        style={{
                          color: "#00c853",
                          fontSize: "2.5rem",
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {allPharmacies?.length ?? 0}
                      </p>
                    </div>
                    <span style={{ fontSize: "2.5rem", opacity: 0.6 }}>🏥</span>
                  </div>

                  {/* En attente */}
                  <div
                    data-ocid="admin.stats.pending.card"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "0.875rem",
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#666666",
                          fontSize: "13px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "0.375rem",
                        }}
                      >
                        En attente
                      </p>
                      <p
                        style={{
                          color: "#ffb300",
                          fontSize: "2.5rem",
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {pendingPharmacies.length}
                      </p>
                    </div>
                    <span style={{ fontSize: "2.5rem", opacity: 0.6 }}>⏳</span>
                  </div>

                  {/* Visibles */}
                  <div
                    data-ocid="admin.stats.visible.card"
                    style={{
                      background: "#1a1a1a",
                      border: "1px solid #2a2a2a",
                      borderRadius: "0.875rem",
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "1rem",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          color: "#666666",
                          fontSize: "13px",
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          marginBottom: "0.375rem",
                        }}
                      >
                        Visibles aux utilisateurs
                      </p>
                      <p
                        style={{
                          color: "#00c853",
                          fontSize: "2.5rem",
                          fontWeight: 800,
                          lineHeight: 1,
                        }}
                      >
                        {visiblePharmacies.length}
                      </p>
                    </div>
                    <span style={{ fontSize: "2.5rem", opacity: 0.6 }}>👁️</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer
        style={{
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))",
          paddingTop: "1.5rem",
        }}
      >
        <button
          type="button"
          className="pharma-btn-secondary"
          onClick={onBack}
          style={{ fontSize: "16px", minHeight: "48px" }}
        >
          <BackIcon />
          Retour à l'accueil
        </button>
      </footer>
    </div>
  );
}

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  const navigate = useCallback((s: Screen) => setScreen(s), []);
  const goHome = useCallback(() => setScreen("home"), []);

  return (
    <div
      style={{
        backgroundColor: "#0a0a0a",
        minHeight: "100vh",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {screen === "home" && <HomeScreen onNavigate={navigate} />}
      {screen === "nearby" && <NearbyScreen onBack={goHome} />}
      {screen === "register" && <RegisterScreen onBack={goHome} />}
      {screen === "admin" && <AdminScreen onBack={goHome} />}
    </div>
  );
}
