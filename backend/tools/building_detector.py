"""
Real object counting tool using YOLOv8n on CPU.
Computes real object detections from actual image pixels.
"""

from pathlib import Path
from typing import Dict, Any, List
import logging

logger = logging.getLogger("satquery.tools.building_detector")

_YOLO_MODEL = None


def get_detector_model():
    global _YOLO_MODEL
    if _YOLO_MODEL is None:
        try:
            from ultralytics import YOLO
            # Lazy-load YOLOv8n (~6MB), caching locally
            logger.info("[SatQuery Tools] Loading YOLOv8n detector on CPU...")
            _YOLO_MODEL = YOLO("yolov8n.pt")
        except Exception as e:
            logger.error(f"[SatQuery Tools] Failed to initialize YOLOv8n: {e}")
            raise e
    return _YOLO_MODEL


def detect(image_path: str, conf: float = 0.25) -> Dict[str, Any]:
    """
    Run object detection on the given image using YOLOv8n on CPU.
    Returns detected object counts and bounding boxes.
    """
    path_obj = Path(image_path)
    if not path_obj.exists():
        return {
            "tool": "building_detector",
            "status": "error",
            "reason": f"Image file not found: {image_path}",
            "total_detections": 0,
            "class_counts": {},
            "bounding_boxes": [],
            "caveat": "File does not exist.",
        }

    try:
        model = get_detector_model()
        # Force CPU device to strictly obey 6GB VRAM budget
        results = model.predict(source=str(path_obj), device="cpu", conf=conf, verbose=False)

        boxes_out: List[Dict[str, Any]] = []
        class_counts: Dict[str, int] = {}

        if results and len(results) > 0:
            r = results[0]
            names = r.names or {}
            for box in r.boxes:
                cls_id = int(box.cls[0].item())
                cls_name = names.get(cls_id, str(cls_id))
                confidence = float(box.conf[0].item())
                xyxy = [round(float(coord), 1) for coord in box.xyxy[0].tolist()]

                class_counts[cls_name] = class_counts.get(cls_name, 0) + 1
                boxes_out.append({
                    "class": cls_name,
                    "confidence": round(confidence, 3),
                    "bbox": xyxy
                })

        total = len(boxes_out)
        return {
            "tool": "building_detector",
            "status": "success",
            "method": "yolov8n_cpu",
            "detector_type": "general_coco_pretrained",
            "total_detections": total,
            "class_counts": class_counts,
            "bounding_boxes": boxes_out,
            "caveat": "This is a general object detector, not a remote-sensing-specific building detector. Counts may not match domain-specific ground truth.",
        }

    except Exception as e:
        logger.exception("Error executing YOLOv8n detection")
        return {
            "tool": "building_detector",
            "status": "unavailable",
            "reason": f"YOLOv8n model could not be loaded or executed: {str(e)}",
            "total_detections": 0,
            "class_counts": {},
            "bounding_boxes": [],
            "caveat": "Detection unavailable.",
        }
