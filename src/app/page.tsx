import SftpClient from './SftpClient';
import { Suspense } from 'react';

async function InitialDirectory() {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/sftp/list?path=/upload`, { cache: 'no-store' });
    if (!res.ok) {
      return <SftpClient initialPath="/upload" initialFiles={[]} error="Failed to load initial directory" />;
    }
    const files = await res.json();
    return <SftpClient initialPath="/upload" initialFiles={files} />;
  } catch (error) {
    return <SftpClient initialPath="/upload" initialFiles={[]} error="Failed to load initial directory (connection error)" />;
  }
}

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex flex-col p-4 md:p-8 font-sans">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          SFTP Hub
        </h1>
      </header>
      <div className="flex-grow bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-zinc-500 p-10 space-x-2">
            <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
            <span>Loading initial view...</span>
          </div>
        }>
          <InitialDirectory />
        </Suspense>
      </div>
    </main>
  );
}
