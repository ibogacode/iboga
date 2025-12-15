'use client'

import React, { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface SignaturePadProps {
  value?: string
  onChange: (signatureData: string) => void
  onClear?: () => void
  className?: string
}

export function SignaturePad({ value, onChange, onClear, className }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawingRef = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)
  const lastPointRef = useRef<{ x: number; y: number } | null>(null)

  // Initialize canvas size and restore signature if value exists
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size (only once, preserve content)
    const rect = canvas.getBoundingClientRect()
    if (canvas.width === 0 || canvas.height === 0) {
      canvas.width = rect.width
      canvas.height = 200
    }

    // Set drawing style
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // Restore signature if value exists
    if (value && value.startsWith('data:image')) {
      const img = new Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        setHasSignature(true)
      }
      img.src = value
    } else if (!value) {
      // Clear canvas if no value
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
    }
  }, [value])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const getCoordinates = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      
      if ('touches' in e) {
        return {
          x: (e.touches[0].clientX - rect.left) * scaleX,
          y: (e.touches[0].clientY - rect.top) * scaleY,
        }
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    }

    const startDrawing = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      isDrawingRef.current = true
      const { x, y } = getCoordinates(e)
      lastPointRef.current = { x, y }
      ctx.beginPath()
      ctx.moveTo(x, y)
    }

    const draw = (e: MouseEvent | TouchEvent) => {
      e.preventDefault()
      if (!isDrawingRef.current) return
      
      const { x, y } = getCoordinates(e)
      
      // If we have a last point, draw a line to maintain continuity
      if (lastPointRef.current) {
        ctx.beginPath()
        ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y)
        ctx.lineTo(x, y)
        ctx.stroke()
      } else {
        ctx.lineTo(x, y)
        ctx.stroke()
      }
      
      lastPointRef.current = { x, y }
      setHasSignature(true)
      
      // Save signature continuously as user draws
      const signatureData = canvas.toDataURL('image/png')
      onChange(signatureData)
    }

    const stopDrawing = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false
        lastPointRef.current = null
        // Final save when done drawing
        const signatureData = canvas.toDataURL('image/png')
        onChange(signatureData)
      }
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing)
    canvas.addEventListener('mousemove', draw)
    canvas.addEventListener('mouseup', stopDrawing)
    canvas.addEventListener('mouseleave', stopDrawing)

    // Touch events for mobile
    canvas.addEventListener('touchstart', startDrawing, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDrawing)

    return () => {
      canvas.removeEventListener('mousedown', startDrawing)
      canvas.removeEventListener('mousemove', draw)
      canvas.removeEventListener('mouseup', stopDrawing)
      canvas.removeEventListener('mouseleave', stopDrawing)
      canvas.removeEventListener('touchstart', startDrawing)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDrawing)
    }
  }, [onChange])

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setHasSignature(false)
      onChange('')
      if (onClear) {
        onClear()
      }
    }
  }

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="w-full h-48 border border-gray-300 rounded-md cursor-crosshair bg-white touch-none"
        style={{ touchAction: 'none' }}
      />
      <div className="flex justify-end mt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearSignature}
          className="text-xs"
          disabled={!hasSignature}
        >
          Clear
        </Button>
      </div>
      {hasSignature && (
        <p className="text-xs text-gray-500 mt-1">Signature captured</p>
      )}
    </div>
  )
}

