import { BufferGeometry, NormalBufferAttributes } from 'three'
import { Point3 } from '../../Geometry'

export type entityType = 'composite' | 'circle' | 'polygon' | 'line'

export interface DTOEntity {
  guid: string
  type: entityType
  rev: number
  builtRev: number
  cachedGeometry?: BufferGeometry
  invalidate: () => void
  geometry: () => BufferGeometry<NormalBufferAttributes>
  interactionPoints: Point3[]
  buildGeometry: () => BufferGeometry | undefined
}

//TODO - use functional tracking
