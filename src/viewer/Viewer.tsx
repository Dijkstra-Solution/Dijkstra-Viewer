import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { useCallback, useEffect, useRef } from "react";
import * as THREE from "three";
import { Events, EventType, ViewType } from "../viewerapi/Events";
import { useViewer } from "./hooks/useViewer";
import { EventHandlerMap } from "./EventHandlerMap";

interface ViewerProps {
  eventHandlers?: EventHandlerMap;
  initialView?: ViewType | (() => void);
}

function Viewer({ eventHandlers, initialView = "perspective" }: ViewerProps) {
  const { on, off, fire, actions, mergedGeometry } = useViewer();

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

  // const ViewerAPI = client.ViewerAPI;
  const cameraControlRef = useRef<CameraControls | null>(null);

  const three = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    size: { width: number; height: number };
  }>(null);

  const handleClick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      console.log("click");
      const ctx = three.current;
      if (!ctx) {
        return;
      }
      const { scene, camera, raycaster, size } = ctx;
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / size.width) * 2 - 1;
      mouse.y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      if (intersects.length > 0) {
        const guid = intersects[0].object.userData.guid ?? "jej";
        console.log("Event fired");
        fire(Events.EntitySelected, { guid });
        // ViewerAPI.fire(Events.EntitySelected, { guid });
      }

      const pointOnPlane = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3()
      );

      if (pointOnPlane) {
        fire(Events.SceneClicked, {
          point: [pointOnPlane.x, pointOnPlane.y, pointOnPlane.z],
        });
        // ViewerAPI.fire(Events.SceneClicked, { point: pointOnPlane });
      }
    },
    []
  );

  // useEffect(() => {
  //   const regen = (payload: { geometry: THREE.BufferGeometry }) => {
  //     setGeometry(payload.geometry);
  //   };

  //   ViewerAPI.on(Events.SceneUpdated, regen);
  //   return () => ViewerAPI.off(Events.SceneUpdated, regen);
  // }, [ViewerAPI]);

  // // Init View Module with ViewerApi
  // useEffect(() => {
  //   View.initialize(ViewerAPI);
  // }, [ViewerAPI]);

  // // Setup camera controls monitoring
  // useEffect(() => {
  //   // Try to setup camera controls when available
  //   const checkInterval = setInterval(() => {
  //     if (cameraControlRef.current) {
  //       console.log("Camera controls reference set successfully");
  //       View.setCameraControlsRef(cameraControlRef);

  //       // Set initial view once camera controls are available
  //       if (initialView) {
  //         if (typeof initialView === 'function') {
  //           // Function feature direct call
  //           console.log('Setting initial view from function');
  //           initialView();
  //         } else {
  //           // String feature with View.setView
  //           console.log(`Setting initial view to: ${initialView}`);
  //           View.setView(initialView);
  //         }
  //       }

  //       clearInterval(checkInterval);
  //     }
  //   }, 100); // Check every 100ms

  //   // Cleanup interval when component unmounts
  //   return () => clearInterval(checkInterval);
  // }, [initialView]);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      {/* TODO - make canvas stretch to fill available space */}
      <Canvas
        camera={{ position: [0, 0, 5] }}
        onCreated={({ scene, camera, raycaster, size }) => {
          three.current = {
            scene,
            camera: camera as THREE.PerspectiveCamera,
            raycaster,
            size,
          };
        }}
        onPointerUp={handleClick}
      >
        <mesh geometry={mergedGeometry}>
          <meshStandardMaterial />
        </mesh>

        <CameraControls ref={cameraControlRef} />
        <gridHelper raycast={() => {}} />
      </Canvas>
    </div>
  );
}

export { Viewer };
