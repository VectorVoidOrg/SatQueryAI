import L from "leaflet";

/**
 * Patch Leaflet's Map container initialization to be 100% resilient to React 18/19 StrictMode,
 * Next.js Fast Refresh, and dynamic client-side route navigation.
 *
 * In React 19 development mode (Strict Mode), React executes an intentional mount -> unmount -> remount
 * cycle. In this cycle, react-leaflet's ref callback initializes a Leaflet map on the DOM container,
 * but react-leaflet's cleanup useEffect runs before context is committed, leaving `container._leaflet_id`
 * attached to the DOM node. When the remount runs, Leaflet's `_initContainer` checks `container._leaflet_id`
 * and throws: "Error: Map container is already initialized."
 *
 * This patch intercepts `_initContainer`:
 * If `container._leaflet_id` already exists, it safely removes the previous map instance,
 * deletes `_leaflet_id`, clears any orphaned child elements, and allows initialization to proceed cleanly.
 */
export function applyLeafletContainerPatch() {
  if (typeof window === "undefined" || !L || !(L as any).Map) return;

  const MapProto = (L as any).Map.prototype;
  if (MapProto.__containerPatchApplied) return;
  MapProto.__containerPatchApplied = true;

  const originalInitContainer = MapProto._initContainer;
  MapProto._initContainer = function (id: any) {
    const container = typeof id === "string" ? document.getElementById(id) : id;
    if (container && (container as any)._leaflet_id) {
      try {
        if ((container as any)._leaflet_map) {
          (container as any)._leaflet_map.remove();
        }
      } catch {
        // Stale map cleanup fallback
      }
      delete (container as any)._leaflet_id;
      container.innerHTML = "";
    }

    originalInitContainer.call(this, id);

    if (container) {
      (container as any)._leaflet_map = this;
    }
  };

  const originalRemove = MapProto.remove;
  MapProto.remove = function () {
    if (this._container) {
      delete (this._container as any)._leaflet_map;
      delete (this._container as any)._leaflet_id;
    }
    return originalRemove.call(this);
  };
}
