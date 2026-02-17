import { useRef, useMemo, useState } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer } from "react-leaflet";

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

const CITY_DATA = [
  {
    id: "chennai",
    name: "Chennai",
    center: { lat: 13.0827, lng: 80.2707 },
    areas: [
      { id: "adyar", name: "Adyar", lat: 13.0012, lng: 80.2565 },
      { id: "t-nagar", name: "T. Nagar", lat: 13.0418, lng: 80.2341 },
      { id: "velachery", name: "Velachery", lat: 12.9756, lng: 80.2208 },
      { id: "anna-nagar", name: "Anna Nagar", lat: 13.0878, lng: 80.2102 },
    ],
  },
  {
    id: "coimbatore",
    name: "Coimbatore",
    center: { lat: 11.0168, lng: 76.9558 },
    areas: [
      { id: "gandhipuram", name: "Gandhipuram", lat: 11.0185, lng: 76.9676 },
      { id: "rs-puram", name: "R.S. Puram", lat: 11.0072, lng: 76.9544 },
      { id: "singanallur", name: "Singanallur", lat: 10.9997, lng: 77.018 },
      { id: "saibaba-colony", name: "Saibaba Colony", lat: 11.0327, lng: 76.9412 },
    ],
  },
  {
    id: "madurai",
    name: "Madurai",
    center: { lat: 9.9252, lng: 78.1198 },
    areas: [
      { id: "kk-nagar", name: "K.K. Nagar", lat: 9.9363, lng: 78.1269 },
      { id: "ana-nagar", name: "Anna Nagar", lat: 9.9442, lng: 78.1476 },
      { id: "arapalayam", name: "Arapalayam", lat: 9.9334, lng: 78.0893 },
      { id: "alagar-kovil", name: "Alagar Kovil", lat: 10.0582, lng: 78.2204 },
    ],
  },
];

const EARTH_RADIUS_KM = 6371;

const haversineDistance = (a, b) => {
  const toRad = (value) => (value * Math.PI) / 180;
  const deltaLat = toRad(b.lat - a.lat);
  const deltaLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinLat = Math.sin(deltaLat / 2);
  const sinLng = Math.sin(deltaLng / 2);
  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
};

const planRoute = (origin, stops) => {
  if (!stops.length) {
    return { orderedStops: [], totalDistance: 0, path: [origin] };
  }

  let current = origin;
  const remaining = [...stops];
  const orderedStops = [];
  let totalDistance = 0;

  while (remaining.length) {
    let nextIndex = 0;
    let nextDistance = haversineDistance(current, remaining[0].position);

    for (let i = 1; i < remaining.length; i += 1) {
      const candidateDistance = haversineDistance(current, remaining[i].position);
      if (candidateDistance < nextDistance) {
        nextDistance = candidateDistance;
        nextIndex = i;
      }
    }

    const [nextStop] = remaining.splice(nextIndex, 1);
    totalDistance += nextDistance;
    orderedStops.push(nextStop);
    current = nextStop.position;
  }

  const path = [origin, ...orderedStops.map((stop) => stop.position)];
  return { orderedStops, totalDistance: Number(totalDistance.toFixed(2)), path };
};

export default function App() {
  const [activeModule, setActiveModule] = useState("overview");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [routeResult, setRouteResult] = useState(null);
  const [routeError, setRouteError] = useState("");
  const [dragOver, setDragOver] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [classifiedImages, setClassifiedImages] = useState({});
  const [locationModalOpen, setLocationModalOpen] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState("");
  const [selectedAreaId, setSelectedAreaId] = useState("");
  const [classifiedAreas, setClassifiedAreas] = useState([]);
  const [locationError, setLocationError] = useState("");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const selectedCity = useMemo(
    () => CITY_DATA.find((city) => city.id === selectedCityId) ?? null,
    [selectedCityId]
  );

  const availableAreas = useMemo(() => {
    if (!selectedCity) {
      return [];
    }
    return selectedCity.areas;
  }, [selectedCity]);

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

    // Create image preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(file));

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
      
      // Add to classified images history
      const category = data.category;
      const preview = URL.createObjectURL(file);
      setClassifiedImages(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), { preview, filename: file.name, confidence: data.confidence }]
      }));
      
      setActiveModule("classify");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBinDrop = async (event, binKey) => {
    event.preventDefault();
    setDragOver(null);

    const droppedFile = event.dataTransfer.files[0];
    if (!droppedFile || !droppedFile.type.startsWith("image/")) {
      setError("Please drop a valid image file.");
      return;
    }

    setFile(droppedFile);
    setError("");
    setResult(null);

    // Create image preview
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setImagePreview(URL.createObjectURL(droppedFile));

    const formData = new FormData();
    formData.append("file", droppedFile);

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
      
      // Add to classified images history
      const category = data.category;
      const preview = URL.createObjectURL(droppedFile);
      setClassifiedImages(prev => ({
        ...prev,
        [category]: [...(prev[category] || []), { preview, filename: droppedFile.name, confidence: data.confidence }]
      }));
      
      setActiveModule("classify");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBinDragOver = (event, binKey) => {
    event.preventDefault();
    setDragOver(binKey);
  };

  const handleBinDragLeave = () => {
    setDragOver(null);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError("");
    } catch (err) {
      setError("Camera access denied or unavailable.");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
      setCameraActive(false);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  const captureImage = async () => {
    if (!videoRef.current || !canvasRef.current) {
      setError("Camera not ready.");
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setError("Failed to capture image.");
        return;
      }

      const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, {
        type: "image/jpeg",
      });
      setFile(capturedFile);

      // Create preview
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      const preview = URL.createObjectURL(capturedFile);
      setImagePreview(preview);

      // Send to backend
      const formData = new FormData();
      formData.append("file", capturedFile);

      try {
        setLoading(true);
        setError("");
        setResult(null);

        const response = await fetch(`${API_URL}/predict`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Prediction failed.");
        }

        const data = await response.json();
        setResult(data);

        // Add to classified images history
        const category = data.category;
        setClassifiedImages((prev) => ({
          ...prev,
          [category]: [
            ...(prev[category] || []),
            { preview, filename: capturedFile.name, confidence: data.confidence },
          ],
        }));

        setActiveModule("classify");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }, "image/jpeg");
  };

  const handleAddArea = () => {
    setLocationError("");

    if (!selectedCity) {
      setLocationError("Please choose a city first.");
      return;
    }

    if (!selectedAreaId) {
      setLocationError("Please choose an area to classify.");
      return;
    }

    const area = selectedCity.areas.find((item) => item.id === selectedAreaId);
    if (!area) {
      setLocationError("Selected area is not valid.");
      return;
    }

    setClassifiedAreas((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.cityId === selectedCity.id && item.areaId === area.id
      );

      const nextEntry = {
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        areaId: area.id,
        areaName: area.name,
        position: { lat: area.lat, lng: area.lng },
      };

      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = nextEntry;
        return updated;
      }

      return [...prev, nextEntry];
    });
  };

  const handleRemoveArea = (cityId, areaId) => {
    setClassifiedAreas((prev) =>
      prev.filter((item) => !(item.cityId === cityId && item.areaId === areaId))
    );
  };

  const handlePlanRoute = () => {
    setRouteError("");
    setRouteResult(null);

    if (!selectedCity) {
      setRouteError("Select a city to build a route.");
      return;
    }

    const cityAreas = classifiedAreas.filter(
      (item) => item.cityId === selectedCity.id
    );

    if (!cityAreas.length) {
      setRouteError("Add at least one classified area for this city.");
      return;
    }

    const result = planRoute(selectedCity.center, cityAreas);
    setRouteResult({
      city: selectedCity,
      ...result,
    });
    setActiveModule("route");
  };

  return (
    <div className="app-shell">
      {locationModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h2>Set your location</h2>
              <p className="muted">
                Select a city, choose areas, and classify them by waste type.
              </p>
            </div>

            <div className="form-grid">
              <label className="field">
                <span>City</span>
                <select
                  value={selectedCityId}
                  onChange={(event) => {
                    setSelectedCityId(event.target.value);
                    setSelectedAreaId("");
                  }}
                >
                  <option value="">Select a city</option>
                  {CITY_DATA.map((city) => (
                    <option key={city.id} value={city.id}>
                      {city.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Area</span>
                <select
                  value={selectedAreaId}
                  onChange={(event) => setSelectedAreaId(event.target.value)}
                  disabled={!selectedCity}
                >
                  <option value="">Select an area</option>
                  {availableAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </label>

            </div>

            <div className="modal-actions">
              <button className="ghost-btn" type="button" onClick={handleAddArea}>
                Add area classification
              </button>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  if (!selectedCity) {
                    setLocationError("Please select a city to.. continue.");
                    return;
                  }
                  setLocationModalOpen(false);
                  setActiveModule("classify");
                }}
              >
                Continue to classification
              </button>
            </div>

            {locationError && <p className="error">{locationError}</p>}

            <div className="area-list">
              <p className="area-title">Classified areas</p>
              {classifiedAreas.length === 0 && (
                <p className="muted">No areas added yet.</p>
              )}
              {classifiedAreas.map((item) => (
                <div key={`${item.cityId}-${item.areaId}`} className="area-item">
                  <div>
                    <p className="area-name">{item.areaName}</p>
                    <p className="area-meta">
                      {item.cityName}
                    </p>
                  </div>
                  <button
                    className="ghost-btn"
                    type="button"
                    onClick={() => handleRemoveArea(item.cityId, item.areaId)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
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
          <button className="ghost-btn" type="button" onClick={handlePlanRoute}>
            Plan city route
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
                <p className="stat-label">Selected city</p>
                <p className="stat-value">
                  {selectedCity ? selectedCity.name : "Not set"}
                </p>
                <p className="stat-caption">Route center location</p>
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

              <div className="camera-card">
                <h3>Live camera</h3>
                {!cameraActive && (
                  <div>
                    <p className="muted">Use your webcam for real-time classification.</p>
                    <button className="btn" type="button" onClick={startCamera}>
                      Start camera
                    </button>
                  </div>
                )}
                {cameraActive && (
                  <div className="camera-container">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="camera-video"
                    />
                    <canvas ref={canvasRef} style={{ display: "none" }} />
                    <div className="camera-actions">
                      <button
                        className="btn"
                        type="button"
                        onClick={captureImage}
                        disabled={loading}
                      >
                        {loading ? "Classifying..." : "Capture & classify"}
                      </button>
                      <button
                        className="ghost-btn"
                        type="button"
                        onClick={stopCamera}
                      >
                        Stop camera
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="result-card">
                <h3>Latest assignment</h3>
                {!result && <p className="muted">No classification yet.</p>}
                {result && (
                  <div className="result">
                    {imagePreview && (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Uploaded waste" />
                      </div>
                    )}
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
                    {result.confidence < 0.7 && (
                      <div className="confidence-warning">
                        ⚠️ Low confidence — verify assignment manually
                      </div>
                    )}
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
                  className={`bin-card ${assignedBin?.key === bin.key ? "is-active" : ""} ${dragOver === bin.key ? "drag-over" : ""}`}
                  onDrop={(e) => handleBinDrop(e, bin.key)}
                  onDragOver={(e) => handleBinDragOver(e, bin.key)}
                  onDragLeave={handleBinDragLeave}
                >
                  <div className="bin-head">
                    <span className="bin-dot" />
                    <h3>{bin.label}</h3>
                  </div>
                  <p>{bin.description}</p>
                  {assignedBin?.key === bin.key && (
                    <span className="bin-tag">Drop here</span>
                  )}
                  {dragOver === bin.key && (
                    <span className="bin-tag drag-hint">Drop to classify</span>
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
                  Choose a city and classify its areas to generate an optimized path
                  from the city center.
                </p>
              </div>
              <button className="btn" onClick={handlePlanRoute}>
                Plan route
              </button>
            </div>

            {routeError && <p className="error">{routeError}</p>}

            <div className="route-layout">
              <div className="route-panel">
                <div className="form-grid">
                  <label className="field">
                    <span>City</span>
                    <select
                      value={selectedCityId}
                      onChange={(event) => {
                        setSelectedCityId(event.target.value);
                        setSelectedAreaId("");
                      }}
                    >
                      <option value="">Select a city</option>
                      {CITY_DATA.map((city) => (
                        <option key={city.id} value={city.id}>
                          {city.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>Area</span>
                    <select
                      value={selectedAreaId}
                      onChange={(event) => setSelectedAreaId(event.target.value)}
                      disabled={!selectedCity}
                    >
                      <option value="">Select an area</option>
                      {availableAreas.map((area) => (
                        <option key={area.id} value={area.id}>
                          {area.name}
                        </option>
                      ))}
                    </select>
                  </label>

                </div>

                <div className="route-actions">
                  <button className="ghost-btn" type="button" onClick={handleAddArea}>
                    Add area classification
                  </button>
                  <button className="btn" type="button" onClick={handlePlanRoute}>
                    Generate route
                  </button>
                </div>

                {classifiedAreas.length === 0 && (
                  <p className="muted">No areas classified yet.</p>
                )}

                {classifiedAreas.length > 0 && (
                  <div className="area-list">
                    <p className="area-title">Areas in plan</p>
                    {classifiedAreas.map((item) => (
                      <div key={`${item.cityId}-${item.areaId}`} className="area-item">
                        <div>
                          <p className="area-name">{item.areaName}</p>
                          <p className="area-meta">
                            {item.cityName}
                          </p>
                        </div>
                        <button
                          className="ghost-btn"
                          type="button"
                          onClick={() => handleRemoveArea(item.cityId, item.areaId)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {routeResult && (
                  <div className="result">
                    <div className="route-grid">
                      <div>
                        <p className="route-label">City center</p>
                        <p className="route-value">{routeResult.city.name}</p>
                      </div>
                      <div>
                        <p className="route-label">Stops</p>
                        <p className="route-value">
                          {routeResult.orderedStops.map((stop) => stop.areaName).join(" → ")}
                        </p>
                      </div>
                      <div>
                        <p className="route-label">Total distance</p>
                        <p className="route-value">{routeResult.totalDistance} km</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="map-card">
                <MapContainer
                  key={selectedCityId || "default"}
                  center={selectedCity ? selectedCity.center : CITY_DATA[0].center}
                  zoom={12}
                  scrollWheelZoom
                  className="leaflet-map"
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {selectedCity && (
                    <Marker position={selectedCity.center}>
                      <Popup>
                        {selectedCity.name} center<br />
                        {classifiedAreas.filter(
                          (item) => item.cityId === selectedCity.id
                        ).length}
                        {" "}
                        area(s) classified
                      </Popup>
                    </Marker>
                  )}

                  {classifiedAreas
                    .filter((item) => item.cityId === selectedCityId)
                    .map((item) => (
                      <Marker key={item.areaId} position={item.position}>
                        <Popup>
                          <strong>{item.areaName}</strong>
                          <br />
                          {item.cityName}
                        </Popup>
                      </Marker>
                    ))}

                  {routeResult && routeResult.path.length > 1 && (
                    <Polyline positions={routeResult.path} color="#ff3849" />
                  )}
                </MapContainer>
              </div>
            </div>
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
              {BIN_CATEGORIES.map((bin) => {
                const images = classifiedImages[bin.key] || [];
                return (
                  <div
                    key={bin.key}
                    className={`bin-card ${assignedBin?.key === bin.key ? "is-active" : ""}`}
                  >
                    <div className="bin-head">
                      <span className="bin-dot" />
                      <h3>{bin.label}</h3>
                    </div>
                    <p>{bin.description}</p>
                    {images.length > 0 && (
                      <div className="bin-images">
                        <p className="bin-count">{images.length} item{images.length !== 1 ? 's' : ''} classified</p>
                        <div className="bin-thumbnails">
                          {images.slice(-3).map((img, idx) => (
                            <div key={idx} className="bin-thumbnail" title={img.filename}>
                              <img src={img.preview} alt={img.filename} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
