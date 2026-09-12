import { MACHINE_ORDER, type MachineId } from 'pachinko';
import PlayClientGate from './PlayClientGate';

export default async function PlayPage({ searchParams }: { searchParams: Promise<{ m?: string; seed?: string }> }) {
  const { m, seed: rawSeed } = await searchParams;
  const machine = MACHINE_ORDER.includes(m as MachineId) ? (m as MachineId) : undefined;
  const seed = rawSeed !== undefined && Number.isFinite(Number(rawSeed)) ? Number(rawSeed) >>> 0 : undefined;
  return <PlayClientGate machine={machine} seed={seed} />;
}
