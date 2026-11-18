import { resolve } from 'node:path'
import { captureBoundaryResult, readBoundaryResult } from './boundary-results.mjs'

const resultFile = process.env.CONTAINMENT_RESULTS
if (!resultFile) throw new Error('Missing isolated boundary result path')
captureBoundaryResult(
  resolve(import.meta.dirname, '../../tests/security/admin-rag.test.mjs'),
  resultFile,
)
readBoundaryResult(resultFile)
