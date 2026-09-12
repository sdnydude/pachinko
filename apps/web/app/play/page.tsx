import PlayClientGate from './PlayClientGate';
export default function PlayPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  return <PlayInner searchParams={searchParams} />;
}
async function PlayInner({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const machine = m === 'raijin' || m === 'big-wave' || m === 'hana-fan' ? m : undefined;
  return <PlayClientGate machine={machine} />;
}
