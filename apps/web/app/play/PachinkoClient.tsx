'use client';
import { useEffect, useRef } from 'react';
import 'pachinko/app.css';
import { App } from 'pachinko';
import { LocalStorage } from 'pachinko/storage/local';
import type { MachineId } from 'pachinko';

export default function PachinkoClient({ machine }: { machine?: MachineId }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const app = new App({ root: ref.current, storage: new LocalStorage(), machine });
    void app.start();
    return () => app.stop();
  }, [machine]);
  return <div ref={ref} style={{ height: '100dvh' }} />;
}
