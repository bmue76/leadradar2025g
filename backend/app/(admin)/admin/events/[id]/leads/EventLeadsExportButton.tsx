"use client";

import React, { useState } from "react";

type EventLeadsExportButtonProps = {
  eventId: string;
  disabled: boolean;
};

export function EventLeadsExportButton({
  eventId,
  disabled,
}: EventLeadsExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || loading) return;

    try {
      setLoading(true);

      const res = await fetch(
        `/api/admin/events/${eventId}/leads?format=csv`,
        {
          method: "GET",
          headers: {
            // Fake-Auth für Admin-API im Dev-Setup
            "x-user-id": "1",
          },
        }
      );

      if (!res.ok) {
        console.error("CSV export failed", res.status, res.statusText);
        const text = await res.text().catch(() => "");
        alert(
          `CSV-Export fehlgeschlagen (${res.status}).\nDetails: ${text || "Keine weiteren Details."}`
        );
        return;
      }

      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") || "";
      let fileName = `leads-event-${eventId}.csv`;

      const match = disposition.match(/filename="(.+?)"/i);
      if (match && match[1]) {
        fileName = match[1];
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error during CSV export", err);
      alert("Beim CSV-Export ist ein unerwarteter Fehler aufgetreten.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || loading}
      className={`inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium ${
        disabled || loading ? "text-gray-400 cursor-not-allowed" : "hover:bg-gray-50"
      }`}
      title={
        disabled
          ? "Keine Leads zum Exportieren"
          : "Leads dieses Events als CSV exportieren"
      }
    >
      {loading ? "Export läuft..." : "CSV-Export"}
    </button>
  );
}
