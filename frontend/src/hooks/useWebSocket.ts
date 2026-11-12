import { useEffect, useRef, useState } from 'react';
import { TelemetryTick } from '../types/telemetry';

export function useWebSocket() {
  const [connected, setConnected] = useState<boolean>(false);
  const [latestTicks, setLatestTicks] = useState<Record<string, TelemetryTick>>({});
  const historyRef = useRef<Record<string, TelemetryTick[]>>({});
  const [, setHistoryVersion] = useState(0);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let isMounted = true;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const tick: TelemetryTick = JSON.parse(event.data);
          const pid = tick.patient_id;

          setLatestTicks((prev) => ({
            ...prev,
            [pid]: tick,
          }));

          if (!historyRef.current[pid]) {
            historyRef.current[pid] = [];
          }
          const buf = historyRef.current[pid];
          buf.push(tick);
          if (buf.length > 200) {
            buf.shift();
          }

          setHistoryVersion((v) => (v + 1) % 1000000);
        } catch (err) {
          console.error('Error parsing telemetry WebSocket tick:', err);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = (err) => {
        console.warn('WebSocket encountered error, closing...', err);
        ws?.close();
      };
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) ws.close();
    };
  }, []);

  return {
    connected,
    latestTicks,
    telemetryHistory: historyRef.current,
  };
}

