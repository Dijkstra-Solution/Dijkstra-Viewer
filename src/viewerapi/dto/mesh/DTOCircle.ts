import { type DTOEntity } from './DTOEntity'
import { Point3 } from '../../Geometry'

export interface DTOCircle extends DTOEntity {
  position: Point3
  normal: Point3
  radius: number
  color?: string
}
