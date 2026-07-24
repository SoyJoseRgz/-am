import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Html5Qrcode } from 'html5-qrcode'

const QR_SCANNER_ID = 'qr-scanner-element'

export default function QRScanner() {
  const navigate = useNavigate()
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState('')
  const startedRef = useRef(false)

  useEffect(() => {
    if (!scanning) return

    setError('')
    startedRef.current = false

    const scanner = new Html5Qrcode(QR_SCANNER_ID)

    scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
      },
      (decodedText) => {
        scanner.stop().catch(() => {})
        startedRef.current = false
        setScanning(false)
        try {
          const url = new URL(decodedText)
          const parts = url.pathname.match(/\/m\/(\d+)\/(\d+)/)
          if (parts) navigate(`/m/${parts[1]}/${parts[2]}`)
        } catch {
          const match = decodedText.match(/\/m\/(\d+)\/(\d+)/)
          if (match) navigate(`/m/${match[1]}/${match[2]}`)
        }
      },
      () => {},
    ).then(() => {
      startedRef.current = true
    }).catch((err) => {
      setError(err?.message || String(err))
    })

    return () => {
      if (startedRef.current) {
        scanner.stop().catch(() => {})
      }
    }
  }, [scanning, navigate])

  return (
    <>
      {!scanning ? (
        <Button onClick={() => setScanning(true)} size="lg" className="px-8">
          Escanear QR
        </Button>
      ) : (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4">
          <div id={QR_SCANNER_ID} className="w-full max-w-[400px]" style={{ minHeight: 300 }} />
          {error && <p className="text-red-400 text-sm mt-4 text-center">{error}</p>}
          <Button
            variant="outline"
            size="lg"
            onClick={() => setScanning(false)}
            className="mt-6 px-6"
          >
            Cancelar
          </Button>
        </div>
      )}
    </>
  )
}
