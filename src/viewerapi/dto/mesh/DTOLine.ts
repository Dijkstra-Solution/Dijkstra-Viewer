import { type DTOEntity } from './DTOEntity'
import { Point3 } from '../../Geometry'

export interface DTOLine extends DTOEntity {
  start: Point3
  end: Point3
  color?: string
  width?: number
}
