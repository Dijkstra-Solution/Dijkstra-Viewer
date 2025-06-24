import { Canvas } from "@react-three/fiber";
import { CameraControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
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

interface ViewerProps {
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

  const cameraControlRef = useRef<CameraControls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [hoveredGUID, setHoveredGUID] = useState<string | null>(null);
  const outlineSegments = useMemo<THREE.LineSegments | null>(() => {
    if (!hoveredGUID || !mergedGeometry) return null;

    const positionAttribute = mergedGeometry.attributes.position;
    const indexArray = mergedGeometry.index;
    const faceMap: Record<number, string> = mergedGeometry.userData.faceMap;
    if (!indexArray || !positionAttribute) return null;

    const edgeGeometryIndices: number[] = [];

    for (let i = 0; i < indexArray.count / 3; i++) {
      if (faceMap[i] === hoveredGUID) {
        edgeGeometryIndices.push(
          indexArray.array[i * 3],
          indexArray.array[i * 3 + 1],
          indexArray.array[i * 3 + 2]
        );
      }
    }
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute("position", positionAttribute);
    edgeGeometry.setIndex(edgeGeometryIndices);
    edgeGeometry.computeVertexNormals();

    const edges = new THREE.EdgesGeometry(edgeGeometry);
    const lineSegmentsMaterial = new THREE.LineBasicMaterial({
      color: "yellow",
      linewidth: 2,
    });

    const lineSegments = new THREE.LineSegments(edges, lineSegmentsMaterial);
    lineSegments.layers.set(1);
    return lineSegments;
  }, [hoveredGUID, mergedGeometry]);

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

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      vertexColors: true,
    });
  }, []);

  //#region Event Handler Registration on Mount
  useEffect(() => {
    Object.entries(eventHandlers ?? {}).forEach(([event, handler]) => {
      on(event as EventType, handler);
    });

    return () => {
      Object.entries(eventHandlers ?? {}).forEach(([event, handler]) => {
        off(event as EventType, handler);
      });
    };
  }, [on, off, eventHandlers]);
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
        if (!ctx) {
          return;
        }
        const { scene, camera, raycaster } = ctx;
        const mouse = getMouse(event);
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

          fire(Events.SceneClicked, {
            guid: guid,
            point: [
              intersects[0].point.x,
              intersects[0].point.y,
              intersects[0].point.z,
            ],
            normal: [
              intersects[0].face?.normal.x ?? 0,
              intersects[0].face?.normal.y ?? 0,
              intersects[0].face?.normal.z ?? 0,
            ],
          });
          return;
        }
        setHoveredGUID(null);
        const pointOnPlane = raycaster.ray.intersectPlane(
          new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
          new THREE.Vector3()
        );

        if (pointOnPlane) {
          fire(Events.SceneClicked, {
            point: [pointOnPlane.x, pointOnPlane.y, pointOnPlane.z],
            normal: [0, 1, 0],
          });
        }
      }
    },
    [getMouse, fire]
  );

  const handleMouseMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const ctx = three.current;
      if (!ctx) {
        return;
      }
      const { camera, raycaster, scene } = ctx;
      const mouse = getMouse(event);
      raycaster.layers.set(0);
      raycaster.firstHitOnly = false;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        if (intersects[0].object instanceof THREE.Mesh) {
          //(intersects[0].object.geometry.userData.faceMap);
          //TODO
        }
        setIntersectionPoint(intersects[0].point);
      } else {
        setIntersectionPoint(null);
      }
    },
    [getMouse]
  );
  //#endregion

  // Handle camera type changes from view settings
  useEffect(() => {
    // Create a custom event handler for the view changed event
    const handleViewChanged = (data: { view: string }) => {
      const settings = views.getView(data.view)!.getViewSettings();
      const saved = views.getSavedCameraState(data.view);
      setUseOrthographic(!!settings.useOrthographicCamera);
      setCameraPosition(saved?.position ?? settings.position);
      setCameraUp      (saved?.up       ?? settings.up);
      setCameraZoom    (saved?.zoom     ?? 12);
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
        if (currentInitialView) {
          if (typeof currentInitialView === "function") {
            // Function feature direct call
            currentInitialView();
          } else {
            // String feature with ViewManager
            actions.SetView(currentInitialView);
          }
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
  }, [useOrthographic,views]);
  
  // Container stílus a felhasználói stílus és az alapértelmezett értékek kombinálásával
  const containerStyles: React.CSSProperties = {
    position: "relative",
    margin: "10px",
    flex: 1,
    ...style,
  };

  // Új useEffect a cameraTarget változásához
  useEffect(() => {
    if (cameraControlRef.current) {
      cameraControlRef.current.setTarget(cameraTarget[0], cameraTarget[1], cameraTarget[2], true);
      console.log(`CameraControls target beállítva: ${cameraTarget}`);
    }
  }, [cameraTarget, cameraControlRef]);

  useEffect(() => {
    if(useOrthographic){
      console.log(`Expected cameraPosition: ${cameraPosition}`);
      console.log(`Expected cameraUp: ${cameraUp}`);
      console.log(`Expected cameraTarget: ${cameraTarget}`);
      
      // Give the camera time to actually move to the new position before logging
      const timeoutId = setTimeout(() => {
        if (cameraControlRef.current) {
          console.log(`Camera ID: ${cameraControlRef.current.camera.id}`);
          console.log(`Actual camera position: ${cameraControlRef.current.camera.position.x},${cameraControlRef.current.camera.position.y},${cameraControlRef.current.camera.position.z}`);
          console.log(cameraControlRef.current.getTarget(new THREE.Vector3()));
        }
      }, 300); // Add a small delay to allow camera movement to complete
      
      return () => clearTimeout(timeoutId);
    }
  }, [useOrthographic, cameraPosition, cameraUp, cameraControlRef]);

  return (
    <div style={containerStyles} ref={containerRef}>
      <Canvas
      //TODO - initial view setup
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
        {/* <scene> */}
        <mesh geometry={mergedGeometry} material={material}></mesh>
        {outlineSegments && <primitive object={outlineSegments} />}

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
        {/* </scene> */}

        {/*TODO Switch flash */}
        {/* Conditional camera rendering based on useOrthographic state */}
        <OrthographicCamera 
          makeDefault = {useOrthographic}
          position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
          up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
          zoom={cameraZoom}
          near={0.1}
          far={1000}
          
        />
        <PerspectiveCamera 
          makeDefault = {!useOrthographic}
          position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
          up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
          fov={75}
          near={0.1}
          far={1000}
        />
        <CameraControls 
          ref={cameraControlRef}
          azimuthRotateSpeed={cameraConstraints.azimuthRotateSpeed !== undefined ? cameraConstraints.azimuthRotateSpeed : 1.0}
          polarRotateSpeed={cameraConstraints.polarRotateSpeed !== undefined ? cameraConstraints.polarRotateSpeed : 1.0} 
          truckSpeed={cameraConstraints.truckSpeed !== undefined ? cameraConstraints.truckSpeed : 1.0}
          dollySpeed={cameraConstraints.dollySpeed !== undefined ? cameraConstraints.dollySpeed : 1.0}
          draggingSmoothTime={cameraConstraints.draggingSmoothTime !== undefined ? cameraConstraints.draggingSmoothTime : 0}
          smoothTime={cameraConstraints.smoothTime !== undefined ? cameraConstraints.smoothTime : 0}
        />
        <gridHelper 
          args={[20, 20, '#888888', '#444444']}
          raycast={() => {}}
        />
      </Canvas>
    </div>
  );
}

export { Viewer };
