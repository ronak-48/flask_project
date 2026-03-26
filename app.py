from flask import Flask, render_template, request
import os
import time
from datetime import datetime
from ultralytics import YOLO
import cv2

app = Flask(__name__)

# Upload folder
UPLOAD_FOLDER = 'static/uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load YOLO model — prefer custom 50_epoch_best.pt, fallback to yolov8n.pt
MODEL_PATH = "models/50_epoch_best.pt"
if not os.path.exists(MODEL_PATH):
    MODEL_PATH = "yolov8n.pt"
model = YOLO(MODEL_PATH)

# Load base COCO model for Person detection
model_person = YOLO("yolov8n.pt")


# Custom class name mapping to fix misaligned training data labels
CUSTOM_CLASS_NAMES = {
    0: 'Car',
    1: 'number_plate',       # Model labels this 'two_wheeler', but it detects plates
    2: 'blur_number_plate',
    3: 'Two Wheeler',        # Model labels this 'auto', but it detects bikes
    4: 'Auto',               # Assuming 4 is actually auto
    5: 'Bus',
    6: 'Truck'
}

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/upload", methods=["POST"])
def upload():
    file = request.files.get('file')
    if not file or file.filename == '':
        return render_template("index.html")

    # Read confidence threshold from form (default 25%)
    confidence = int(request.form.get('confidence', 25)) / 100.0

    # Save uploaded image
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)

    # Run YOLO detections with timing
    start_time = time.time()
    # 1. Custom model for vehicles
    results_vehicles = model(filepath, conf=confidence)
    # 2. Base model specifically for class 0 (Person)
    results_people = model_person(filepath, conf=confidence, classes=[0])
    inference_time = round((time.time() - start_time) * 1000, 1)  # ms

    # Read image for drawing
    img = cv2.imread(filepath)

    # Collect per-object detection details
    detections = []
    class_counts = {}

    # Color palette for different classes
    colors = [
        (59, 130, 246),   # blue
        (6, 182, 212),    # cyan
        (16, 185, 129),   # emerald
        (245, 158, 11),   # amber
        (244, 63, 94),    # rose
        (139, 92, 246),   # violet
        (236, 72, 153),   # pink
        (14, 165, 233),   # sky
    ]

    # Process both models' results
    models_to_process = [
        (results_vehicles, model.names, CUSTOM_CLASS_NAMES),
        (results_people, model_person.names, None)
    ]

    for res_list, names_dict, custom_names in models_to_process:
        for r in res_list:
            for box, cls, conf in zip(r.boxes.xyxy, r.boxes.cls, r.boxes.conf):
                if custom_names:
                    label = custom_names.get(int(cls), names_dict[int(cls)])
                    color_idx = int(cls) % len(colors)
                else:
                    label = names_dict[int(cls)].capitalize()  # 'Person' instead of 'person'
                    color_idx = 7  # Force sky blue color for Person so it doesn't match Car (0)
                
                # Skip number plate detections
                if label in ['number_plate', 'blur_number_plate']:
                    continue
                    
                x1, y1, x2, y2 = map(int, box)
                conf_val = float(conf)

                # Track class counts
                class_counts[label] = class_counts.get(label, 0) + 1

                # Pick color
                color_bgr = colors[color_idx]

                detections.append({
                    'label': label,
                    'confidence': round(conf_val, 4),
                    'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2,
                })

                # Draw bounding box with thicker lines
                cv2.rectangle(img, (x1, y1), (x2, y2), color_bgr, 2)

                # Draw label background
                text = f"{label} {conf_val:.0%}"
                (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
                cv2.rectangle(img, (x1, y1 - th - 10), (x1 + tw + 8, y1), color_bgr, -1)
                cv2.putText(img, text, (x1 + 4, y1 - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)


    # Save annotated image
    output_filename = "result_" + file.filename
    output_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
    cv2.imwrite(output_path, img)

    # Sort class_counts descending
    class_counts = dict(sorted(class_counts.items(), key=lambda x: x[1], reverse=True))

    # Sort detections by confidence descending
    detections.sort(key=lambda d: d['confidence'], reverse=True)

    total_count = len(detections)
    unique_classes = len(class_counts)
    avg_confidence = round(
        sum(d['confidence'] for d in detections) / total_count * 100, 1
    ) if total_count > 0 else 0

    timestamp = datetime.now().strftime("%Y-%m-%d  %H:%M:%S")

    if total_count == 0:
        return render_template("index.html", show_no_results=True)

    return render_template(
        "index.html",
        filename=output_filename,
        detections=detections,
        class_counts=class_counts,
        total_count=total_count,
        unique_classes=unique_classes,
        avg_confidence=avg_confidence,
        inference_time=inference_time,
        timestamp=timestamp,
    )


if __name__ == "__main__":
    app.run(debug=True)