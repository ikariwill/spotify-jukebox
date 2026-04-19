'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface Props {
  url: string;
}

export function QRCodeDisplay({ url }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 140,
      margin: 1,
      color: { dark: '#FFFFFF', light: '#00000000' },
    }).catch(console.error);
  }, [url]);

  if (!url) return null;

  return (
    <div className="flex flex-col items-center gap-2 pt-4 border-t border-white/5">
      <canvas ref={canvasRef} className="rounded-lg" />
      <p className="text-xs text-gray-600">Scan to add songs</p>
      <p className="text-xs text-gray-700 font-mono truncate max-w-full">{url}</p>
    </div>
  );
}
