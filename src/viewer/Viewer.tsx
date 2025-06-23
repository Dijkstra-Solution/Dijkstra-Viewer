import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import { Events, EventType } from "../viewerapi/Events";
import { useViewer } from "./hooks/useViewer";
import { EventHandlerMap } from "./EventHandlerMap";
import {
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three/examples/jsm/Addons.js";
import { SelectionMode, ViewType } from "@/viewerapi/EventTypes";

interface ViewerProps {
  //TODO - expand feature customizability and write docs
  eventHandlers?: EventHandlerMap;
  features?: {
    hover?: {
      enabled?: boolean;
      color?: number;
    };
    selection?: {
      enabled?: boolean;
      color?: number;
    };
    snapping?: {
      enabled?: boolean;
      
    };
  };
  initialView?: ViewType | (() => void);
  style?: React.CSSProperties; // Stílusok a container elemhez
  className?: string; // CSS osztály a container elemhez
}

function Viewer({
  eventHandlers,
  features,
  initialView = "perspective",
  style,
}: ViewerProps) {
  const { on, off, fire, mergedGeometry, viewManager } = useViewer();

  const [selectionMode, setSelectionMode] = useState<SelectionMode>(
    SelectionMode.DEFAULT
  );

  const cameraControlRef = useRef<CameraControls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mergedGeometryMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      vertexColors: true,
    });
  }, []);

  //#region Event Handler Registration on Mount
  useEffect(() => {
    Object.entries(eventHandlers ?? {}).forEach(([event, handler]) => {
      on(event as EventType, handler);
    });

    //TODO
    // const selectionModeHandler = ({ mode: mode }: { mode: SelectionMode }) => {
    //   setSelectionMode(mode);
    // };

    return () => {
      Object.entries(eventHandlers ?? {}).forEach(([event, handler]) => {
        off(event as EventType, handler);
      });
    };
  }, [on, off, eventHandlers]);
  //#endregion

  //#region Hover
  const [hoveredGUID, setHoveredGUID] = useState<string | null>(null);
  const [hoveredOutlineGeometry, setHoveredOutlineGeometry] =
    useState<LineSegmentsGeometry | null>(null);
  const hoveredOutlineMaterial = useMemo<LineMaterial>(
    () =>
      new LineMaterial({
        color: features?.hover?.color ?? 0xffffff,
        linewidth: 3,
        depthTest: false,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }),
    [features?.hover?.color]
  );
  useEffect(() => {
    if (!hoveredGUID || !mergedGeometry) {
      setHoveredOutlineGeometry((old) => {
        if (old) old.dispose();
        return null;
      });
      return;
    }
    const positionAttribute = mergedGeometry.attributes.position;
    const indexArray = mergedGeometry.index;
    if (!indexArray || !positionAttribute) return;

    // const edgeGeometryIndices: number[] = [];
    // for (let i = 0; i < indexArray.count / 3; i++) {
    //   if (faceMap[i] === hoveredGUID) {
    //     edgeGeometryIndices.push(
    //       indexArray.array[i * 3],
    //       indexArray.array[i * 3 + 1],
    //       indexArray.array[i * 3 + 2]
    //     );
    //   }
    // }
    //
    // const edgeGeometry = new THREE.BufferGeometry();
    // edgeGeometry.setAttribute("position", positionAttribute);
    // edgeGeometry.setIndex(edgeGeometryIndices);
    // edgeGeometry.computeVertexNormals();
    // const edges = new THREE.EdgesGeometry(edgeGeometry);
    //
    // setHoveredOutlineGeometry((old) => {
    //   if (old) old.dispose();
    //   return edges;
    // });
    // console.log("recalculating");
    // edgeGeometry.dispose();

    // return () => {
    //   edges.dispose();
    // };
    const faceMap: Record<number, string> = mergedGeometry.userData.faceMap;
    const edgeMap = new Map<string, { a: number; b: number; count: number }>();
    const triCount = indexArray.count / 3;
    for (let i = 0; i < triCount; i++) {
      if (faceMap[i] !== hoveredGUID) continue;
      const a = indexArray.array[i * 3];
      const b = indexArray.array[i * 3 + 1];
      const c = indexArray.array[i * 3 + 2];
      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(([v1, v2]) => {
        const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
        const existing = edgeMap.get(key);
        if (existing) existing.count++;
        else edgeMap.set(key, { a: v1, b: v2, count: 1 });
      });
    }
    const positions: number[] = [];
    edgeMap.forEach(({ a, b, count }) => {
      if (count == 1) {
        positions.push(positionAttribute.array[a * 3]);
        positions.push(positionAttribute.array[a * 3 + 1]);
        positions.push(positionAttribute.array[a * 3 + 2]);
        positions.push(positionAttribute.array[b * 3]);
        positions.push(positionAttribute.array[b * 3 + 1]);
        positions.push(positionAttribute.array[b * 3 + 2]);
      }
    });
    const lsGeo = new LineSegmentsGeometry();
    lsGeo.setPositions(positions);
    setHoveredOutlineGeometry((old) => {
      if (old) old.dispose();
      return lsGeo;
    });

    return () => {
      lsGeo.dispose();
    };
  }, [hoveredGUID, mergedGeometry]);
  //#endregion

  //#region Seletion
  const [selectedGUIDs, setSelectedGUIDs] = useState<Set<string>>(
    new Set<string>()
  );
  const [selectedOutlineGeometry, setSelectedOutlineGeometry] =
    useState<LineSegmentsGeometry | null>(null);
  const selectedOutlineMaterial = useMemo<LineMaterial>(
    () =>
      new LineMaterial({
        color: features?.selection?.color ?? 0xffffff,
        linewidth: 3,
        depthTest: false,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }),
    [features?.selection?.color]
  );

  useEffect(() => {
    if (selectedGUIDs.size === 0 || !mergedGeometry) {
      setSelectedOutlineGeometry((old) => {
        if (old) old.dispose();
        return null;
      });
      return;
    }

    const positionAttribute = mergedGeometry.attributes.position;
    const indexArray = mergedGeometry.index;
    if (!indexArray || !positionAttribute) return;

    const faceMap: Record<number, string> = mergedGeometry.userData.faceMap;
    const edgeMap = new Map<string, { a: number; b: number; count: number }>();
    const triCount = indexArray.count / 3;
    for (let i = 0; i < triCount; i++) {
      if (!selectedGUIDs.has(faceMap[i])) continue;
      const a = indexArray.array[i * 3];
      const b = indexArray.array[i * 3 + 1];
      const c = indexArray.array[i * 3 + 2];
      [
        [a, b],
        [b, c],
        [c, a],
      ].forEach(([v1, v2]) => {
        const key = v1 < v2 ? `${v1}_${v2}` : `${v2}_${v1}`;
        const existing = edgeMap.get(key);
        if (existing) existing.count++;
        else edgeMap.set(key, { a: v1, b: v2, count: 1 });
      });
    }
    const positions: number[] = [];
    edgeMap.forEach(({ a, b, count }) => {
      if (count == 1) {
        positions.push(positionAttribute.array[a * 3]);
        positions.push(positionAttribute.array[a * 3 + 1]);
        positions.push(positionAttribute.array[a * 3 + 2]);
        positions.push(positionAttribute.array[b * 3]);
        positions.push(positionAttribute.array[b * 3 + 1]);
        positions.push(positionAttribute.array[b * 3 + 2]);
      }
    });
    const lsGeo = new LineSegmentsGeometry();
    lsGeo.setPositions(positions);
    setSelectedOutlineGeometry((old) => {
      if (old) old.dispose();
      return lsGeo;
    });
  }, [selectedGUIDs, mergedGeometry]);
  //#endregion

  //#region Sphere on Intersection
  const [intersectionPoint, setIntersectionPoint] =
    useState<THREE.Vector3 | null>(null);
  const intersectionSphereRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (intersectionSphereRef.current) {
      intersectionSphereRef.current.layers.set(1);
    }
  }, [intersectionPoint]);
  //#endregion

  //TODO - refine this (useThree / put into separate component)
  const three = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
  }>(null);

  //#region Mouse Handling and Intersections
  const getMouse = useCallback(
    (event: React.PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - (rect?.left ?? 0)) / (rect?.width ?? 1)) * 2 - 1,
        -((event.clientY - (rect?.top ?? 0)) / (rect?.height ?? 1)) * 2 + 1
      );
      return mouse;
    },
    [containerRef]
  );

  const handleClick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button == 0) {
        const ctx = three.current;
        if (!ctx) return;

        const { scene, camera, raycaster } = ctx;
        const mouse = getMouse(event);
        raycaster.setFromCamera(mouse, camera);
        raycaster.layers.set(0);
        raycaster.firstHitOnly = false;
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
          let guid: string | undefined = undefined;
          const ind = intersects[0].faceIndex;
          if (features?.selection?.enabled && ind != undefined && ind != null) {
            guid = (intersects[0].object as THREE.Mesh).geometry.userData
              .faceMap?.[ind];
            setSelectedGUIDs((old) => new Set([...old, guid as string]));
            fire(Events.EntitySelected, { guid: guid });
          }
          //TODO - change/remove SceneClicked event
          fire(Events.SceneClicked, {
            guid: guid,
            point: {
              x: intersects[0].point.x,
              y: intersects[0].point.y,
              z: intersects[0].point.z,
            },
            normal: {
              x: intersects[0].face?.normal.x ?? 0,
              y: intersects[0].face?.normal.y ?? 0,
              z: intersects[0].face?.normal.z ?? 0,
            },
          });
          return;
        } else {
          if (features?.selection?.enabled) {
            setSelectedGUIDs(new Set());
            fire(Events.EntitySelected, { guid: undefined });
          }
        }
        const pointOnPlane = raycaster.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
          new THREE.Vector3()
        );

        if (pointOnPlane) {
          fire(Events.SceneClicked, {
            point: { x: pointOnPlane.x, y: pointOnPlane.y, z: pointOnPlane.z },
            normal: { x: 0, y: 1, z: 0 },
          });
        }
      }
    },
    [getMouse, features?.selection, fire]
  );

  const handleMouseMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!features?.hover?.enabled) return;
      const ctx = three.current;
      if (!ctx) return;

      const { camera, raycaster, scene } = ctx;
      const mouse = getMouse(event);
      raycaster.layers.set(0);
      raycaster.firstHitOnly = false;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        let guid = undefined;
        const ind = intersects[0].faceIndex;
        if (ind != undefined && ind != null) {
          guid = (intersects[0].object as THREE.Mesh).geometry.userData
            .faceMap?.[ind];
        }
        setHoveredGUID(guid ?? null);
        setIntersectionPoint(intersects[0].point);
      } else {
        setHoveredGUID(null);
        setIntersectionPoint(null);
      }
    },
    [getMouse, features?.hover?.enabled]
  );
  //#endregion

  // Setup camera controls monitoring
  useEffect(() => {
    // Try to setup camera controls when available
    const checkInterval = setInterval(() => {
      if (cameraControlRef.current) {
        // Set camera controls reference to the ViewManager
        viewManager.setCameraControlsRef(cameraControlRef);

        // Set initial view once camera controls are available
        if (initialView) {
          if (typeof initialView === "function") {
            // Function feature direct call
            initialView();
          } else {
            // String feature with ViewManager
            viewManager.setView(initialView);
            // ViewManager handles the event firing internally
          }
        }

        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup interval when component unmounts
    return () => clearInterval(checkInterval);
  }, [initialView, viewManager]);

  const containerStyles: React.CSSProperties = {
    position: "relative",
    margin: "10px",
    flex: 1,
    ...style,
  };

  // TODO - track light position based on user time
  const angle = (3 * Math.PI) / 4;

  return (
    <div style={containerStyles} ref={containerRef}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={({ scene, camera, raycaster }) => {
          camera.layers.enableAll();
          three.current = {
            scene,
            camera: camera as THREE.PerspectiveCamera,
            raycaster,
          };
        }}
        onPointerUp={handleClick}
        onMouseMove={handleMouseMove}
      >
        <ambientLight intensity={Math.PI / 3} />
        <directionalLight
          position={[100 * Math.cos(angle), 100 * Math.sin(angle), 0]}
          intensity={Math.PI}
        />

        {/* <pointLight position={[-10, 10, -10]} decay={0} intensity={Math.PI} /> */}
        <mesh
          geometry={mergedGeometry}
          material={mergedGeometryMaterial}
        ></mesh>

        {selectedOutlineGeometry && (
          <primitive
            object={
              new LineSegments2(
                selectedOutlineGeometry,
                selectedOutlineMaterial
              )
            }
            layers={1}
            renderOrder={2}
          />
        )}
        {hoveredOutlineGeometry && (
          <primitive
            object={
              new LineSegments2(hoveredOutlineGeometry, hoveredOutlineMaterial)
            }
            layers={1}
            renderOrder={3}
          />
        )}
        {intersectionPoint && (
          <mesh
            ref={intersectionSphereRef}
            position={[
              intersectionPoint.x,
              intersectionPoint.y,
              intersectionPoint.z,
            ]}
          >
            <sphereGeometry args={[0.1, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
        )}

        <CameraControls ref={cameraControlRef} />
        <gridHelper args={[20, 20, "#888888", "#444444"]} raycast={() => {}} />
        <axesHelper raycast={() => {}}></axesHelper>
      </Canvas>
    </div>
  );
}

export { Viewer };
