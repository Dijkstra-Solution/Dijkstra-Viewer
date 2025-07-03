import {
  BufferGeometryUtils,
  LineMaterial,
  LineSegments2,
  LineSegmentsGeometry,
} from "three/examples/jsm/Addons.js";
import * as THREE from "three";
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
import { useDijkstraViewerStore } from "@/store/dijkstraViewerStore";
import { useInteractionStore } from "../store/interactionStore";
import { useViewStore } from "../store/viewStore";

interface ViewerProps {
  activeView: string;
  style?: React.CSSProperties; // Styles for the container
  className?: string; // CSS class for the container
}

function Viewer({ style, activeView }: ViewerProps) {
  const [useOrthographic, setUseOrthographic] = useState(false);
  const [cameraPosition, setCameraPosition] = useState([0, 0, 5]);
  const [, setCameraTarget] = useState([0, 0, 0]);
  const [cameraUp, setCameraUp] = useState([0, 1, 0]);
  const [cameraZoom] = useState(12);
  const [cameraConstraints, setCameraConstraints] = useState<{
    azimuthRotateSpeed?: number;
    polarRotateSpeed?: number;
    truckSpeed?: number;
    dollySpeed?: number;
    draggingSmoothTime?: number;
    smoothTime?: number;
  }>({});

  const { Attributes, fire } = useDijkstraViewerStore();
  const { Hover, Selection } = Attributes;
  const entities = useDijkstraViewerStore((state) => state.entities);

  const {
    updateViewPosition,
    views,
    currentViewId: globalView,
  } = useViewStore();
  const activeViewId = activeView ?? globalView;

  // Ref to track if we're currently applying a view change
  const isApplyingViewChange = useRef(false);
  // Debounce timer for saving camera state
  const saveStateTimer = useRef<NodeJS.Timeout | null>(null);

  const mergedGeometry = useMemo(() => {
    const dtos = Array.from(entities.values());
    if (dtos.length === 0) return new THREE.BufferGeometry();

    const dtoGeometries = dtos.map((e) => e.geometry());
    const merged =
      BufferGeometryUtils.mergeGeometries(dtoGeometries) ??
      new THREE.BufferGeometry();

    let offset = 0;
    const faceMap: Record<number, string> = {};
    for (const dto of dtos) {
      const dtoGeometry = dto.geometry();
      const faceCount = dtoGeometry.index
        ? dtoGeometry.index.count / 3
        : dtoGeometry.attributes.position.count / 3;
      for (let i = 0; i < faceCount; i++) {
        faceMap[offset + i] = dto.guid;
      }
      offset += faceCount;
    }
    merged.userData.faceMap = faceMap;
    return merged;
  }, [entities]);

  const cameraControlRef = useRef<CameraControls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounced function to save camera state
  const saveCameraState = useCallback(() => {
    if (saveStateTimer.current) {
      clearTimeout(saveStateTimer.current);
    }

    saveStateTimer.current = setTimeout(() => {
      if (
        !activeViewId ||
        !cameraControlRef.current ||
        isApplyingViewChange.current
      ) {
        return;
      }

      const position = new THREE.Vector3();
      const target = new THREE.Vector3();

      cameraControlRef.current.getPosition(position);
      cameraControlRef.current.getTarget(target);

      // Update the view settings with current camera state
      updateViewPosition(
        activeViewId,
        [position.x, position.y, position.z],
        [target.x, target.y, target.z],
        cameraUp
      );
    }, 100);
  }, [activeViewId, updateViewPosition, cameraUp]);

  //#region Materials
  const mergedGeometryMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      vertexColors: true,
    });
  }, []);

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
  //Update Hovered Outline Geometry
  useEffect(() => {
    const lsGeo = createOutlineGeometry(hoveredGUID);
    setHoveredOutlineGeometry(lsGeo);
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

  //#region Selection
  //Update Selected Outline Geometry
  useEffect(() => {
    const lsGeo = createOutlineGeometry(selectedGUIDs);
    setSelectedOutlineGeometry(lsGeo);
    return () => lsGeo?.dispose();
  }, [selectedGUIDs, createOutlineGeometry, setSelectedOutlineGeometry]);
  //#endregion

  //#region Sphere on Intersection
  const intersectionSphereRef = useRef<THREE.Mesh>(null);
  useEffect(() => {
    if (intersectionSphereRef.current)
      intersectionSphereRef.current.layers.set(1);
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

        //#region SceneClicked
        if (intersects.length > 0) {
          fire("SceneClicked", {
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
          const pointOnPlane = raycaster.ray.intersectPlane(
            new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
            new THREE.Vector3()
          );

          if (pointOnPlane) {
            fire("SceneClicked", {
              point: {
                x: pointOnPlane.x,
                y: pointOnPlane.y,
                z: pointOnPlane.z,
              },
              normal: { x: 0, y: 1, z: 0 },
            });
          }
        }
        //#endregion

        if (!Selection.Enabled) return;

        if (!hoveredGUID) {
          if (!Selection.Multiple && !Selection.Remove) {
            setSelectedGUIDs(new Set());
            fire("SelectionChanged", { guids: [] });
          }
          return;
        }

        if (Selection.Multiple) {
          if (!selectedGUIDs.has(hoveredGUID)) {
            const updated = [...selectedGUIDs, hoveredGUID];
            setSelectedGUIDs(new Set(updated));
            fire("SelectionChanged", {
              guids: updated,
            });
          }
          return;
        }

        if (Selection.Remove) {
          if (selectedGUIDs.has(hoveredGUID)) {
            const updated = new Set(selectedGUIDs);
            updated.delete(hoveredGUID);
            setSelectedGUIDs(updated);
            fire("SelectionChanged", {
              guids: Array.from(updated),
            });
          }
          return;
        }

        setSelectedGUIDs(new Set([hoveredGUID]));
        fire("SelectionChanged", { guids: [hoveredGUID] });
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

  useEffect(() => {
    const viewId = currentViewId;
    if (!viewId) return;

    const viewData = views.get(viewId);
    if (viewData && cameraControlRef.current) {
      const settings = viewData.settings;

      // Set flag to prevent saving during view application
      isApplyingViewChange.current = true;

      setUseOrthographic(!!settings.useOrthographicCamera);

      if (settings.constraints) {
        setCameraConstraints(settings.constraints);
      } else {
        setCameraConstraints({});
      }
      setTimeout(() => {
        if (cameraControlRef.current && currentViewId === viewId) {
          cameraControlRef.current.setLookAt(
            settings.position[0],
            settings.position[1],
            settings.position[2],
            settings.target[0],
            settings.target[1],
            settings.target[2],
            false
          );
        }
      }, 1);

      // Apply constraints
      if (settings.constraints) {
        if (settings.constraints.azimuthRotateSpeed !== undefined)
          cameraControlRef.current.azimuthRotateSpeed =
            settings.constraints.azimuthRotateSpeed;
        if (settings.constraints.polarRotateSpeed !== undefined)
          cameraControlRef.current.polarRotateSpeed =
            settings.constraints.polarRotateSpeed;
        if (settings.constraints.truckSpeed !== undefined)
          cameraControlRef.current.truckSpeed = settings.constraints.truckSpeed;
        if (settings.constraints.dollySpeed !== undefined)
          cameraControlRef.current.dollySpeed = settings.constraints.dollySpeed;
        if (settings.constraints.draggingSmoothTime !== undefined)
          cameraControlRef.current.draggingSmoothTime =
            settings.constraints.draggingSmoothTime;
        if (settings.constraints.smoothTime !== undefined)
          cameraControlRef.current.smoothTime = settings.constraints.smoothTime;
      }

      // Update local state to match
      setCameraPosition(settings.position);
      setCameraTarget(settings.target);
      setCameraUp(settings.up);

      // Reset flag after a short delay to allow the camera to settle
      setTimeout(() => {
        isApplyingViewChange.current = false;
      }, 150);
    }
  }, [currentViewId, views]);
  //#endregion

  // Camera update handler
  const handleCameraUpdate = useCallback(() => {
    if (!cameraControlRef.current || isApplyingViewChange.current) {
      return;
    }

    const position = new THREE.Vector3();
    const target = new THREE.Vector3();

    cameraControlRef.current.getPosition(position);
    cameraControlRef.current.getTarget(target);
    // Update local state
    setCameraPosition([position.x, position.y, position.z]);
    setCameraTarget([target.x, target.y, target.z]);
    setCameraUp([
      cameraControlRef.current.camera.up.x,
      cameraControlRef.current.camera.up.y,
      cameraControlRef.current.camera.up.z,
    ]);

    // Save the camera state (debounced)
    saveCameraState();
  }, [saveCameraState]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (saveStateTimer.current) {
        clearTimeout(saveStateTimer.current);
      }
    };
  }, []);

  //#region Canvas Style
  const toHexString = (color: number): string => {
    const fallback = "#ffffff";
    if (Number.isNaN(color) || !Number.isFinite(color)) return fallback;
    return "#" + color.toString(16);
  };

  const containerStyles: React.CSSProperties = useMemo(() => {
    return {
      position: "relative",
      display: "flex",
      flexDirection: "column",
      margin: "10px",
      overflow: "hidden",
      flex: 1,
      backgroundColor: toHexString(Attributes.Viewer.BackgroundColor),
      ...style,
    };
  }, [style, Attributes.Viewer.BackgroundColor]);

  const angle = (3 * Math.PI) / 4;
  //#endregion

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
          onUpdate={handleCameraUpdate}
        />
        {Attributes.Viewer.GridHelper && (
          <gridHelper
            args={[20, 20, "#888888", "#444444"]}
            raycast={() => {}}
          />
        )}
      </Canvas>
    </div>
  );
}

export { Viewer };
