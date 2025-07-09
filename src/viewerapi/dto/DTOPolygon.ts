import { DTOEntity } from './DTOEntity'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { HexToRGBNormalized } from '@/viewer/utils/colorUtil'
import { Earcut } from 'three/src/extras/Earcut.js'

export class DTOPolygon extends DTOEntity {
  readonly type: string = 'polygon'
  points: { x: number; y: number; z: number }[]
  color?: string
  constructor(guid: string, points: { x: number; y: number; z: number }[], color?: string) {
    super(guid)
    this.points = points
    this.color = color
  }

  protected buildGeometry(): BufferGeometry {
    //TODO - optimize so it will only get calculated if change has occured
    const v0 = new Vector3(this.points[0].x, this.points[0].y, this.points[0].z)
    const v1 = new Vector3(this.points[1].x, this.points[1].y, this.points[1].z)
    const v2 = new Vector3(this.points[2].x, this.points[2].y, this.points[2].z)

    const e1 = new Vector3().subVectors(v1, v0)
    const e2 = new Vector3().subVectors(v2, v0)
    const normal = new Vector3().crossVectors(e1, e2).normalize()

    const axisX = e1.clone().normalize()
    const axisY = new Vector3().crossVectors(normal, axisX).normalize()

    const projected: number[] = []
    this.points.forEach((point) => {
      const v = new Vector3(point.x, point.y, point.z).sub(v0)
      projected.push(v.dot(axisX), v.dot(axisY))
    })

    const indices = Earcut.triangulate(projected, [], 2)

    const geometry = new BufferGeometry()
    const posArray = new Float32Array(this.points.length * 3)
    this.points.forEach((point, index) => posArray.set([point.x, point.y, point.z], index * 3))
    geometry.setAttribute('position', new BufferAttribute(posArray, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // const shape = new Shape();
    // shape.moveTo(this.points[0].x, this.points[0].y);
    // for (let i = 1; i < this.points.length; i++) {
    //   shape.lineTo(this.points[i].x, this.points[i].y);
    // }
    // shape.closePath();
    // const geometry = new ShapeGeometry(shape) as BufferGeometry;

    const vertexCount = geometry.attributes.position.count
    const color: Float32Array = new Float32Array(vertexCount * 3)
    const rgb = HexToRGBNormalized(this.color ?? '000000')
    for (let i = 0; i < vertexCount; i++) {
      color[i * 3] = rgb.r
      color[i * 3 + 1] = rgb.g
      color[i * 3 + 2] = rgb.b
    }
    const colorAttribute = new BufferAttribute(color, 3)
    geometry.setAttribute('color', colorAttribute)
    return geometry
  }
}
//TODO - add optional texture and UV mapping
//TODO - add parameter handles
