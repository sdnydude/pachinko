'use client';
import { useEffect, useRef } from 'react';
import 'pachinko/app.css';
import { App, LocalStorage } from 'pachinko';
import type { MachineId, Storage } from 'pachinko';

export default function PachinkoClient({ machine, seed, storage }: { machine?: MachineId; seed?: number; storage?: Storage }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const app = new App({ root: ref.current, storage: storage ?? new LocalStorage(), machine, seed });
    void app.start();
    return () => app.stop();
  }, [machine, seed, storage]);
  return <div ref={ref} style={{ height: '100dvh' }} />;
}
