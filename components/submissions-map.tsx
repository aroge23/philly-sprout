"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PHILADELPHIA_CENTER: [number, number] = [39.9526, -75.1652];
const DEFAULT_ZOOM = 12;

export type Submission = {
  id: string;
  latitude: number;
  longitude: number;
  street_address: string | null;
  overall_suitability: string | null;
  created_at: string;
  notes: string | null;
};

type SubmissionsMapProps = {
  submissions: Submission[];
  height?: string;
};

const suitabilityConfig: Record<string, { color: string; label: string }> = {
  "Likely Suitable": { color: "#22c55e", label: "Likely Suitable" },
  "Possibly Suitable": { color: "#eab308", label: "Possibly Suitable" },
  "Likely Unsuitable": { color: "#ef4444", label: "Likely Unsuitable" },
};

function createColoredIcon(suitability: string | null) {
  const config = suitabilityConfig[suitability ?? ""] ?? {
    color: "#6b7280",
    label: "Unknown",
  };

  return L.divIcon({
    className: "",
    html: `<div style="
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      background: ${config.color};
      border: 2px solid white;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      font-size: 11px;
      line-height: 1;
    ">🌳</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -13],
  });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildPopupHtml(submission: Submission) {
  const color =
    suitabilityConfig[submission.overall_suitability ?? ""]?.color ?? "#6b7280";
  const notesHtml =
    submission.notes
      ? `<p style="margin:6px 0 0;font-size:0.8em;color:#444;font-style:italic">${
          submission.notes.length > 100
            ? submission.notes.slice(0, 100) + "..."
            : submission.notes
        }</p>`
      : "";

  return `<div style="min-width:180px">
    <p style="font-weight:600;margin:0 0 4px">${submission.street_address || "No address"}</p>
    <p style="margin:0 0 4px;font-size:0.85em">
      <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-right:6px;vertical-align:middle"></span>
      ${submission.overall_suitability ?? "Not rated"}
    </p>
    <p style="margin:0;font-size:0.8em;color:#666">${formatDate(submission.created_at)}</p>
    ${notesHtml}
  </div>`;
}

export function SubmissionsMap({
  submissions,
  height = "400px",
}: SubmissionsMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(
      PHILADELPHIA_CENTER,
      DEFAULT_ZOOM
    );
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    for (const submission of submissions) {
      L.marker([submission.latitude, submission.longitude], {
        icon: createColoredIcon(submission.overall_suitability),
      })
        .addTo(map)
        .bindPopup(buildPopupHtml(submission));
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [submissions]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%", borderRadius: "0.75rem" }}
    />
  );
}
