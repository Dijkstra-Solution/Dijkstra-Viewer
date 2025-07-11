import { BufferGeometry } from 'three'
import { DTOComposite, DTOEntity, DTOLine, DTOPolygon } from '@/viewerapi'
import { entityType } from '@/viewerapi/dto/mesh/DTOEntity'
import { DTOCircle } from '@/viewerapi/dto/mesh/DTOCircle'
import { buildCircle, buildComposite, buildLine, buildPolygon } from './buildGeometries'

const getBuildGeometry = (type: entityType, entity: DTOEntity): BufferGeometry | undefined => {
  switch (type) {
    case 'circle':
      return buildCircle(entity as DTOCircle)
    case 'composite':
      return buildComposite(entity as DTOComposite)
    case 'line':
      return buildLine(entity as DTOLine)
    case 'polygon':
      return buildPolygon(entity as DTOPolygon)
    default:
      return undefined
  }
}

const defaultEntity = (guid: string, type: entityType): DTOEntity => ({
  guid,
  type,
  rev: 0,
  builtRev: -1,
  interactionPoints: [],
  invalidate() {
    this.rev++
  },
  geometry() {
    if (this.rev != this.builtRev) {
      this.builtRev = this.rev
      this.cachedGeometry = this.buildGeometry()
    }
    return this.cachedGeometry!
  },
  buildGeometry() {
    return getBuildGeometry(type, this)
  },
})

export function createEntity<T extends DTOEntity>(
  guid: T['guid'],
  type: T['type'],
  specificFields?: Omit<T, keyof DTOEntity>,
): T {
  return {
    ...defaultEntity(guid, type),
    ...specificFields,
  } as T
}
