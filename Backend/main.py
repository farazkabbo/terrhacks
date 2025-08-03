from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import base64
from io import BytesIO
from PIL import Image
import cv2
import numpy as np
import json
from datetime import datetime
import os
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import math

app = FastAPI()

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize MediaPipe pose detector
base_options = python.BaseOptions(model_asset_path='Gait Detection/pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True,
    running_mode=mp.tasks.vision.RunningMode.VIDEO)
detector = vision.PoseLandmarker.create_from_options(options)

# Global variables for gait analysis
frame_count = 0
swingLens = []
strideLens = []
processing_queue = 0

def draw_landmarks_on_image(rgb_image, detection_result):
    """Draw pose landmarks on image"""
    pose_landmarks_list = detection_result.pose_landmarks
    annotated_image = np.copy(rgb_image)

    # Loop through the detected poses to visualize.
    for idx in range(len(pose_landmarks_list)):
        pose_landmarks = pose_landmarks_list[idx]

        # Draw the pose landmarks.
        pose_landmarks_proto = landmark_pb2.NormalizedLandmarkList()
        pose_landmarks_proto.landmark.extend([
            landmark_pb2.NormalizedLandmark(x=landmark.x, y=landmark.y, z=landmark.z) for landmark in pose_landmarks
        ])
        solutions.drawing_utils.draw_landmarks(
            annotated_image,
            pose_landmarks_proto,
            solutions.pose.POSE_CONNECTIONS,
            solutions.drawing_styles.get_default_pose_landmarks_style())
    return annotated_image

def calculate_distance(x, y, x1, y1):
    """Calculate Euclidean distance between two points"""
    dx = x1 - x
    dy = y1 - y
    distance = math.sqrt(dx ** 2 + dy ** 2)
    return distance

def getRealCoords(landmark, frame):
    """Convert normalized coordinates to pixel coordinates"""
    height, width, channels = frame.shape
    return int(landmark.x * width), int(landmark.y * height)

from scipy.signal import find_peaks

def getPeakDist(lengths):
    window_size = 10
    smooth = np.convolve(lengths, np.ones(window_size)/window_size, mode='same')
    peaks, properties = find_peaks(smooth,
                                   height=None,  # minimum height of peaks
                                   distance=10,  # minimum distance between peaks
                                   prominence=10)
    peak_distances = np.diff(peaks)
    
    # Calculate average of last 3 peak distances only
    if len(peak_distances) >= 3:
        last_three_distances = peak_distances[-3:]
        average_peak_distance = np.mean(last_three_distances)
    elif len(peak_distances) > 0:
        # If we have fewer than 3 peak distances, use all available
        average_peak_distance = np.mean(peak_distances)
    else:
        # No peak distances found
        average_peak_distance = float('nan')
    
    return average_peak_distance


def process_gait_analysis(frame, detection_result, fast_mode=False):
    """Process gait analysis and return annotated frame with metrics"""
    global frame_count, swingLens, strideLens
    
    landmarks = detection_result.pose_landmarks
    metrics = {}
    
    if len(landmarks) > 0 and len(landmarks[0]) >= 29:  # Ensure we have all required landmarks
        # Foot landmarks for stride analysis
        left_foot_x, left_foot_y = getRealCoords(landmarks[0][27], frame)
        right_foot_x, right_foot_y = getRealCoords(landmarks[0][28], frame)
        stride_length = int(calculate_distance(left_foot_x, left_foot_y, right_foot_x, right_foot_y))

        if right_foot_x > left_foot_x:
            stride_length *= -1

        strideLens.append(stride_length)

        # Draw foot landmarks and stride line
        cv2.circle(frame, center=(left_foot_x, left_foot_y), radius=4, color=(0, 0, 255), thickness=-1)
        cv2.circle(frame, center=(right_foot_x, right_foot_y), radius=4, color=(0, 0, 255), thickness=-1)
        cv2.line(frame, (left_foot_x, left_foot_y), (right_foot_x, right_foot_y), (0, 0, 255), 3)

        # Calculate average stride length (skip heavy computation in fast mode)
        if not fast_mode:
            avgStrideLen = getPeakDist(strideLens)
            stride_text = f"Stride: {int(avgStrideLen) if not math.isnan(avgStrideLen) else 'Analyzing...'}"
        else:
            stride_text = f"Stride: {stride_length}px (fast)"
            avgStrideLen = float('nan')
        
        cv2.putText(frame, stride_text, (30, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

        # Elbow landmarks for swing analysis
        left_elbow_x, left_elbow_y = getRealCoords(landmarks[0][13], frame)
        right_elbow_x, right_elbow_y = getRealCoords(landmarks[0][14], frame)
        swing_length = int(calculate_distance(left_elbow_x, left_elbow_y, right_elbow_x, right_elbow_y))

        if right_elbow_x > left_elbow_x:
            swing_length *= -1

        swingLens.append(swing_length)
        
        # Draw elbow landmarks and swing line
        cv2.circle(frame, center=(left_elbow_x, left_elbow_y), radius=4, color=(255, 0, 0), thickness=-1)
        cv2.circle(frame, center=(right_elbow_x, right_elbow_y), radius=4, color=(255, 0, 0), thickness=-1)
        cv2.line(frame, (left_elbow_x, left_elbow_y), (right_elbow_x, right_elbow_y), (255, 0, 0), 3)

        # Calculate average swing length (skip heavy computation in fast mode)
        if not fast_mode:
            avgSwingLen = getPeakDist(swingLens)
            swing_text = f"Swing: {int(avgSwingLen) if not math.isnan(avgSwingLen) else 'Analyzing...'}"
        else:
            swing_text = f"Swing: {swing_length}px (fast)"
            avgSwingLen = float('nan')
            
        cv2.putText(frame, swing_text, (30, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 0, 0), 2)

        # Store metrics
        metrics = {
            "stride_length": stride_length,
            "swing_length": swing_length,
            "avg_stride": avgStrideLen if not math.isnan(avgStrideLen) else None,
            "avg_swing": avgSwingLen if not math.isnan(avgSwingLen) else None,
            "frame_count": frame_count,
            "fast_mode": fast_mode
        }

    frame_count += 1
    return frame, metrics

@app.get("/")
def read_root():
    return {"message": "Welcome to the FastAPI application!"}

@app.get("/graph/{item_id}")
def read_item(item_id: int):
    return {"message": f"Welcome to the FastAPI application! You requested item {item_id}."}

@app.websocket("/ws/image")
async def websocket_image(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection established")
    
    global frame_count
    fps = 30  # Assume 30 FPS for timestamp calculation
    
    try:
        while True:
            # Receive data from frontend
            data = await websocket.receive_text()
            
            try:
                # Parse JSON data
                message = json.loads(data)
                
                if "image" in message:
                    # Extract base64 image data
                    image_data = message["image"]
                    
                    # Remove data URL prefix if present
                    if "data:image/" in image_data:
                        image_b64 = image_data.split(",")[1]
                        image_format = image_data.split(";")[0].split("/")[1]
                    else:
                        image_b64 = image_data
                        image_format = "jpeg"
                    
                    # Decode base64 to image
                    image_bytes = base64.b64decode(image_b64)
                    image = Image.open(BytesIO(image_bytes))
                    
                    # Convert PIL image to numpy array for OpenCV
                    img_array = np.array(image)
                    
                    # Convert RGB to BGR for OpenCV processing
                    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    else:
                        img_bgr = img_array
                    
                    # Get image dimensions
                    height, width = img_bgr.shape[:2]
                    
                    # Calculate timestamp for MediaPipe
                    timestamp_ms = int((frame_count / fps) * 1000)
                    
                    # Create MediaPipe Image and detect pose landmarks
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
                    
                    # Detect pose landmarks
                    detection_result = detector.detect_for_video(mp_image, timestamp_ms)
                    
                    # Draw landmarks on the image
                    annotated_rgb = draw_landmarks_on_image(mp_image.numpy_view(), detection_result)
                    annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
                    
                    # Process gait analysis and add metrics to frame
                    processed_frame, gait_metrics = process_gait_analysis(annotated_bgr.copy(), detection_result)
                    
                    # Convert processed frame back to base64 with optimized quality
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]  # Reduce quality for faster processing
                    _, buffer = cv2.imencode('.jpg', processed_frame, encode_param)
                    processed_b64 = base64.b64encode(buffer).decode('utf-8')
                    processed_data_url = f"data:image/jpeg;base64,{processed_b64}"
                    
                    print(f"Frame {frame_count} processed: {width}x{height}")
                    
                    # Pair swing and stride data into objects for the last 50 measurements
                    past_metrics_paired = []
                    swing_data = swingLens[-50:]
                    stride_data = strideLens[-50:]
                    min_length = min(len(swing_data), len(stride_data))
                    
                    for i in range(min_length):
                        past_metrics_paired.append({
                            "swing_length": swing_data[i],
                            "stride_length": stride_data[i]
                        })

                    # Send processed image and metrics back to frontend
                    response = {
                        "status": "success",
                        "message": "Frame processed with gait analysis",
                        "processed_image": processed_data_url,
                        "dimensions": {"width": width, "height": height},
                        "gait_metrics": gait_metrics,
                        "past_metrics": past_metrics_paired,
                        "frame_count": frame_count
                    }
                    
                    await websocket.send_text(json.dumps(response))
                
                else:
                    # Handle other message types
                    print(f"Received message: {message}")
                    await websocket.send_text(json.dumps({
                        "status": "received",
                        "message": "Message received but no image found"
                    }))
                    
            except json.JSONDecodeError:
                # Handle direct base64 string (fallback)
                if "data:image/" in data:
                    image_b64 = data.split(",")[1]
                else:
                    image_b64 = data
                
                try:
                    image_bytes = base64.b64decode(image_b64)
                    image = Image.open(BytesIO(image_bytes))
                    img_array = np.array(image)
                    
                    if len(img_array.shape) == 3:
                        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    else:
                        img_bgr = img_array
                    
                    height, width = img_bgr.shape[:2]
                    timestamp_ms = int((frame_count / fps) * 1000)
                    
                    # Process with MediaPipe
                    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB))
                    detection_result = detector.detect_for_video(mp_image, timestamp_ms)
                    
                    # Draw landmarks and process gait analysis
                    annotated_rgb = draw_landmarks_on_image(mp_image.numpy_view(), detection_result)
                    annotated_bgr = cv2.cvtColor(annotated_rgb, cv2.COLOR_RGB2BGR)
                    processed_frame, gait_metrics = process_gait_analysis(annotated_bgr.copy(), detection_result)
                    
                    # Convert back to base64 with optimized quality
                    encode_param = [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    _, buffer = cv2.imencode('.jpg', processed_frame, encode_param)
                    processed_b64 = base64.b64encode(buffer).decode('utf-8')
                    processed_data_url = f"data:image/jpeg;base64,{processed_b64}"
                    
                    print(f"Direct base64 frame {frame_count} processed: {width}x{height}")
                    
                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "message": "Frame processed with gait analysis",
                        "processed_image": processed_data_url,
                        "dimensions": {"width": width, "height": height},
                        "gait_metrics": gait_metrics,
                        "frame_count": frame_count
                    }))
                    
                except Exception as e:
                    print(f"Error processing direct base64: {e}")
                    await websocket.send_text(json.dumps({
                        "status": "error",
                        "message": f"Error processing image: {str(e)}"
                    }))
                    
    except WebSocketDisconnect:
        print("WebSocket disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_text(json.dumps({
                "status": "error",
                "message": f"Connection error: {str(e)}"
            }))
        except:
            pass