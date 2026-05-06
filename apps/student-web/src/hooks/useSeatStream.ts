import { useState, useEffect, useRef } from 'react';

export interface SeatUpdate {
  workshopId: string;
  remainingSeats: number;
  heldCount: number;
  confirmedCount: number;
}

/**
 * Task 3.10 — Subscribe to SSE seat updates for a workshop.
 * Auto-reconnects on disconnect (exponential backoff up to 30s).
 */
export function useSeatStream(workshopId: string | null) {
  const [seatData, setSeatData] = useState<SeatUpdate | null>(null);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryDelay = useRef(1000);

  useEffect(() => {
    if (!workshopId) return;

    function connect() {
      const es = new EventSource(`/api/workshops/${workshopId}/seats`);
      esRef.current = es;

      es.onopen = () => {
        setConnected(true);
        retryDelay.current = 1000; // reset backoff on success
      };

      es.onmessage = (event: MessageEvent) => {
        try {
          const data: SeatUpdate = JSON.parse(event.data);
          setSeatData(data);
        } catch {
          // ignore malformed messages
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Exponential backoff: 1s → 2s → 4s → ... → 30s
        reconnectTimer.current = setTimeout(() => {
          retryDelay.current = Math.min(retryDelay.current * 2, 30_000);
          connect();
        }, retryDelay.current);
      };
    }

    connect();

    return () => {
      esRef.current?.close();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
    };
  }, [workshopId]);

  return { seatData, connected };
}
