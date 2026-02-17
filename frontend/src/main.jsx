import React from "react";
import { createRoot } from "react-dom/client";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import App from "./App.jsx";
import "./App.css";

const iconRetinaUrl = new URL(
	"leaflet/dist/images/marker-icon-2x.png",
	import.meta.url
).toString();
const iconUrl = new URL(
	"leaflet/dist/images/marker-icon.png",
	import.meta.url
).toString();
const shadowUrl = new URL(
	"leaflet/dist/images/marker-shadow.png",
	import.meta.url
).toString();

L.Icon.Default.mergeOptions({
	iconRetinaUrl,
	iconUrl,
	shadowUrl,
});

const root = createRoot(document.getElementById("root"));
root.render(<App />);
