import { Canvas } from "@react-three/fiber";
import {
  CameraControls,
  OrthographicCamera,
  PerspectiveCamera,
} from "@react-three/drei";
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
import { useInteractionStore } from "../store/interactionStore";
import { useDijkstraViewerStore } from "@/store/dijkstraViewerStore";

interface ViewerProps {
  //TODO - expand feature customizability and write docs
  eventHandlers?: EventHandlerMap;
  initialView?: string | (() => void);
  style?: React.CSSProperties; // Stílusok a container elemhez
  className?: string; // CSS osztály a container elemhez
}

function Viewer({
  eventHandlers,
  initialView = "perspective",
  style,
}: ViewerProps) {
  const [useOrthographic, setUseOrthographic] = useState(false);
  const [cameraPosition, setCameraPosition] = useState([0, 0, 5]);
  const [cameraUp, setCameraUp] = useState([0, 1, 0]);
  const [cameraZoom, setCameraZoom] = useState(12);
  const [cameraTarget, setCameraTarget] = useState([0, 0, 0]);
  const [cameraConstraints, setCameraConstraints] = useState<{
    azimuthRotateSpeed?: number;
    polarRotateSpeed?: number;
    truckSpeed?: number;
    dollySpeed?: number;
    draggingSmoothTime?: number;
    smoothTime?: number;
  }>({});

  const { on, off, fire, mergedGeometry, views, actions } = useViewer();

  const { Attributes } = useDijkstraViewerStore();
  const { Hover, Selection } = Attributes;

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

  //#region Interaction Store
  const {
    hoveredGUID,
    setHoveredGUID,
    hoveredObjects,
    setHoveredObjects,
    hoverIndex,
    setHoverIndex,
    hoveredOutlineGeometry,
    setHoveredOutlineGeometry,
    selectedGUIDs,
    setSelectedGUIDs,
    selectedOutlineGeometry,
    setSelectedOutlineGeometry,
    intersectionPoint,
    setIntersectionPoint,
    cycleHover,
  } = useInteractionStore();
  //#endregion

  const createOutlineGeometry = useCallback(
    (guids: Set<string> | string | null) => {
      if (!guids || (guids instanceof Set && guids.size === 0)) return null;
      if (!(guids instanceof Set)) guids = new Set([guids]);

      const positionAttribute = mergedGeometry.attributes.position;
      const indexArray = mergedGeometry.index;
      if (!indexArray || !positionAttribute) return null;

      const faceMap: Record<number, string> = mergedGeometry.userData.faceMap;
      const edgeMap = new Map<
        string,
        { a: number; b: number; count: number }
      >();
      const triCount = indexArray.count / 3;
      for (let i = 0; i < triCount; i++) {
        if (!guids.has(faceMap[i])) continue;
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
      return lsGeo;
    },
    [mergedGeometry]
  );

  //#region Hover
  // const [hoveredObjects, setHoveredObjects] = useState<number[]>([]);
  // const [hoveredGUID, setHoveredGUID] = useState<string | null>(null);
  // const [hoverIndex, setHoverIndex] = useState<number>(0);
  // const [hoveredOutlineGeometry, setHoveredOutlineGeometry] = useState<LineSegmentsGeometry | null>(null);
  const hoveredOutlineMaterial = useMemo<LineMaterial>(
    () =>
      new LineMaterial({
        color: Hover.Color,
        linewidth: Hover.Thickness,
        depthTest: false,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }),
    [Hover.Color, Hover.Thickness]
  );

  //Hovered Outline Geometry
  useEffect(() => {
    const lsGeo = createOutlineGeometry(hoveredGUID);
    setHoveredOutlineGeometry(lsGeo);
    // setHoveredOutlineGeometry((old) => {
    //   if (old) old.dispose();
    //   return lsGeo;
    // });
    return () => lsGeo?.dispose();
  }, [hoveredGUID, createOutlineGeometry, setHoveredOutlineGeometry]);

  //Cycle Hovered Objects    //TODO - bind this to action (ie CycleHover())
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Tab") {
        event.preventDefault();
        cycleHover();
        const newIndex = (hoverIndex + 1) % (hoveredObjects.length ?? 1);
        // setHoverIndex(newIndex);
        const ind = hoveredObjects[newIndex];
        if (ind != undefined && ind != null)
          setHoveredGUID(mergedGeometry?.userData?.faceMap?.[ind]);
        else setHoveredGUID(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [hoveredObjects, hoverIndex, mergedGeometry, cycleHover, setHoveredGUID]);

  //#endregion

  const selectedOutlineMaterial = useMemo<LineMaterial>(
    () =>
      new LineMaterial({
        color: Selection.Color,
        linewidth: Selection.Thickness,
        depthTest: false,
        resolution: new THREE.Vector2(window.innerWidth, window.innerHeight),
      }),
    [Selection.Color, Selection.Thickness]
  );

  //Selected Outline Geometry
  useEffect(() => {
    const lsGeo = createOutlineGeometry(selectedGUIDs);
    setSelectedOutlineGeometry(lsGeo);
    // setSelectedOutlineGeometry((old) => {
    //   if (old) old.dispose();
    //   return lsGeo;
    // });
    return () => lsGeo?.dispose();
  }, [selectedGUIDs, createOutlineGeometry, setSelectedOutlineGeometry]);
  //#endregion

  //#region Sphere on Intersection
  // const [intersectionPoint, setIntersectionPoint] = useState<THREE.Vector3 | null>(null);
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
        //TODO - clean up nested if spaghetti
        if (intersects.length > 0) {
          if (Selection.Enabled) {
            //TODO - handle hover being disabled
            if (hoveredGUID) {
              if (Selection.Remove) {
                if (selectedGUIDs.has(hoveredGUID)) {
                  const newSelection = new Set(selectedGUIDs);
                  newSelection.delete(hoveredGUID);
                  setSelectedGUIDs(newSelection);
                  fire(Events.SelectionChanged, {
                    guids: Array.from(newSelection),
                  });
                }
              } else if (Selection.Multiple) {
                if (!selectedGUIDs.has(hoveredGUID)) {
                  const newSelection = [...selectedGUIDs, hoveredGUID];
                  setSelectedGUIDs(new Set(newSelection));
                  fire(Events.SelectionChanged, {
                    guids: newSelection,
                  });
                }
              } else {
                setSelectedGUIDs(new Set([hoveredGUID]));
                fire(Events.SelectionChanged, { guids: [hoveredGUID] });
              }
            } else {
              setSelectedGUIDs(new Set());
              fire(Events.SelectionChanged, { guids: [] });
            }
          }
          fire(Events.SceneClicked, {
            guid: hoveredGUID ?? undefined,
            point: {
              x: intersects[hoverIndex].point.x,
              y: intersects[hoverIndex].point.y,
              z: intersects[hoverIndex].point.z,
            },
            normal: {
              x: intersects[hoverIndex].face?.normal.x ?? 0,
              y: intersects[hoverIndex].face?.normal.y ?? 0,
              z: intersects[hoverIndex].face?.normal.z ?? 0,
            },
          });
        } else {
          if (Selection.Enabled && !Selection.Remove && !Selection.Multiple) {
            setSelectedGUIDs(new Set());
            fire(Events.SelectionChanged, { guids: [] });
          }
          const pointOnPlane = raycaster.ray.intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
            new THREE.Vector3()
          );

          if (pointOnPlane) {
            fire(Events.SceneClicked, {
              point: {
                x: pointOnPlane.x,
                y: pointOnPlane.y,
                z: pointOnPlane.z,
              },
              normal: { x: 0, y: 1, z: 0 },
            });
          }
        }
      }
    },
    [
      Selection.Enabled,
      Selection.Remove,
      Selection.Multiple,
      fire,
      getMouse,
      hoverIndex,
      hoveredGUID,
      selectedGUIDs,
      setSelectedGUIDs,
    ]
  );

  const handleMouseMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!Hover.Enabled) return;
      const ctx = three.current;
      if (!ctx) return;

      const { camera, raycaster, scene } = ctx;
      const mouse = getMouse(event);
      raycaster.layers.set(0);
      raycaster.firstHitOnly = false;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        setHoveredObjects(
          intersects
            .map((i) => i.faceIndex)
            .filter((i) => i != undefined && i != null)
        );

        let guid = undefined;
        const ind = intersects[0].faceIndex;
        if (ind != undefined && ind != null) {
          guid = (intersects[0].object as THREE.Mesh).geometry.userData
            .faceMap?.[ind];
        }
        setHoveredGUID(guid ?? null);
        setIntersectionPoint(intersects[0].point);
      } else {
        setHoverIndex(0);
        setHoveredObjects([]);
        setHoveredGUID(null);
        setIntersectionPoint(null);
      }
    },
    [
      getMouse,
      Hover.Enabled,
      setHoveredGUID,
      setHoverIndex,
      setHoveredObjects,
      setIntersectionPoint,
    ]
  );
  //#endregion

  //#region View Management
  // Handle camera type changes from view settings
  useEffect(() => {
    // Create a custom event handler for the view changed event
    const handleViewChanged = (data: { view: string }) => {
      const settings = views.getView(data.view)!.getViewSettings();
      const saved = views.getSavedCameraState(data.view);
      setUseOrthographic(!!settings.useOrthographicCamera);
      setCameraPosition(saved?.position ?? settings.position);
      setCameraUp(saved?.up ?? settings.up);
      setCameraZoom(saved?.zoom ?? 12);
      setCameraConstraints(settings.constraints ?? {});
      setCameraTarget(saved?.target ?? settings.target);
    };

    // Register for the ViewChanged event
    on("ViewChanged", handleViewChanged);

    return () => {
      // Cleanup event listener
      off("ViewChanged", handleViewChanged);
    };
  }, [on, off, views, cameraTarget]);

  // Setup camera controls monitoring - only runs once on mount
  useEffect(() => {
    // Store the references to avoid closure issues;
    const currentInitialView = initialView;

    // Try to setup camera controls when available
    const checkInterval = setInterval(() => {
      if (cameraControlRef.current) {
        // Set initial view once camera controls are available
        if (typeof currentInitialView === "string") {
          actions.SetView(currentInitialView);
        }
        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup interval when component unmounts
    return () => clearInterval(checkInterval);
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      if (cameraControlRef.current) {
        // Set camera controls reference to the ViewManager
        views.setCameraControlsRef(cameraControlRef);

        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup interval when component unmounts
    return () => clearInterval(checkInterval);
  }, [useOrthographic, views]);
  //#endregion

  // Container stílus a felhasználói stílus és az alapértelmezett értékek kombinálásával
  const containerStyles: React.CSSProperties = {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    margin: "10px",
    overflow: "hidden",

    flex: 1,
    ...style,
  };

  const angle = (3 * Math.PI) / 4;
  return (
    <div style={containerStyles} ref={containerRef}>
      <Canvas
        //TODO - pass active camera to raycaster
        camera={{ position: [0, 0, 5] }}
        onCreated={({ scene, camera, raycaster }) => {
          camera.layers.enableAll();
          three.current = {
            scene,
            camera: camera as THREE.PerspectiveCamera, // Will be replaced
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

        {/*TODO Switch flash */}
        {/* Conditional camera rendering based on useOrthographic state */}
        <OrthographicCamera
          makeDefault={useOrthographic}
          position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
          up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
          zoom={cameraZoom}
          near={0.1}
          far={1000}
        />
        <PerspectiveCamera
          makeDefault={!useOrthographic}
          position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
          up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
          fov={75}
          near={0.1}
          far={1000}
        />
        <CameraControls
          ref={cameraControlRef}
          azimuthRotateSpeed={
            cameraConstraints.azimuthRotateSpeed !== undefined
              ? cameraConstraints.azimuthRotateSpeed
              : 1.0
          }
          polarRotateSpeed={
            cameraConstraints.polarRotateSpeed !== undefined
              ? cameraConstraints.polarRotateSpeed
              : 1.0
          }
          truckSpeed={
            cameraConstraints.truckSpeed !== undefined
              ? cameraConstraints.truckSpeed
              : 1.0
          }
          dollySpeed={
            cameraConstraints.dollySpeed !== undefined
              ? cameraConstraints.dollySpeed
              : 1.0
          }
          draggingSmoothTime={
            cameraConstraints.draggingSmoothTime !== undefined
              ? cameraConstraints.draggingSmoothTime
              : 0
          }
          smoothTime={
            cameraConstraints.smoothTime !== undefined
              ? cameraConstraints.smoothTime
              : 0
          }
        />
        <gridHelper args={[20, 20, "#888888", "#444444"]} raycast={() => {}} />
      </Canvas>
    </div>
  );
}

export { Viewer };
