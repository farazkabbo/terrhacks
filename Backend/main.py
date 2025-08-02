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

app = FastAPI()

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create a directory to save received images
os.makedirs("received_images", exist_ok=True)

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
                        # Extract image format
                        image_format = image_data.split(";")[0].split("/")[1]
                    else:
                        image_b64 = image_data
                        image_format = "jpeg"  # default format
                    
                    # Decode base64 to image
                    image_bytes = base64.b64decode(image_b64)
                    image = Image.open(BytesIO(image_bytes))
                    
                    # Convert PIL image to numpy array for OpenCV
                    img_array = np.array(image)
                    
                    # Convert RGB to BGR for OpenCV (if needed)
                    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
                        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)
                    else:
                        img_bgr = img_array
                    
                    # Save the image with timestamp
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
                    filename = f"received_images/image_{timestamp}.{image_format}"
                    cv2.imwrite(filename, img_bgr)
                    
                    # Display the image using OpenCV
                    cv2.imshow("Received Image", img_bgr)
                    cv2.waitKey(1)  # Non-blocking wait
                    
                    # Get image info
                    height, width = img_bgr.shape[:2]
                    
                    print(f"Image received and displayed: {width}x{height}, saved as {filename}")
                    
                    # Send confirmation back to frontend
                    response = {
                        "status": "success",
                        "message": "Image received and displayed",
                        "filename": filename,
                        "dimensions": {"width": width, "height": height},
                        "timestamp": timestamp
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
                    
                    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
                    filename = f"received_images/image_{timestamp}.jpeg"
                    cv2.imwrite(filename, img_bgr)
                    
                    cv2.imshow("Received Image", img_bgr)
                    cv2.waitKey(1)
                    
                    height, width = img_bgr.shape[:2]
                    print(f"Image received: {width}x{height}, saved as {filename}")
                    
                    await websocket.send_text(json.dumps({
                        "status": "success",
                        "message": "Direct base64 image received",
                        "filename": filename,
                        "dimensions": {"width": width, "height": height}
                    }))
                    
                except Exception as e:
                    print(f"Error processing direct base64: {e}")
                    await websocket.send_text(json.dumps({
                        "status": "error",
                        "message": f"Error processing image: {str(e)}"
                    }))
                    
    except WebSocketDisconnect:
        print("WebSocket disconnected")
        cv2.destroyAllWindows()  # Close OpenCV windows when client disconnects
    except Exception as e:
        print(f"WebSocket error: {e}")
        cv2.destroyAllWindows()
        try:
            await websocket.send_text(json.dumps({
                "status": "error",
                "message": f"Connection error: {str(e)}"
            }))
        except:
            pass