import '../App.css'
import { Viewer } from '@/viewer/Viewer'
import { DTOPolygon } from '@/viewerapi/dto/DTOPolygon'
import { DTOComposite } from '@/viewerapi/dto/DTOComposite'
import { generateUUID } from 'three/src/math/MathUtils.js'
import { useCallback, useMemo, useState } from 'react'
import { useEffect } from 'react'
// import { useViews } from "@/viewer/hooks/useViews";
import { createDijkstraViewerStore } from '@/store/dijkstraViewerStore'
import { colors } from '@/constants/colors'
import { Point3 } from '@/viewerapi/Geometry'

export function ClientTest() {
  const viewerStore1 = useMemo(() => createDijkstraViewerStore(), [])
  const { Actions, Views, Attributes, SetAttribute, on } = viewerStore1.getState()

  const viewerStore2 = useMemo(() => createDijkstraViewerStore(), [])

  const [view1, setView1] = useState('perspective')
  const [view2, setView2] = useState('top')

  const [shiftHeld, setShiftHeld] = useState(false)
  const [controlHeld, setControlHeld] = useState(false)

  const [selectedGuids, setSelectedGuids] = useState<string[]>([])

  function upHandler({ key }) {
    if (key === 'Shift') {
      setShiftHeld(false)
    }
    if (key === 'Control') {
      setControlHeld(false)
    }
  }

  const downHandler = useCallback(
    ({ key }) => {
      if (key === 'Shift') {
        setShiftHeld(true)
      }
      if (key === 'Control') {
        setControlHeld(true)
      }
      if (key === 'Delete') {
        selectedGuids.forEach((guid) => Actions.RemoveEntity(guid))
      }
    },
    [Actions, selectedGuids],
  )

  useEffect(() => {
    Attributes.Hover.Enabled = true
    Attributes.Selection.Enabled = true
    Attributes.Viewer.BackgroundColor = colors.background
    Attributes.Hover.Color = colors.primary
    Attributes.Selection.Color = colors.primarySelected
    on('StatusMessageChanged', ({ message }) => {
      console.log(message)
    })

    on('SelectionChanged', (payload) => {
      setSelectedGuids(payload.guids)
    })
    //eslint-disable-next-line
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', downHandler)
    window.addEventListener('keyup', upHandler)
    return () => {
      window.removeEventListener('keydown', downHandler)
      window.removeEventListener('keyup', upHandler)
    }
  }, [downHandler])

  useEffect(() => {
    Actions.CreateView('client-view', 'Egyedi nézet', {
      position: [0, 3, 10],
      target: [0, 0, 0],
      up: [0, 1, 0],
    })
  }, [Actions])

  useEffect(() => {
    Attributes.Selection.Multiple = shiftHeld
  }, [shiftHeld, Attributes.Selection])

  useEffect(() => {
    Attributes.Selection.Remove = controlHeld
  }, [controlHeld, Attributes.Selection])

  const randomHex = () =>
    Math.floor(Math.random() * colors.foreground)
      .toString(16)
      .padEnd(6, '0')

  const createBox = (point: Point3) => {
    const blc = { x: point.x - 0.5, y: point.y - 0.5, z: point.z + 0.5 }
    const brc = { x: point.x + 0.5, y: point.y - 0.5, z: point.z + 0.5 }
    const tlc = {
      x: point.x - 0.5,
      y: point.y + 0.5,
      z: point.z + 0.5,
    }
    const trc = {
      x: point.x + 0.5,
      y: point.y + 0.5,
      z: point.z + 0.5,
    }

    const blf = { x: point.x - 0.5, y: point.y - 0.5, z: point.z - 0.5 }
    const brf = { x: point.x + 0.5, y: point.y - 0.5, z: point.z - 0.5 }
    const tlf = {
      x: point.x - 0.5,
      y: point.y + 0.5,
      z: point.z - 0.5,
    }
    const trf = {
      x: point.x + 0.5,
      y: point.y + 0.5,
      z: point.z - 0.5,
    }

    const col = randomHex()
    const bottom = new DTOPolygon(generateUUID(), [blc, blf, brf, brc], col)
    const top = new DTOPolygon(generateUUID(), [tlc, trc, trf, tlf], col)
    const left = new DTOPolygon(generateUUID(), [blc, tlc, tlf, blf], col)
    const right = new DTOPolygon(generateUUID(), [brc, brf, trf, trc], col)
    const front = new DTOPolygon(generateUUID(), [blc, brc, trc, tlc], col)
    const back = new DTOPolygon(generateUUID(), [blf, tlf, trf, brf], col)

    const composite = new DTOComposite(generateUUID())
    composite.children.push(bottom, top, left, right, front, back)
    console.log(Views)
    return composite
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100%',
      }}
    >
      <div>
        <button
          onClick={() => {
            Actions.SelectPoints(1, (surfacePoints) => {
              console.log(surfacePoints[0])
              const box = createBox({
                x: Math.round(surfacePoints[0].point.x + surfacePoints[0].normal.x / 2),
                y: Math.round(surfacePoints[0].point.y + surfacePoints[0].normal.y / 2),
                z: Math.round(surfacePoints[0].point.z + surfacePoints[0].normal.z / 2),
              })
              Actions.AddEntity(box)
            })
          }}
        >
          Create Box
        </button>
        <button
          style={{
            backgroundColor: Attributes.Hover.Enabled ? 'green' : 'red',
          }}
          onClick={() => {
            SetAttribute('Hover', { Enabled: !Attributes.Hover.Enabled })
            console.log(Views)
          }}
        >
          Toggle Hover
        </button>

        <div style={{ display: 'flex', gap: 12 }}>
          <div>
            <h4>Viewer 1 nézete:{view1}</h4>
            {Array.from(Views.values()).map((v) => (
              <button key={v.viewId} onClick={() => setView1(v.viewId)}>
                {v.displayName}
              </button>
            ))}
          </div>
          <div>
            <h4>Viewer 2 nézete:{view2}</h4>
            {Array.from(Views.values()).map((v) => (
              <button key={v.viewId} onClick={() => setView2(v.viewId)}>
                {v.displayName}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Viewer activeView={view1} store={viewerStore1} style={{ border: '1px solid white' }} />
      <Viewer activeView={view2} store={viewerStore2} style={{ border: '1px solid white' }} />
    </div>
  )
}
