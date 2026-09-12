'use client';
import dynamic from 'next/dynamic';
import type { MachineId } from 'pachinko';

const PachinkoClient = dynamic(() => import('./PachinkoClient'), { ssr: false });

export default function PlayClientGate({ machine, seed }: { machine?: MachineId; seed?: number }) {
  return <PachinkoClient machine={machine} seed={seed} />;
}
