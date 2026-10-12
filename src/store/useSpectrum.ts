import { useMemo } from 'react'
import { useStudio } from './useStudio'
import { resampleUniform } from '@/core/math/arcLength'
import { computeSpectrum, maxHarmonics } from '@/core/math/dft'
import { realTerms, reconstruct, rmse, selectHarmonics } from '@/core/math/evaluate'

/**
 * Derived data: contour → spectrum → active harmonics → RMSE.
 * Memoized on the inputs so the DFT runs only when the drawing or N changes.
 */
export function useSpectrum() {
  const rawPoints = useStudio((s) => s.rawPoints)
  const n = useStudio((s) => s.n)
  const k = useStudio((s) => s.k)
  const sort = useStudio((s) => s.sort)

  const contour = useMemo(() => resampleUniform(rawPoints, n), [rawPoints, n])
  const spectrum = useMemo(() => computeSpectrum(contour), [contour])
  const kMax = maxHarmonics(n)
  const K = Math.min(k, kMax)

  const harmonics = useMemo(() => selectHarmonics(spectrum, K, sort), [spectrum, K, sort])
  const xTerms = useMemo(() => realTerms(spectrum.real, 'x', K, sort), [spectrum, K, sort])
  const yTerms = useMemo(() => realTerms(spectrum.real, 'y', K, sort), [spectrum, K, sort])
  const approx = useMemo(() => reconstruct(spectrum, K), [spectrum, K])
  const error = useMemo(() => rmse(contour, approx), [contour, approx])

  const hasShape = rawPoints.length >= 3
  return { contour, spectrum, harmonics, xTerms, yTerms, approx, error, K, kMax, hasShape }
}

export type SpectrumData = ReturnType<typeof useSpectrum>
