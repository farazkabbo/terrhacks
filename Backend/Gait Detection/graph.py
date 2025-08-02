import matplotlib.pyplot as plt
import matplotlib.animation as animation
from collections import deque
import numpy as np
import time

class RealTimePlotter:
    def __init__(self, window_size=100, update_interval=50):
        """
        Initialize the real-time plotter.

        Args:
            window_size (int): Number of data points to display in the window
            update_interval (int): Update interval in milliseconds
        """
        self.window_size = window_size
        self.update_interval = update_interval

        # Initialize data storage
        self.data = deque(maxlen=window_size)
        self.time_data = deque(maxlen=window_size)
        self.time_counter = 0

        # Set up the plot
        plt.ion()  # Turn on interactive mode
        self.fig, self.ax = plt.subplots(figsize=(10, 6))
        self.line, = self.ax.plot([], [], 'b-', linewidth=2)

        # Configure the plot
        self.ax.set_xlim(0, window_size)
        self.ax.set_ylim(-0.1, 1.1)
        self.ax.set_xlabel('Time Steps')
        self.ax.set_ylabel('Value')
        self.ax.set_title('Real-time Value Monitor (0-1 Range)')
        self.ax.grid(True, alpha=0.3)

        # Add horizontal reference lines
        self.ax.axhline(y=0, color='r', linestyle='--', alpha=0.5, label='Min (0)')
        self.ax.axhline(y=1, color='r', linestyle='--', alpha=0.5, label='Max (1)')
        self.ax.axhline(y=0.5, color='g', linestyle='--', alpha=0.3, label='Mid (0.5)')
        self.ax.legend(loc='upper right')

        plt.tight_layout()

    def add_value(self, value):
        """
        Add a new value to the plot and update the display.

        Args:
            value (float): New value between 0 and 1
        """
        # Clamp value to 0-1 range
        value = max(0, min(1, value))

        # Add new data point
        self.data.append(value)
        self.time_data.append(self.time_counter)
        self.time_counter += 1

        # Update the plot
        self.update_plot()

    def update_plot(self):
        """Update the matplotlib plot with current data."""
        if len(self.data) > 0:
            # Update line data
            self.line.set_data(list(self.time_data), list(self.data))

            # Adjust x-axis to show the most recent data
            if len(self.time_data) > 0:
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


# Example usage and demonstration
def demo_plotter():
    """Demonstrate the real-time plotter with sample data."""
    import time
    import random

    # Create plotter instance
    plotter = RealTimePlotter(window_size=50)
    plotter.show()

    print("Starting real-time plot demo...")
    print("The plot will show random values for 10 seconds.")
    print("Close the plot window to stop early.")

    try:
        # Generate sample data for demonstration
        for i in range(100):
            # Generate a random value between 0 and 1
            # Using sine wave with noise for more interesting pattern
            base_value = (np.sin(i * 0.1) + 1) / 2  # Sine wave normalized to 0-1
            noise = random.uniform(-0.2, 0.2)  # Add some noise
            value = base_value + noise

            # Add the value to the plot
            plotter.add_value(value)

            # Small delay to simulate real-time data
            time.sleep(0.1)

            # Check if window is still open
            if not plt.get_fignums():
                break

    except KeyboardInterrupt:
        print("Demo interrupted by user.")

    finally:
        # Clean up
        plotter.close()
        print("Demo completed.")


# Simple function interface for easy use
def create_value_plotter(window_size=100):
    """
    Create and return a simple plotter function.

    Args:
        window_size (int): Number of data points to display

    Returns:
        tuple: (add_value_function, show_function, close_function)
    """
    plotter = RealTimePlotter(window_size)

    def add_value(value):
        plotter.add_value(value)

    def show():
        plotter.show()

    def close():
        plotter.close()

    return add_value, show, close


if __name__ == "__main__":
    # Run the demonstration
    demo_plotter()

    print("\n" + "=" * 50)
    print("Alternative usage example:")
    print("=" * 50)

    # Show alternative usage
    add_value, show, close = create_value_plotter(window_size=30)
    show()

    # Add some sample values
    sample_values = [0.1, 0.3, 0.7, 0.9, 0.5, 0.2, 0.8, 0.4, 0.6]
    for val in sample_values:
        add_value(val)
        time.sleep(0.5)

    input("Press Enter to close the plot...")
    close()