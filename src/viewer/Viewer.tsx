import { Canvas } from "@react-three/fiber";
import { CameraControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const [cameraConstraints, setCameraConstraints] = useState<{
    azimuthRotateSpeed?: number;
    polarRotateSpeed?: number;
    truckSpeed?: number;
    dollySpeed?: number;
    draggingSmoothTime?: number;
    smoothTime?: number;
  }>({}); 
  
  const { on, off, fire, mergedGeometry, views, actions } = useViewer();

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
        const mouse = new THREE.Vector2();

        mouse.x = (event.clientX / size.width) * 2 - 1;
        mouse.y = -(event.clientY / size.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(scene.children);
        if (intersects.length > 0) {
          // const guid = intersects[0].object.userData.guid ?? "jej";
          console.log(intersects[0]);
          fire(Events.SceneClicked, {
            point: [
              intersects[0].point.x,
              intersects[0].point.y,
              intersects[0].point.z,
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
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / size.width) * 2 - 1;
      mouse.y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      // console.log(intersects);
    },
    []
  );

  // Handle camera type changes from view settings
  useEffect(() => {
    // Create a custom event handler for the view changed event
    const handleViewChanged = (data: { view: string }) => {
      const currentView = views.getView(data.view);
      if (currentView) {
        const settings = currentView.getViewSettings();

        setUseOrthographic(!!settings.useOrthographicCamera);
        
        if (Array.isArray(settings.position) && settings.position.length >= 3) {
          setCameraPosition(settings.position);
        }
        
        if (Array.isArray(settings.up) && settings.up.length >= 3) {
          setCameraUp(settings.up);
        }

        if (settings.constraints) {
          setCameraConstraints(settings.constraints);
        } else {
          setCameraConstraints({});
        }
      }
    };

    // Register for the ViewChanged event
    on("ViewChanged", handleViewChanged);

    return () => {
      // Cleanup event listener
      off("ViewChanged", handleViewChanged);
    };
  }, [on, off, views]);

  
  // Setup camera controls monitoring - only runs once on mount
  useEffect(() => {
    // Store the references to avoid closure issues
    const currentViews = views;
    const currentActions = actions;
    const currentInitialView = initialView;
    
    // Try to setup camera controls when available
    const checkInterval = setInterval(() => {
      if (cameraControlRef.current) {
        // Set camera controls reference to the ViewManager
        currentViews.setCameraControlsRef(cameraControlRef);

        // Set initial view once camera controls are available
        if (currentInitialView) {
          if (typeof currentInitialView === "function") {
            // Function feature direct call
            currentInitialView();
          } else {
            // String feature with ViewManager
            currentActions.SetView(currentInitialView);
            console.log("set initial view - should only happen once");
            // ViewManager handles the event firing internally
          }
        }
        
        clearInterval(checkInterval);
      }
    }, 100); // Check every 100ms

    // Cleanup interval when component unmounts
    return () => clearInterval(checkInterval);
  }, []);

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
        onCreated={({ scene, raycaster, size, camera }) => {
          three.current = {
            scene,
            camera: camera as THREE.PerspectiveCamera, // Will be replaced
            raycaster,
            size,
          };
        }}
        onPointerUp={handleClick}
        onMouseMove={handleMouseMove}
      >
        <scene>
          <mesh geometry={mergedGeometry} material={material}></mesh>
        </scene>

        {/* Conditional camera rendering based on useOrthographic state */}
        {useOrthographic ? (
          <OrthographicCamera 
            makeDefault 
            position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
            up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
            zoom={12}
            near={0.1}
            far={1000}

          />
        ) : (
          <PerspectiveCamera 
            makeDefault 
            position={[cameraPosition[0], cameraPosition[1], cameraPosition[2]]}
            up={[cameraUp[0], cameraUp[1], cameraUp[2]]}
            fov={75}
            near={0.1}
            far={1000}
          />
        )}
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
