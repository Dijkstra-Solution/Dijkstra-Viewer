import { type DTOEntity } from './DTOEntity'
import { Point3 } from '../../Geometry'

export interface DTOPolygon extends DTOEntity {
  points: Point3[]
  color?: string
}

//TODO - add optional texture and UV mapping
//TODO - add parameter handles
