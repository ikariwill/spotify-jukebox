"use client";

import { Smartphone, X } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useRef, useState } from 'react'

interface Props {
  url: string;
}

function QRModal({ url, onClose }: { url: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 220,
      margin: 2,
      color: { dark: "#FFFFFF", light: "#1a1a1a" },
    }).catch(console.error);
  }, [url]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-[#181818] rounded-2xl shadow-2xl border border-white/10 w-full max-w-sm mx-4 flex flex-col items-center px-8 py-8 gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="text-center">
          <p className="text-lg font-bold">Connect your device</p>
          <p className="text-xs text-gray-500 mt-1">
            Use your phone to add songs to the queue
          </p>
        </div>

        <div className="bg-[#1a1a1a] rounded-2xl p-3 shadow-inner">
          <canvas ref={canvasRef} className="rounded-lg block" />
        </div>

        <div className="space-y-2 w-full text-sm text-gray-400">
          <div className="flex items-start gap-3">
            <span className="text-spotify-green font-bold shrink-0">1.</span>
            <span>Open your phone's camera and point it at the QR code</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-spotify-green font-bold shrink-0">2.</span>
            <span>Tap the link that appears to open the Jukebox remote</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-spotify-green font-bold shrink-0">3.</span>
            <span>Search for any song and add it to the queue</span>
          </div>
        </div>

        <p className="text-xs text-gray-700 font-mono break-all text-center">
          {url}
        </p>
      </div>
    </div>
  );
}

export function QRCodeDisplay({ url }: Props) {
  const [open, setOpen] = useState(false);

  if (!url) return null;

  return (
    <>
      {open && <QRModal url={url} onClose={() => setOpen(false)} />}
      <div className="border-t border-white/5 pt-4">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors cursor-pointer w-full"
        >
          <Smartphone size={14} />
          Connect your device
        </button>
      </div>
    </>
  );
}
