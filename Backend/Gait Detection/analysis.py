import numpy as np
from scipy.signal import find_peaks

swing_lengths = [73, 75, 72, 71, 72, 66, 69, 62, 52, 43, 37, 35, 35, 34, 35, 37, 38, 40, 40, 42, 50, 55, 58, 62, 65, 67, 72, 77, 79, 79, 78, 76, 76, 72, 69, 66, 62, 57, 54, 48, 40, 34, 26, 20, 15, 9, 7, 9, 5, 4, 4, 9, 14, 11, 21, 23, 25, 21, 25, 26, 32, 42, 46, 48, 50, 46, 50, 48, 48, 43, 42, 35, 28, 22, 17, 14, 7, -5, -8, -9, -11, -13, -14, -16, -17, -15, -17, -14, -13, -15, -15, -14, -12, -5, -9, -5, 9, 8, -3, -6, 0, 2, 6, 4, -8, 10, 10, 13, 11, -11, -12, -16, -23, -26, -30, -36, -39, -48, -56, -64, -63, -63, -62, -60, -57, -52, -47, -44, -40, -36, -35, -31, -29, -22, -16, -13, -11, -18, -15, -11, -17, -17, -22, -30, -30, -36, -39, -47, -53, -68, -81, -88, -92, -94, -94, -95, -96, -94, -90, -87, -83, -78, -71, -63, -53, -51, -47, -47, -35, -32, -26, -25, -21, -15, -12, 13, -13, 16, 10, 17, 13, 21, 30, 34, 44, 38, 41, 38, 35, 38, 37, 45, 44, 45, 19, 7, 20, 38, 32, 34, 13, 18]
stride_lengths = [-34, -30, -23, -19, 15, 15, 20, 30, 40, 50, 60, 66, 69, 71, 72, 70, 68, 65, 60, 52, 43, 33, 23, 10, 4, -12, -30, -41, -51, -58, -61, -63, -63, -62, -60, -57, -53, -48, -41, -36, -31, -21, 21, 29, 39, 50, 61, 71, 76, 78, 77, 76, 74, 69, 63, 56, 46, 34, 24, 12, 5, -13, -31, -42, -55, -63, -67, -70, -70, -68, -67, -63, -59, -54, -48, -41, -34, -29, -22, 21, 28, 39, 50, 60, 67, 70, 70, 70, 67, 65, 59, 53, 45, 34, 19, 3, -5, -23, -37, -51, -67, -78, -85, -87, -87, -85, -79, -75, -68, -63, -55, -49, -41, -30, -18, 17, 26, 41, 50, 59, 64, 64, 64, 62, 59, 55, 44, -24, 16, 12, 6, -12, -28, -46, -60, -78, -93, -103, -105, -106, -107, -104, -98, -94, -86, -78, -66, -55, -48, -35, -20, -9, 14, 26, 41, 47, 52, 54, 54, 53, 50, 46, 40, 32, 21, 10, 6, -7, -9, -21, -32, -41, -49, -53, -49, -48, -44, -15, 27, -7, -14, -10, 15, 21, 19, 10, 9, 5, 3, 2, 2, 2, 2, 2, 2, 2, 2, 5, 4, 5, 4, 6]
x = np.arange(0, len(swing_lengths))


import matplotlib.pyplot as plt

window_size = 10
y1_smooth = np.convolve(stride_lengths, np.ones(window_size)/window_size, mode='same')
y2_smooth = np.convolve(stride_lengths, np.ones(window_size)/window_size, mode='same')

peaks, properties = find_peaks(y1_smooth,
                              height=None,      # minimum height of peaks
                              distance=10,      # minimum distance between peaks
                              prominence=10)    # minimum prominence of peaks

# Calculate distances between consecutive peaks
peak_distances = np.diff(peaks)  # differences between peak indices
peak_distances_units = np.diff(x[peaks])  # if x has actual units (time, etc.)

# Print results
print(f"Peak indices: {peaks}")
print(f"Peak values: {y1_smooth[peaks]}")
print(f"Distances between peaks (indices): {peak_distances}")
print(f"Average distance: {np.mean(peak_distances):.2f}")

# Visualize
plt.figure(figsize=(12, 6))
plt.plot(x, y1_smooth, 'b-', label='Data')
plt.plot(x[peaks], y1_smooth[peaks], 'ro', markersize=8, label='Peaks')

# Add distance annotations
for i in range(len(peaks)-1):
    mid_x = (x[peaks[i]] + x[peaks[i+1]]) / 2
    plt.annotate(f'{peak_distances[i]}',
                xy=(mid_x, max(y1_smooth[peaks[i]], y1_smooth[peaks[i+1]])),
                ha='center', va='bottom')

plt.xlabel('Index (or Time)')
plt.ylabel('Swing (Arms)')
plt.title('Peak Detection and Distances')
plt.legend()
plt.grid(True)
plt.show()