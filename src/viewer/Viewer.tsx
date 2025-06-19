import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Events, EventType, ViewType } from "../viewerapi/Events";
import { useViewer } from "./hooks/useViewer";
import { EventHandlerMap } from "./EventHandlerMap";

interface ViewerProps {
  eventHandlers?: EventHandlerMap;
  initialView?: ViewType | (() => void);
  style?: React.CSSProperties; // Stílusok a container elemhez
  className?: string; // CSS osztály a container elemhez
}

function Viewer({
  eventHandlers,
  initialView = "perspective",
  style,
}: ViewerProps) {
  const { on, off, fire, mergedGeometry, viewManager } = useViewer();

  //#region Intersection Handling
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

  const cameraControlRef = useRef<CameraControls | null>(null);

  const three = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    size: { width: number; height: number };
  }>(null);

  const handleClick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button == 0) {
        const ctx = three.current;
        if (!ctx) {
          return;
        }
        const { scene, camera, raycaster, size } = ctx;
        const mouse = new THREE.Vector2(
          (event.clientX / size.width) * 2 - 1,
          -(event.clientY / size.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
          fire(Events.SceneClicked, {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleMouseMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const ctx = three.current;
      if (!ctx) {
        return;
      }
      const { camera, raycaster, scene, size } = ctx;
      const mouse = new THREE.Vector2(
        (event.clientX / size.width) * 2 - 1,
        -(event.clientY / size.height) * 2 + 1
      );

      raycaster.layers.set(0);
      raycaster.firstHitOnly = false;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        setIntersectionPoint(intersects[0].point);
      } else {
        setIntersectionPoint(null);
      }
    },
    []
  );

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

  // Container stílus a felhasználói stílus és az alapértelmezett értékek kombinálásával

  const containerStyles: React.CSSProperties = {
    position: "relative",
    margin: "10px",
    flex: 1,
    ...style,
  };

  return (
    <div style={containerStyles}>
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={({ scene, camera, raycaster, size }) => {
          camera.layers.enableAll();
          three.current = {
            scene,
            camera: camera as THREE.PerspectiveCamera,
            raycaster,
            size,
          };
        }}
        onPointerUp={handleClick}
        onMouseMove={handleMouseMove}
      >
        <scene>
          <mesh geometry={mergedGeometry} material={material}></mesh>
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
        </scene>

        <CameraControls ref={cameraControlRef} />
        <gridHelper args={[20, 20, "#888888", "#444444"]} raycast={() => {}} />
      </Canvas>
    </div>
  );
}

export { Viewer };
