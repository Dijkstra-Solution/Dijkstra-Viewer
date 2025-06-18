import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Events, ViewType } from "../viewerapi/Events";
import { ClientBase } from "@/client/ClientBase";
import { View } from "../viewerapi/View";
import { useViewer } from "./hooks/useViewer";

interface ViewerProps {
  client: ClientBase;
  initialView?: ViewType | (() => void);
  style?: React.CSSProperties; // Stílusok a container elemhez
  className?: string;         // CSS osztály a container elemhez
}

function Viewer({ 
  initialView = 'perspective',
  style = {}
}: ViewerProps) {
  
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>();
  const cameraControlRef = useRef<CameraControls | null>(null);
  const { on, off, fire } = useViewer();

  const three = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    raycaster: THREE.Raycaster;
    size: { width: number; height: number };
  }>(null);

  const handleClick = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const ctx = three.current;
      if (!ctx) {
        console.log("No context! :(");
        return;
      }
      const { scene, camera, raycaster, size } = ctx;
      const mouse = new THREE.Vector2();

      mouse.x = (event.clientX / size.width) * 2 - 1;
      mouse.y = -(event.clientY / size.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children);
      console.log(intersects);
      if (intersects.length > 0) {
        const guid = intersects[0].object.userData.guid ?? "jej";
        fire(Events.EntitySelected, { guid });
      }

      const pointOnPlane = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3()
      );

      if (pointOnPlane) {
        fire(Events.SceneClicked, { point: pointOnPlane });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    const regen = (payload: { geometry: THREE.BufferGeometry }) => {
      setGeometry(payload.geometry);
    };

    on(Events.SceneUpdated, regen);
    return () => off(Events.SceneUpdated, regen);
  }, );

  // Setup camera controls monitoring
  useEffect(() => {
    // Try to setup camera controls when available
    const checkInterval = setInterval(() => {
      if (cameraControlRef.current) {
        console.log("Camera controls reference set successfully");
        View.setCameraControlsRef(cameraControlRef);
        
        // Set initial view once camera controls are available
        if (initialView) {
          if (typeof initialView === 'function') {
            // Function feature direct call
            console.log('Setting initial view from function');
            initialView();
          } else {
            // String feature with View.setView
            console.log(`Setting initial view to: ${initialView}`);
            View.setView(initialView);
          }
        }
        
        clearInterval(checkInterval);
      }
    },100); // Check every 100ms
    
    // Cleanup interval when component unmounts
    return () => clearInterval(checkInterval);
  }, [initialView]);

  // Container stílus a felhasználói stílus és az alapértelmezett értékek kombinálásával
  const containerStyles: React.CSSProperties = {
    ...style,
    position: 'relative',
    margin:'10px',
    flex:1
  };
  return (
    <div style={containerStyles}>
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
        <CameraControls ref={cameraControlRef} />
        <gridHelper raycast={() => {}} />
        <scene>
          <mesh ref={meshRef} geometry={geometry ?? undefined} />
          {/* <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshNormalMaterial />
          </mesh> */}
        </scene>
      </Canvas>
    </div>
  );
}

export { Viewer };
