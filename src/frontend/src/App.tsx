import { useCallback, useEffect, useRef, useState } from "react";
import type { Pharmacy } from "./backend.d";
import {
  useAllPharmacies,
  useApprovePharmacy,
  useApprovedPharmacies,
  useGetPharmacyByName,
  useInitializeSeedData,
  useRejectPharmacy,
  useRevokePharmacy,
  useSetPharmacyOpenStatus,
  useSubmitPharmacy,
  useTogglePharmacyVisibility,
} from "./hooks/useQueries";

// ─── Types ───────────────────────────────────────────────────────────────────
type Screen = "home" | "nearby" | "register" | "admin" | "pharmacien";

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
  const pharmacistTapCountRef = useRef(0);
  const pharmacistTapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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

  // Secret tap on "Inscrire ma pharmacie" button to open pharmacist space
  const handleRegisterSecretTap = useCallback(() => {
    pharmacistTapCountRef.current += 1;

    if (pharmacistTapTimerRef.current) {
      clearTimeout(pharmacistTapTimerRef.current);
    }

    if (pharmacistTapCountRef.current >= 3) {
      pharmacistTapCountRef.current = 0;
      onNavigate("pharmacien");
      return;
    }

    pharmacistTapTimerRef.current = setTimeout(() => {
      pharmacistTapCountRef.current = 0;
    }, 2000);
  }, [onNavigate]);

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

      {/* Invisible secret tap zone for pharmacist access (bottom right) */}
      <button
        type="button"
        onClick={handleRegisterSecretTap}
        tabIndex={-1}
        aria-hidden="true"
        style={{
          position: "fixed",
          bottom: 0,
          right: 0,
          width: 60,
          height: 60,
          zIndex: 9999,
          background: "transparent",
          border: "none",
          cursor: "default",
          WebkitTapHighlightColor: "transparent",
          outline: "none",
          padding: 0,
        }}
      />

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

      try {
        await submitPharmacy({
          nom: nom.trim(),
          tel: tel.trim(),
          adresse: adresse.trim(),
        });
        setSubmitted(true);
        setNom("");
        setTel("");
        setAdresse("");
      } catch {
        setFormError("Une erreur s'est produite. Veuillez réessayer.");
      }
    },
    [nom, tel, adresse, submitPharmacy],
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
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              paddingTop: "2rem",
              gap: "1.25rem",
            }}
          >
            {/* Waiting icon */}
            <div
              style={{
                background: "radial-gradient(circle, #2e1a00 0%, #1a0e00 100%)",
                borderRadius: "50%",
                width: 96,
                height: 96,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #ffb30055",
                boxShadow: "0 0 30px rgba(255,179,0,0.15)",
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: "3rem" }}>⏳</span>
            </div>

            <div>
              <h3
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 800,
                  color: "#ffb300",
                  marginBottom: "0.75rem",
                  lineHeight: 1.2,
                }}
              >
                Demande envoyée
              </h3>
              <p
                style={{
                  color: "#cccccc",
                  fontSize: "16px",
                  lineHeight: 1.7,
                  maxWidth: "340px",
                }}
              >
                Votre pharmacie a été soumise. Vous n'êtes pas encore enregistré
                dans le système. L'administrateur va vérifier votre dossier.
                Vous serez approuvé prochainement.
              </p>
            </div>

            {/* Status badge */}
            <div
              style={{
                background: "#2e1a00",
                border: "1px solid #ffb30055",
                borderRadius: "9999px",
                padding: "0.5rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#ffb300",
                  display: "inline-block",
                  animation: "pulseDot 1.5s ease-in-out infinite",
                }}
              />
              <span
                style={{ color: "#ffb300", fontSize: "14px", fontWeight: 600 }}
              >
                En attente d'approbation
              </span>
            </div>

            <button
              type="button"
              data-ocid="register.back.button"
              className="pharma-btn-secondary"
              onClick={onBack}
              style={{
                marginTop: "0.5rem",
                minHeight: "56px",
                fontSize: "1rem",
                width: "100%",
              }}
            >
              <BackIcon />
              Retour à l'accueil
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
}: {
  pharmacy: Pharmacy;
  index: number;
  onApprove: (id: bigint) => Promise<void>;
  onReject: (id: bigint) => Promise<void>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const isBusy = isApproving || isRejecting;

  const handleApprove = async () => {
    if (isBusy) return;
    setIsApproving(true);
    try {
      await onApprove(pharmacy.id);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (isBusy) return;
    setIsRejecting(true);
    try {
      await onReject(pharmacy.id);
    } finally {
      setIsRejecting(false);
    }
  };

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
          onClick={handleApprove}
          disabled={isBusy}
          style={{
            opacity: isBusy ? 0.6 : 1,
            minHeight: 44,
            fontSize: "14px",
          }}
        >
          {isApproving ? (
            <>
              <BtnSpinner />
              En cours…
            </>
          ) : (
            <>✅ Approuver</>
          )}
        </button>
        <button
          type="button"
          data-ocid={`admin.reject.button.${index}`}
          className="pharma-btn-danger"
          onClick={handleReject}
          disabled={isBusy}
          style={{
            opacity: isBusy ? 0.6 : 1,
            minHeight: 44,
            fontSize: "14px",
          }}
        >
          {isRejecting ? (
            <>
              <BtnSpinner />
              En cours…
            </>
          ) : (
            <>❌ Rejeter</>
          )}
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
}: {
  pharmacy: Pharmacy;
  index: number;
  onRevoke: (id: bigint) => Promise<void>;
  onToggleVisibility: (id: bigint) => Promise<void>;
}) {
  const [isTogglingVis, setIsTogglingVis] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const isBusy = isTogglingVis || isRevoking;

  const handleToggle = async () => {
    if (isBusy) return;
    setIsTogglingVis(true);
    try {
      await onToggleVisibility(pharmacy.id);
    } finally {
      setIsTogglingVis(false);
    }
  };

  const handleRevoke = async () => {
    if (isBusy) return;
    setIsRevoking(true);
    try {
      await onRevoke(pharmacy.id);
    } finally {
      setIsRevoking(false);
    }
  };

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
          onClick={handleToggle}
          disabled={isBusy}
          style={{
            opacity: isBusy ? 0.6 : 1,
            minHeight: 44,
            fontSize: "13px",
          }}
        >
          {isTogglingVis ? (
            <>
              <BtnSpinner />
              En cours…
            </>
          ) : pharmacy.visible ? (
            "👁️ Masquer"
          ) : (
            "👁️ Afficher"
          )}
        </button>
        <button
          type="button"
          data-ocid={`admin.revoke.button.${index}`}
          className="pharma-btn-danger"
          onClick={handleRevoke}
          disabled={isBusy}
          style={{
            opacity: isBusy ? 0.6 : 1,
            minHeight: 44,
            fontSize: "13px",
          }}
        >
          {isRevoking ? (
            <>
              <BtnSpinner />
              En cours…
            </>
          ) : (
            "🔄 Révoquer"
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Screen: PHARMACIST ───────────────────────────────────────────────────────
function PharmacistScreen({
  onBack,
  onViewPublic,
}: {
  onBack: () => void;
  onViewPublic: () => void;
}) {
  const [searchNom, setSearchNom] = useState("");
  const [pharmacy, setPharmacy] = useState<Pharmacy | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const { mutateAsync: getPharmacyByName, isPending: isSearching } =
    useGetPharmacyByName();
  const { mutateAsync: setOpenStatus, isPending: isTogglingOpen } =
    useSetPharmacyOpenStatus();

  const handleSearch = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchNom.trim()) return;
      setNotFound(false);
      setPharmacy(null);
      setHasSearched(true);
      try {
        const result = await getPharmacyByName(searchNom.trim());
        if (result) {
          setPharmacy(result);
          setNotFound(false);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
    },
    [searchNom, getPharmacyByName],
  );

  const handleToggleOpen = useCallback(async () => {
    if (!pharmacy) return;
    const newStatus = !pharmacy.ouvert;
    try {
      await setOpenStatus({ id: pharmacy.id, isOpen: newStatus });
      setPharmacy((prev) => (prev ? { ...prev, ouvert: newStatus } : prev));
    } catch {
      // silently fail
    }
  }, [pharmacy, setOpenStatus]);

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
            Mon espace pharmacie
          </h2>
          <p style={{ color: "#888888", fontSize: "13px", margin: 0 }}>
            Gérez le statut de votre pharmacie
          </p>
        </div>
      </header>

      <main style={{ flex: 1 }}>
        {/* Search form */}
        <form onSubmit={handleSearch} noValidate>
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="pharmacist-search"
              style={{
                display: "block",
                color: "#cccccc",
                fontSize: "14px",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Nom de votre pharmacie
            </label>
            <input
              id="pharmacist-search"
              data-ocid="pharmacist.search_input"
              className="pharma-input"
              type="text"
              value={searchNom}
              onChange={(e) => setSearchNom(e.target.value)}
              placeholder="Ex: Pharmacie Centrale Gombe"
            />
          </div>
          <button
            data-ocid="pharmacist.search.button"
            type="submit"
            className="pharma-btn-primary"
            disabled={isSearching || !searchNom.trim()}
            style={{
              opacity: isSearching || !searchNom.trim() ? 0.7 : 1,
              minHeight: "56px",
              fontSize: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            {isSearching ? (
              <>
                <BtnSpinner />
                Recherche…
              </>
            ) : (
              <>🔍 Rechercher</>
            )}
          </button>
        </form>

        {/* Not found */}
        {hasSearched && notFound && (
          <div
            data-ocid="pharmacist.error_state"
            style={{
              background: "#2e0a0a",
              border: "1px solid #c62828",
              borderRadius: "0.75rem",
              padding: "1rem 1.25rem",
              color: "#ff5252",
              fontSize: "15px",
              display: "flex",
              alignItems: "center",
              gap: "0.625rem",
            }}
          >
            <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>❌</span>
            Pharmacie introuvable. Vérifiez le nom exact.
          </div>
        )}

        {/* Pending */}
        {pharmacy && pharmacy.statut === "en_attente" && (
          <div
            data-ocid="pharmacist.pending.card"
            style={{
              background: "#2e1a00",
              border: "1px solid #ffb30055",
              borderRadius: "0.875rem",
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⏳</div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#ffb300",
                marginBottom: "0.75rem",
              }}
            >
              En attente d'approbation
            </h3>
            <p style={{ color: "#cccccc", fontSize: "15px", lineHeight: 1.65 }}>
              Votre pharmacie{" "}
              <strong style={{ color: "#ffb300" }}>{pharmacy.nom}</strong> est
              en cours de vérification par l'administrateur.
            </p>
            <p
              style={{
                color: "#aaaaaa",
                fontSize: "13px",
                marginTop: "0.75rem",
                lineHeight: 1.6,
              }}
            >
              Une fois approuvée, revenez ici et recherchez votre pharmacie pour
              accéder à votre espace de gestion.
            </p>
          </div>
        )}

        {/* Rejected */}
        {pharmacy && pharmacy.statut === "rejete" && (
          <div
            data-ocid="pharmacist.rejected.card"
            style={{
              background: "#2e0a0a",
              border: "1px solid #c62828",
              borderRadius: "0.875rem",
              padding: "1.5rem",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🚫</div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#ff5252",
                marginBottom: "0.75rem",
              }}
            >
              Demande refusée
            </h3>
            <p style={{ color: "#cccccc", fontSize: "15px", lineHeight: 1.65 }}>
              Votre demande a été refusée. Contactez l'administrateur pour plus
              d'informations.
            </p>
          </div>
        )}

        {/* Approved: full pharmacist dashboard */}
        {pharmacy && pharmacy.statut === "approuve" && (
          <div
            data-ocid="pharmacist.dashboard.card"
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
            {/* Approval banner */}
            <div
              style={{
                background: "#0a2e17",
                border: "1px solid #00c85355",
                borderRadius: "0.875rem",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <span style={{ fontSize: "1.375rem", flexShrink: 0 }}>✅</span>
              <div>
                <p
                  style={{
                    color: "#00c853",
                    fontWeight: 700,
                    fontSize: "15px",
                    marginBottom: "0.25rem",
                  }}
                >
                  Pharmacie approuvée
                </p>
                <p
                  style={{
                    color: "#aaaaaa",
                    fontSize: "13px",
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  Votre pharmacie a été validée par l'administrateur. Vous avez
                  maintenant accès à votre espace pour gérer le statut
                  ouvert/fermé.
                </p>
              </div>
            </div>

            {/* Pharmacy name */}
            <div className="pharma-card" style={{ padding: "1.25rem" }}>
              <p
                style={{
                  color: "#666666",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.375rem",
                }}
              >
                Votre pharmacie
              </p>
              <h3
                style={{
                  fontSize: "1.375rem",
                  fontWeight: 800,
                  color: "#ffffff",
                  lineHeight: 1.2,
                  marginBottom: "1rem",
                }}
              >
                {pharmacy.nom}
              </h3>

              {/* Address */}
              <p
                style={{
                  color: "#cccccc",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.5rem",
                  marginBottom: "0.625rem",
                }}
              >
                <span style={{ flexShrink: 0, marginTop: "2px" }}>📍</span>
                {pharmacy.adresse}
              </p>

              {/* Phone */}
              <p
                style={{
                  color: "#cccccc",
                  fontSize: "15px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span style={{ flexShrink: 0 }}>📞</span>
                {pharmacy.tel}
              </p>
            </div>

            {/* Open/Closed toggle */}
            <div
              className="pharma-card"
              style={{ padding: "1.25rem", textAlign: "center" }}
            >
              <p
                style={{
                  color: "#666666",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: "0.875rem",
                }}
              >
                Statut actuel
              </p>

              {/* Status badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.625rem",
                  background: pharmacy.ouvert ? "#0a2e17" : "#1a0a0a",
                  border: `2px solid ${pharmacy.ouvert ? "#00c853" : "#ff5252"}`,
                  borderRadius: "9999px",
                  padding: "0.625rem 1.5rem",
                  marginBottom: "1.25rem",
                }}
              >
                <span style={{ fontSize: "1.25rem" }}>
                  {pharmacy.ouvert ? "🟢" : "🔴"}
                </span>
                <span
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: pharmacy.ouvert ? "#00c853" : "#ff5252",
                    letterSpacing: "0.05em",
                  }}
                >
                  {pharmacy.ouvert ? "OUVERT" : "FERMÉ"}
                </span>
              </div>

              <button
                type="button"
                data-ocid="pharmacist.toggle_open.toggle"
                className={
                  pharmacy.ouvert ? "pharma-btn-danger" : "pharma-btn-success"
                }
                onClick={handleToggleOpen}
                disabled={isTogglingOpen}
                style={{
                  opacity: isTogglingOpen ? 0.7 : 1,
                  minHeight: "56px",
                  fontSize: "1rem",
                  width: "100%",
                }}
              >
                {isTogglingOpen ? (
                  <>
                    <BtnSpinner />
                    Mise à jour…
                  </>
                ) : pharmacy.ouvert ? (
                  <>🔴 Fermer ma pharmacie</>
                ) : (
                  <>🟢 Ouvrir ma pharmacie</>
                )}
              </button>

              <p
                style={{
                  color: "#666666",
                  fontSize: "13px",
                  marginTop: "0.875rem",
                  lineHeight: 1.5,
                }}
              >
                ℹ️ Ce statut est visible par les utilisateurs qui cherchent une
                pharmacie.
              </p>
            </div>

            {/* View public space */}
            <button
              type="button"
              data-ocid="pharmacist.view_public.button"
              className="pharma-btn-secondary"
              onClick={onViewPublic}
              style={{ minHeight: "56px", fontSize: "1rem", width: "100%" }}
            >
              <span style={{ fontSize: "1.125rem" }}>🌍</span>
              Voir l'espace public
            </button>
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
          data-ocid="pharmacist.back.button"
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
  const { mutateAsync: approve } = useApprovePharmacy();
  const { mutateAsync: reject } = useRejectPharmacy();
  const { mutateAsync: revoke } = useRevokePharmacy();
  const { mutateAsync: toggleVisibility } = useTogglePharmacyVisibility();
  const { mutate: initSeed, isPending: isSeeding } = useInitializeSeedData();

  const [seedDone, setSeedDone] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pending" | "approved" | "stats" | "public"
  >("pending");

  useEffect(() => {
    if (adminAuthed && !seedDone && !isSeeding) {
      setSeedDone(true);
      initSeed();
    }
  }, [adminAuthed, seedDone, isSeeding, initSeed]);

  const handleApprove = useCallback(
    async (id: bigint) => {
      await approve(id);
    },
    [approve],
  );

  const handleReject = useCallback(
    async (id: bigint) => {
      await reject(id);
    },
    [reject],
  );

  const handleRevoke = useCallback(
    async (id: bigint) => {
      await revoke(id);
    },
    [revoke],
  );

  const handleToggleVisibility = useCallback(
    async (id: bigint) => {
      await toggleVisibility(id);
    },
    [toggleVisibility],
  );

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
              <button
                type="button"
                data-ocid="admin.public.tab"
                className={`tab-btn ${activeTab === "public" ? "tab-btn-active" : "tab-btn-inactive"}`}
                onClick={() => setActiveTab("public")}
              >
                🌍 Vue public
                {visiblePharmacies.length > 0 && (
                  <span
                    style={{
                      background: activeTab === "public" ? "#000" : "#00c853",
                      color: activeTab === "public" ? "#00c853" : "#000",
                      borderRadius: "9999px",
                      padding: "0 6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      marginLeft: "0.375rem",
                    }}
                  >
                    {visiblePharmacies.length}
                  </span>
                )}
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
                        onApprove={handleApprove}
                        onReject={handleReject}
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
                        onRevoke={handleRevoke}
                        onToggleVisibility={handleToggleVisibility}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : /* ─── Public Tab ─── */
            activeTab === "public" ? (
              <div data-ocid="admin.public.list">
                {visiblePharmacies.length === 0 ? (
                  <div
                    data-ocid="admin.public.empty_state"
                    className="pharma-card"
                    style={{ padding: "2rem", textAlign: "center" }}
                  >
                    <p style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>
                      🌍
                    </p>
                    <p style={{ color: "#888888", fontSize: "16px" }}>
                      Aucune pharmacie visible pour le public.
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
                    {visiblePharmacies.map((p, i) => (
                      <div
                        key={p.id.toString()}
                        data-ocid={`admin.public.item.${i + 1}`}
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
                            {p.nom}
                          </p>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              background: p.ouvert ? "#0a2e17" : "#2e0a0a",
                              color: p.ouvert ? "#00c853" : "#ff5252",
                              border: `1px solid ${p.ouvert ? "#00c85355" : "#ff525255"}`,
                              flexShrink: 0,
                            }}
                          >
                            {p.ouvert ? "🟢 Ouvert" : "🔴 Fermé"}
                          </span>
                        </div>
                        <p
                          style={{
                            color: "#888888",
                            fontSize: "14px",
                            marginBottom: "0.25rem",
                          }}
                        >
                          📍 {p.adresse}
                        </p>
                        <p
                          style={{
                            color: "#888888",
                            fontSize: "14px",
                            marginBottom: "1rem",
                          }}
                        >
                          📞 {p.tel}
                        </p>
                        <a
                          data-ocid={`admin.public.call.button.${i + 1}`}
                          href={`tel:${p.tel}`}
                          className="pharma-btn-success"
                          style={{
                            textDecoration: "none",
                            minHeight: 44,
                            fontSize: "14px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            borderRadius: "0.75rem",
                          }}
                        >
                          📞 Appeler
                        </a>
                      </div>
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
      {screen === "pharmacien" && (
        <PharmacistScreen
          onBack={goHome}
          onViewPublic={() => setScreen("nearby")}
        />
      )}
    </div>
  );
}
