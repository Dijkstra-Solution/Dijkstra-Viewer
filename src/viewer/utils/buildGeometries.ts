import { HexToRGBNormalized } from './colorUtil'
import { BufferAttribute, BufferGeometry, CircleGeometry, Vector3 } from 'three'
import { DTOCircle } from '@/viewerapi/dto/mesh/DTOCircle'
import { DTOComposite, DTOLine, DTOPolygon } from '@/viewerapi'
import { BufferGeometryUtils, LineGeometry } from 'three/examples/jsm/Addons.js'
import { Earcut } from 'three/src/extras/Earcut.js'

const buildCircle = (entity: DTOCircle) => {
  //TODO . apply LOD here
  const dir = new Vector3(entity.normal.x, entity.normal.y, entity.normal.z).normalize()
  const geometry = new CircleGeometry(entity.radius, 32)
    .lookAt(dir)
    .translate(entity.position.x, entity.position.y, entity.position.z)

  const vertexCount = geometry.attributes.position.count
  const color: Float32Array = new Float32Array(vertexCount * 3)
  const rgb = HexToRGBNormalized(entity.color ?? '000000')
  for (let i = 0; i < vertexCount; i++) {
    color[i * 3] = rgb.r
    color[i * 3 + 1] = rgb.g
    color[i * 3 + 2] = rgb.b
  }
  const colorAttribute = new BufferAttribute(color, 3)
  geometry.setAttribute('color', colorAttribute)
  return geometry
}

const buildComposite = (entity: DTOComposite) => {
  return BufferGeometryUtils.mergeGeometries(entity.children.map((c) => c.geometry()))
}

const buildLine = (entity: DTOLine) => {
  return new LineGeometry().setFromPoints([
    new Vector3(entity.start.x, entity.start.y, entity.start.z),
    new Vector3(entity.end.x, entity.end.y, entity.end.z),
  ])
}

const buildPolygon = (entity: DTOPolygon) => {
  {
    //TODO - optimize so it will only get calculated if change has occured
    const v0 = new Vector3(entity.points[0].x, entity.points[0].y, entity.points[0].z)
    const v1 = new Vector3(entity.points[1].x, entity.points[1].y, entity.points[1].z)
    const v2 = new Vector3(entity.points[2].x, entity.points[2].y, entity.points[2].z)

    const e1 = new Vector3().subVectors(v1, v0)
    const e2 = new Vector3().subVectors(v2, v0)
    const normal = new Vector3().crossVectors(e1, e2).normalize()

    const axisX = e1.clone().normalize()
    const axisY = new Vector3().crossVectors(normal, axisX).normalize()

    const projected: number[] = []
    entity.points.forEach((point) => {
      const v = new Vector3(point.x, point.y, point.z).sub(v0)
      projected.push(v.dot(axisX), v.dot(axisY))
    })

    const indices = Earcut.triangulate(projected, [], 2)

    const geometry = new BufferGeometry()
    const posArray = new Float32Array(entity.points.length * 3)
    entity.points.forEach((point, index) => posArray.set([point.x, point.y, point.z], index * 3))
    geometry.setAttribute('position', new BufferAttribute(posArray, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()

    // const shape = new Shape();
    // shape.moveTo(entity.points[0].x, entity.points[0].y);
    // for (let i = 1; i < entity.points.length; i++) {
    //   shape.lineTo(entity.points[i].x, entity.points[i].y);
    // }
    // shape.closePath();
    // const geometry = new ShapeGeometry(shape) as BufferGeometry;

    const vertexCount = geometry.attributes.position.count
    const color: Float32Array = new Float32Array(vertexCount * 3)
    const rgb = HexToRGBNormalized(entity.color ?? '000000')
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

export { buildCircle, buildComposite, buildLine, buildPolygon }
