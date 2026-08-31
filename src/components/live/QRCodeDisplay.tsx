'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { CopyButton } from '@/components/ui/CopyButton'
import { QrCode, ExternalLink } from 'lucide-react'
import { Translate } from '@/components/Translate'

interface QRCodeDisplayProps {
  url: string
  code?: string
  size?: number
  showCopy?: boolean
}

export function QRCodeDisplay({ url, code, size = 200, showCopy = true }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url) return
    QRCode.toDataURL(url, {
      width: size,
      margin: 2,
      color: {
        dark: '#31694E',
        light: '#FFFFFF'
      }
    })
      .then((res) => setDataUrl(res))
      .catch((err) => console.error('Failed to generate QR code:', err))
  }, [url, size])

  return (
    <div className="flex flex-col items-center p-5 bg-white rounded-3xl border border-slate-200 shadow-md">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Join QR Code"
          className="rounded-2xl border border-slate-100 shadow-inner"
          style={{ width: size, height: size }}
        />
      ) : (
        <div
          className="bg-slate-100 rounded-2xl flex items-center justify-center animate-pulse"
          style={{ width: size, height: size }}
        >
          <QrCode className="w-10 h-10 text-slate-300" />
        </div>
      )}

      {code && (
        <div className="mt-4 text-center">
          <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-1">
            <Translate fil="Kodigo ng Sesyon" en="Session Code" />
          </p>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-mono font-black text-brand-primary tracking-widest bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
              {code}
            </span>
            {showCopy && <CopyButton text={url} />}
          </div>
        </div>
      )}

      {showCopy && (
        <div className="mt-3 text-center">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-extrabold text-brand-primary hover:underline inline-flex items-center gap-1"
          >
            <span><Translate fil="Buksan ang Link ng Pagsali" en="Open Join Link" /></span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  )
}
