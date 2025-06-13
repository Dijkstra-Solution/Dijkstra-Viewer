import { Canvas } from "@react-three/fiber";
import { CameraControls } from "@react-three/drei";
import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { ViewerAPI } from "../viewerapi/ViewerAPI";
import { Events } from "../viewerapi/Events";

function Viewer({ api: ViewerAPI }: { api: ViewerAPI }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [geometry, setGeometry] = useState<THREE.BufferGeometry>();
  const cameraControlRef = useRef<CameraControls | null>(null);

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
        ViewerAPI.fire(Events.EntitySelected, { guid });
      }

      const pointOnPlane = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3()
      );

      if (pointOnPlane) {
        ViewerAPI.fire(Events.SceneClicked, { point: pointOnPlane });
      }
    },
    []
  );

  useEffect(() => {
    const regen = (payload: { geometry: THREE.BufferGeometry }) => {
      setGeometry(payload.geometry);
    };

    ViewerAPI.on(Events.SceneUpdated, regen);
    return () => ViewerAPI.off(Events.SceneUpdated, regen);
  }, [ViewerAPI]);

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

export default Viewer;
