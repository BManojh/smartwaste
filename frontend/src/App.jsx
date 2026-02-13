import { useMemo, useState } from "react";

const API_URL = "http://localhost:8000";

const BIN_CATEGORIES = [
  {
    key: "cardboard",
    label: "Cardboard",
    description: "Boxes, cartons, kraft packaging",
  },
  {
    key: "paper",
    label: "Paper",
    description: "Newspaper, sheets, receipts",
  },
  {
    key: "glass",
    label: "Glass",
    description: "Bottles, jars, glass containers",
  },
  {
    key: "metal",
    label: "Metal",
    description: "Aluminum cans, tins, foil",
  },
  {
    key: "plastic",
    label: "Plastic",
    description: "Bottles, packaging, wrappers",
  },
  {
    key: "organic",
    label: "Organic",
    description: "Food waste, compostables",
  },
  {
    key: "miscellaneous",
    label: "Miscellaneous",
    description: "Non-recyclables, mixed waste",
  },
];

const MODULES = [
  { id: "overview", label: "Overview", caption: "System at a glance" },
  { id: "classify", label: "AI Classification", caption: "Upload & classify" },
  { id: "route", label: "Route Planner", caption: "Optimize collection" },
  { id: "bins", label: "Bins", caption: "Available dustbins" },
];

export default function App() {
  const [activeModule, setActiveModule] = useState("overview");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState("");

  const bins = [
    { id: "A", x: 1, y: 2, fill: 90 },
    { id: "B", x: 4, y: 1, fill: 65 },
    { id: "C", x: 6, y: 4, fill: 85 },
    { id: "D", x: 2, y: 6, fill: 75 },
  ];

  const assignedBin = useMemo(() => {
    if (!result?.category) {
      return null;
    }
    return BIN_CATEGORIES.find((bin) => bin.key === result.category) ?? null;
  }, [result]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!file) {
      setError("Please select an image first.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Prediction failed.");
      }

      const data = await response.json();
      setResult(data);
      setActiveModule("classify");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRoute = async () => {
    setRouteError("");
    setRouteResult(null);

    try {
      setRouteLoading(true);
      const response = await fetch(`${API_URL}/route`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bins, threshold: 80 }),
      });

      if (!response.ok) {
        throw new Error("Routing failed.");
      }

      const data = await response.json();
      setRouteResult(data);
      setActiveModule("route");
    } catch (err) {
      setRouteError(err.message);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SW</div>
          <div>
            <p className="brand-title">SmartWaste</p>
            <p className="brand-subtitle">Waste Intelligence Console</p>
          </div>
        </div>

        <nav className="nav">
          {MODULES.map((module) => (
            <button
              key={module.id}
              type="button"
              className={`nav-item ${activeModule === module.id ? "active" : ""}`}
              onClick={() => setActiveModule(module.id)}
            >
              <span className="nav-label">{module.label}</span>
              <span className="nav-caption">{module.caption}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="sidebar-title">System status</p>
          <div className="status-row">
            <span className="status-dot" />
            <span>Backend ready on {API_URL}</span>
          </div>
          <button className="ghost-btn" type="button" onClick={handleRoute}>
            Run route planning
          </button>
        </div>
      </aside>

      <main className="main">
        <header className="hero">
          <p className="eyebrow">Smart Waste Operations</p>
          <h1>AI-driven classification and collection planning</h1>
          <p className="hero-subtitle">
            Upload waste imagery, auto-assign the correct dustbin, and plan the
            fastest collection route in one dashboard.
          </p>
          <div className="hero-actions">
            <button className="btn" type="button" onClick={() => setActiveModule("classify")}
            >
              Start classification
            </button>
            <button className="btn outline" type="button" onClick={() => setActiveModule("bins")}
            >
              View bin inventory
            </button>
          </div>
        </header>

        {activeModule === "overview" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Operational overview</h2>
                <p className="muted">
                  Monitor classification readiness and bin availability.
                </p>
              </div>
              <div className="tag">Live</div>
            </div>
            <div className="overview-grid">
              <div className="stat-card">
                <p className="stat-label">Active dustbins</p>
                <p className="stat-value">{BIN_CATEGORIES.length}</p>
                <p className="stat-caption">Configured categories</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Routing threshold</p>
                <p className="stat-value">80%</p>
                <p className="stat-caption">Auto-collect when full</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Prediction mode</p>
                <p className="stat-value">{result?.mode ?? "demo"}</p>
                <p className="stat-caption">Model readiness</p>
              </div>
            </div>
            <div className="bins-grid compact">
              {BIN_CATEGORIES.map((bin) => (
                <div
                  key={bin.key}
                  className={`bin-card ${assignedBin?.key === bin.key ? "is-active" : ""}`}
                >
                  <div className="bin-head">
                    <span className="bin-dot" />
                    <h3>{bin.label}</h3>
                  </div>
                  <p>{bin.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeModule === "classify" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>AI waste classification</h2>
                <p className="muted">Upload an image to assign it to a dustbin.</p>
              </div>
            </div>
            <div className="panel-grid">
              <form className="upload-card" onSubmit={handleSubmit}>
                <label className="upload-box">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                  />
                  <span className="upload-title">Drop image or click to upload</span>
                  <span className="upload-caption">
                    {file ? file.name : "Supports JPG or PNG"}
                  </span>
                </label>

                <button className="btn" type="submit" disabled={loading}>
                  {loading ? "Classifying..." : "Classify & assign"}
                </button>
                {error && <p className="error">{error}</p>}
              </form>

              <div className="result-card">
                <h3>Latest assignment</h3>
                {!result && <p className="muted">No classification yet.</p>}
                {result && (
                  <div className="result">
                    <p>
                      <strong>File:</strong> {result.filename}
                    </p>
                    <p>
                      <strong>Category:</strong> {result.category}
                    </p>
                    <p>
                      <strong>Confidence:</strong> {result.confidence}
                    </p>
                    <p>
                      <strong>Mode:</strong> {result.mode}
                    </p>
                    <div className="assignment">
                      <span className="assignment-label">Assigned bin</span>
                      <span className="assignment-value">
                        {assignedBin ? assignedBin.label : "Unmapped"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bins-grid">
              {BIN_CATEGORIES.map((bin) => (
                <div
                  key={bin.key}
                  className={`bin-card ${assignedBin?.key === bin.key ? "is-active" : ""}`}
                >
                  <div className="bin-head">
                    <span className="bin-dot" />
                    <h3>{bin.label}</h3>
                  </div>
                  <p>{bin.description}</p>
                  {assignedBin?.key === bin.key && (
                    <span className="bin-tag">Drop here</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {activeModule === "route" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Smart collection route</h2>
                <p className="muted">
                  Demo bins are preloaded. Bins with fill level at or above 80% are
                  routed.
                </p>
              </div>
              <button className="btn" onClick={handleRoute} disabled={routeLoading}>
                {routeLoading ? "Planning..." : "Plan route"}
              </button>
            </div>

            {routeError && <p className="error">{routeError}</p>}

            {routeResult && (
              <div className="result">
                <div className="route-grid">
                  <div>
                    <p className="route-label">Selected bins</p>
                    <p className="route-value">{routeResult.selectedBins.join(", ")}</p>
                  </div>
                  <div>
                    <p className="route-label">Route</p>
                    <p className="route-value">{routeResult.route.join(" → ")}</p>
                  </div>
                  <div>
                    <p className="route-label">Total distance</p>
                    <p className="route-value">{routeResult.totalDistance} km</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {activeModule === "bins" && (
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>Dustbin inventory</h2>
                <p className="muted">
                  Categories supported by the SmartWaste classifier.
                </p>
              </div>
            </div>
            <div className="bins-grid">
              {BIN_CATEGORIES.map((bin) => (
                <div
                  key={bin.key}
                  className={`bin-card ${assignedBin?.key === bin.key ? "is-active" : ""}`}
                >
                  <div className="bin-head">
                    <span className="bin-dot" />
                    <h3>{bin.label}</h3>
                  </div>
                  <p>{bin.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
