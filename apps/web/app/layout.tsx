export const metadata = { title: 'DHG Parlor' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body style={{ margin: 0, background: '#111', color: '#eee', fontFamily: 'system-ui, sans-serif' }}>{children}</body></html>;
}
