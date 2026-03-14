'use client'

import { useEffect, useRef } from 'react'

export default function CityView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<unknown>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let app: { destroy: (removeView: boolean, stageOptions: { children: boolean }) => void; canvas: HTMLCanvasElement; stage: { addChild: (text: unknown) => void } } | null = null

    const initPixi = async () => {
      const PIXI = await import('pixi.js')

      app = new PIXI.Application() as typeof app

      await (app as { init: (options: Record<string, unknown>) => Promise<void> }).init({
        background: '#000000',
        resizeTo: containerRef.current!,
        antialias: true,
      })

      appRef.current = app

      if (containerRef.current && app) {
        containerRef.current.appendChild((app as { canvas: HTMLCanvasElement }).canvas)
      }

      const text = new PIXI.Text({
        text: 'City View — awaiting circuit data',
        style: {
          fill: 0xffffff,
          fontSize: 16,
          fontFamily: 'monospace',
        },
      })

      text.anchor.set(0.5)
      text.x = (app as { canvas: HTMLCanvasElement }).canvas.width / 2
      text.y = (app as { canvas: HTMLCanvasElement }).canvas.height / 2

      ;(app as { stage: { addChild: (child: unknown) => void } }).stage.addChild(text)
    }

    initPixi().catch(console.error)

    return () => {
      if (appRef.current) {
        ;(appRef.current as { destroy: (removeView: boolean, stageOptions: { children: boolean }) => void }).destroy(true, { children: true })
        appRef.current = null
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      style={{ background: '#1a1a2e' }}
    />
  )
}
