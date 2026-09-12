'use client';
import dynamic from 'next/dynamic';
import type { MachineId } from 'pachinko';

const PachinkoClient = dynamic(() => import('./PachinkoClient'), { ssr: false });

export default function PlayClientGate({ machine }: { machine?: MachineId }) {
  return <PachinkoClient machine={machine} />;
}
