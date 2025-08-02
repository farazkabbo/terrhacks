import cv2
from mediapipe import solutions
from mediapipe.framework.formats import landmark_pb2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
import math

import matplotlib.pyplot as plt
from collections import deque
import numpy as np


class RealTimePlotter:
    def __init__(self, window_size=100, update_interval=50, num_lines=8):
        """
        Initialize the real-time plotter.

        Args:
            window_size (int): Number of data points to display in the window
            update_interval (int): Update interval in milliseconds
            num_lines (int): Number of lines to plot simultaneously
        """
        self.window_size = window_size
        self.update_interval = update_interval
        self.num_lines = num_lines

        # Initialize data storage for multiple lines
        self.data = [deque(maxlen=window_size) for _ in range(num_lines)]
        self.time_data = deque(maxlen=window_size)
        self.time_counter = 0

        # Set up the plot
        plt.ion()  # Turn on interactive mode
        self.fig, self.ax = plt.subplots(figsize=(12, 8))

        # Create multiple lines with different colors
        colors = ['blue', 'red', 'green', 'orange', 'purple', 'brown', 'pink', 'gray']
        self.lines = []
        for i in range(num_lines):
            line, = self.ax.plot([], [], color=colors[i % len(colors)],
                                 linewidth=2, label=f'Line {i + 1}')
            self.lines.append(line)

        # Configure the plot
        self.ax.set_xlim(0, window_size)
        self.ax.set_ylim(-100, 100)
        self.ax.set_xlabel('Time Steps')
        self.ax.set_ylabel('Value')
        self.ax.set_title(f'Real-time Value Monitor - {num_lines} Lines (0-1 Range)')
        self.ax.grid(True, alpha=0.3)

        # Add horizontal reference lines
        self.ax.axhline(y=0, color='black', linestyle='--', alpha=0.5, label='Min (0)')
        self.ax.axhline(y=1, color='black', linestyle='--', alpha=0.5, label='Max (1)')
        self.ax.axhline(y=0.5, color='black', linestyle='--', alpha=0.3, label='Mid (0.5)')

        # Place legend outside the plot area
        self.ax.legend(bbox_to_anchor=(1.05, 1), loc='upper left')
        plt.tight_layout()

    def add_value(self, values):
        """
        Add new values to the plot and update the display.

        Args:
            values (list or array): Array of values, one for each line (should have num_lines elements)
        """
        # Ensure we have the right number of values
        if len(values) != self.num_lines:
            raise ValueError(f"Expected {self.num_lines} values, got {len(values)}")

        # Clamp values to 0-1 range and add to data storage
        for i, value in enumerate(values):
            self.data[i].append(value)

        # Add time point
        self.time_data.append(self.time_counter)
        self.time_counter += 1

        # Update the plot
        self.update_plot()

    def update_plot(self):
        """Update the matplotlib plot with current data."""
        if len(self.time_data) > 0:
            # Update each line
            for i, line in enumerate(self.lines):
                if len(self.data[i]) > 0:
                    line.set_data(list(self.time_data), list(self.data[i]))

            # Adjust x-axis to show the most recent data
            latest_time = self.time_data[-1]
            if latest_time >= self.window_size:
                self.ax.set_xlim(latest_time - self.window_size + 1, latest_time + 1)
            else:
                self.ax.set_xlim(0, self.window_size)

            # Redraw the plot
            self.fig.canvas.draw()
            self.fig.canvas.flush_events()

    def show(self):
        """Display the plot window."""
        plt.show(block=False)

    def close(self):
        """Close the plot window."""
        plt.close(self.fig)


# Simple function interface for easy use
def create_value_plotter(window_size=100, num_lines=8):
    plotter = RealTimePlotter(window_size, num_lines=num_lines)

    def add_value(values):
        plotter.add_value(values)

    def show():
        plotter.show()

    def close():
        plotter.close()

    return add_value, show, close


def draw_landmarks_on_image(rgb_image, detection_result):
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
    dx = x1 - x
    dy = y1 - y
    distance = math.sqrt(dx ** 2 + dy ** 2)
    return distance


def getRealCoords(landmark, frame):
    height, width, channels = frame.shape
    return int(landmark.x * width), int(landmark.y * height)


base_options = python.BaseOptions(model_asset_path='pose_landmarker.task')
options = vision.PoseLandmarkerOptions(
    base_options=base_options,
    output_segmentation_masks=True,
    running_mode=mp.tasks.vision.RunningMode.VIDEO)  # No callback needed for VIDEO mode
detector = vision.PoseLandmarker.create_from_options(options)

# Open the default camera
cam = cv2.VideoCapture(0)

# Get the default frame width and height
frame_width = int(cam.get(cv2.CAP_PROP_FRAME_WIDTH))
frame_height = int(cam.get(cv2.CAP_PROP_FRAME_HEIGHT))

# Get video FPS for timestamp calculation
fps = cam.get(cv2.CAP_PROP_FPS)
if fps == 0:  # Fallback if FPS cannot be determined
    fps = 30

# Define the codec and create VideoWriter object
plotter = RealTimePlotter(window_size=50)
plotter.show()

prevSwingLen = None
prevStrideLen = None
frame_count = 0

from scipy.signal import find_peaks

def getPeakDist(lengths):
    window_size = 10
    smooth = np.convolve(lengths, np.ones(window_size)/window_size, mode='same')
    peaks, properties = find_peaks(smooth,
                                   height=None,  # minimum height of peaks
                                   distance=10,  # minimum distance between peaks
                                   prominence=10)
    peak_distances = np.diff(peaks)
    average_peak_distance = np.mean(peak_distances)
    return average_peak_distance

swingLens = []
strideLens = []

while True:
    ret, frame = cam.read()

    if not ret:
        break

    # Calculate timestamp in milliseconds based on frame count and FPS
    timestamp_ms = int((frame_count / fps) * 1000)

    # Create MediaPipe Image and detect pose landmarks
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=frame)

    # For VIDEO mode, use detect_for_video with timestamp (synchronous)
    detection_result = detector.detect_for_video(image, timestamp_ms)

    # Process the detection result
    landmarks = detection_result.pose_landmarks

    if len(landmarks) > 0 and len(landmarks[0]) >= 28:  # Changed from 26 to 28
        left_foot_x, left_foot_y = getRealCoords(landmarks[0][27], frame)
        right_foot_x, right_foot_y = getRealCoords(landmarks[0][28], frame)
        stride_length = int(calculate_distance(left_foot_x, left_foot_y, right_foot_x, right_foot_y))

        if right_foot_x > left_foot_x:
            stride_length *= -1

        strideLens.append(stride_length)

        cv2.circle(frame, center=(left_foot_x, left_foot_y), radius=2, color=(0, 0, 255), thickness=3)
        cv2.circle(frame, center=(right_foot_x, right_foot_y), radius=2, color=(0, 0, 255), thickness=3)
        cv2.line(frame, (left_foot_x, left_foot_y), (right_foot_x, right_foot_y), (0, 0, 255), 2)

        avgStrideLen = getPeakDist(strideLens)
        cv2.putText(frame, "stride length: " + (str(int(avgStrideLen)) if not math.isnan(avgStrideLen) else 'calculating...'), (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255),
                    2)

        left_elbow_x, left_elbow_y = getRealCoords(landmarks[0][13], frame)
        right_elbow_x, right_elbow_y = getRealCoords(landmarks[0][14], frame)
        swing_length = int(calculate_distance(left_elbow_x, left_elbow_y, right_elbow_x, right_elbow_y))

        if right_elbow_x > left_elbow_x:
            swing_length *= -1

        swingLens.append(swing_length)
        cv2.circle(frame, center=(left_elbow_x, left_elbow_y), radius=2, color=(255, 0, 0), thickness=3)
        cv2.circle(frame, center=(right_elbow_x, right_elbow_y), radius=2, color=(255, 0, 0), thickness=3)
        cv2.line(frame, (left_elbow_x, left_elbow_y), (right_elbow_x, right_elbow_y), (255, 0, 0), 2)

        avgSwingLen = getPeakDist(swingLens)
        cv2.putText(frame, "swing length: " + (str(int(avgSwingLen)) if not math.isnan(avgSwingLen) else 'calculating...'), (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 0, 0), 2)
        plotter.add_value([stride_length, swing_length, 0, 0, 0, 0, 0, 0])

        # Draw landmarks on the frame
    annotated_image = draw_landmarks_on_image(image.numpy_view(), detection_result)
    cv2.imshow('result', cv2.cvtColor(annotated_image, cv2.COLOR_RGB2BGR))

    cv2.imshow('Camera', frame)

    # Increment frame counter
    frame_count += 1

    if cv2.waitKey(1) == ord('q'):
        break

# Release the capture and writer objects
cam.release()
cv2.destroyAllWindows()
