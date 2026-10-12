import { useMemo } from 'react'
import { useStudio } from './useStudio'
import { applyDepth, resampleUniform } from '@/core/math/arcLength'
import { computeSpectrum, maxHarmonics } from '@/core/math/dft'
import { realTerms, reconstruct, rmse, selectHarmonics } from '@/core/math/evaluate'

/**
 * Derived data: points → depth → contour → spectrum → active harmonics → RMSE.
 * Memoized on the inputs so the transform runs only when the drawing, depth
 * or N changes.
 */
export function useSpectrum() {
  const rawPoints = useStudio((s) => s.rawPoints)
  const depthMode = useStudio((s) => s.depthMode)
  const depthAmplitude = useStudio((s) => s.depthAmplitude)
  const depthHarmonic = useStudio((s) => s.depthHarmonic)
  const n = useStudio((s) => s.n)
  const k = useStudio((s) => s.k)
  const sort = useStudio((s) => s.sort)

  const points = useMemo(() => applyDepth(rawPoints, depthMode, depthAmplitude, depthHarmonic), [rawPoints, depthMode, depthAmplitude, depthHarmonic])
  const contour = useMemo(() => resampleUniform(points, n), [points, n])
  const spectrum = useMemo(() => computeSpectrum(contour), [contour])
  const kMax = maxHarmonics(n)
  const K = Math.min(k, kMax)

  const harmonics = useMemo(() => selectHarmonics(spectrum, K, sort), [spectrum, K, sort])
  const xTerms = useMemo(() => realTerms(spectrum.real, 'x', K, sort), [spectrum, K, sort])
  const yTerms = useMemo(() => realTerms(spectrum.real, 'y', K, sort), [spectrum, K, sort])
  const zTerms = useMemo(() => (spectrum.is3D ? realTerms(spectrum.real, 'z', K, sort) : []), [spectrum, K, sort])
  const approx = useMemo(() => reconstruct(spectrum, K), [spectrum, K])
  const error = useMemo(() => rmse(contour, approx), [contour, approx])

  const hasShape = rawPoints.length >= 3
  const is3D = spectrum.is3D
  return { contour, spectrum, harmonics, xTerms, yTerms, zTerms, approx, error, K, kMax, hasShape, is3D }
}

export type SpectrumData = ReturnType<typeof useSpectrum>
