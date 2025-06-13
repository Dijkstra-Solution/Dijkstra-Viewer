/* eslint-disable @typescript-eslint/no-explicit-any */
import * as THREE from "three";
import { Events, type EventPayloads, type EventType } from "./Events";
import { BufferGeometryUtils } from "three/examples/jsm/Addons.js";
import type { AEntity } from "./AEntity";
import { Polygon } from "./Polygon";

type EventCallback<T> = (payload: T) => void;

export class ViewerAPI {
  #innerEntities: Map<string, AEntity> = new Map(); //TODO
  #geometry: THREE.BufferGeometry = new THREE.BufferGeometry();

  //#region Events
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  protected listeners = new Map<EventType, Set<Function>>();
  on<T extends EventType>(event: T, callback: EventCallback<EventPayloads[T]>) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  off<T extends EventType>(
    event: T,
    callback: EventCallback<EventPayloads[T]>
  ) {
    this.listeners.get(event)?.delete(callback);
  }

  /** @internal */ //TODO - set flag somewhere
  fire<T extends EventType>(event: T, payload: EventPayloads[T]) {
    this.listeners
      .get(event)
      ?.forEach((cb) => (cb as EventCallback<any>)(payload));
  }
  //#endregion

  displayParameters(guid: string, parameters: Record<string, any>) {
    console.log("Displaying parameters for", guid, parameters);
    // Could be hooked into your real parameter UI
  }

  Actions = {
    Selection: {
      PickPoints: (count: number): Promise<THREE.Vector3[]> => {
        return new Promise((resolve, reject) => {
          const points: THREE.Vector3[] = [];

          const onClick = (payload: { point: THREE.Vector3 }) => {
            points.push(payload.point.clone());
            this.fire(Events.StatusMessage, {
              message: `Pick Point ${
                points.length + 1
              }/${count} (Esc to cancel)`,
            });

            if (points.length >= count) {
              cleanup();
              resolve(points);
            }
          };

          const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
              cleanup();
              reject("Action Cancelled!");
            }
          };

          const cleanup = () => {
            this.off(Events.SceneClicked, onClick);
            this.fire(Events.StatusMessage, { message: "" });
            window.removeEventListener("keydown", onKey);
          };

          this.on(Events.SceneClicked, onClick);
          window.addEventListener("keydown", onKey);

          this.fire(Events.StatusMessage, {
            message: `Pick Point ${points.length + 1}/${count} (Esc to cancel)`,
          });
        });
      },
    },
  };

  AddEntities(json: string) {
    const object = JSON.parse(json);
    if (object.children) {
      for (const child of object.children) {
        child.parent = object.guid;
        this.#innerEntities.set(child.guid, child);

        const geometry = new THREE.BufferGeometry();
        const arr = [];
        for (let i = 0; i < child.vertices.length - 3; i += 3) {
          arr.push(child.vertices[0], child.vertices[1], child.vertices[2]);
          arr.push(
            child.vertices[i],
            child.vertices[i + 1],
            child.vertices[i + 2]
          );
          arr.push(
            child.vertices[i + 3],
            child.vertices[i + 4],
            child.vertices[i + 5]
          );
        }

        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(arr, 3)
        );
        const polygon = new Polygon(child.guid);
        polygon.Geometry = geometry;
        this.#innerEntities.set(child.guid, polygon);
      }
    }
    const geometries: THREE.BufferGeometry[] = [];
    this.#innerEntities.forEach((entity) => {
      if (entity instanceof Polygon && entity.Geometry)
        geometries.push(entity.Geometry);
    });
    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    this.#geometry = merged;
    this.fire(Events.SceneUpdated, { geometry: this.#geometry });
    //TODO - calculate new geometry
    //TODO - add to entities
  }

  // #regenMesh() {
  //   //TODO - iterate over entities and create new geometry
  //   this.fire(FrameworkEvents.SceneUpdated, { geometry: this.#geometry });
  // }
}
