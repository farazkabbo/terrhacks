# NeuroGait

---

## Authors

- Ishaan Mittal: [github.com/ishaanmittal](https://github.com/ishaanmittal)  
- [Add other authors here in the same format]

---

## Tech Stack Used

- **Front-end:** React.js, Next.js, React Bits, TypeScript  
- **Back-end:** Python, FastAPI, WebSockets  
- **Computer Vision:** OpenCV, MediaPipe  

---

## Inspiration

With a focus on healthcare, we aimed to address one of the most financially burdensome diseases that significantly impact patients’ economic well-being and present ongoing challenges due to the lack of a direct cure. Rather than relying solely on biological interventions, our approach emphasizes logical and data-driven processes to mitigate disease progression. Additionally, we sought to develop a novel method for identifying conditions such as Alzheimer’s disease that goes beyond traditional memory tests. By making early diagnosis more affordable and accessible, we hope to enable timely intervention and reduce the overall impact on patients and the healthcare system.

---

## What it does

NeuroGait is a data-driven application designed to analyze gait metrics for the early detection of cognitive and motor decline associated with Alzheimer’s and Parkinson’s diseases. The application focuses on identifying anomalies in walking patterns by examining key parameters such as:

- **Stride length:** NeuroGait monitors whether the average stride length falls within the 87–89 cm range, a benchmark established by scientific studies for elderly individuals at risk of these conditions.  
- **Swing time:** The application evaluates the gait cycle by measuring the ratio of half the stride length to the swing time, ensuring it aligns with the typical elderly gait speed range of 1.1 to 1.5 meters per second.

---

## How we built it

The front-end was developed using React.js with Next.js to manage routing and rendering. We used React Bits to improve UI responsiveness and interactivity, while TypeScript provided static type checking to catch errors early and maintain consistent data structures across the application. For real-time functionality, we integrated the front-end with a Python-based back-end using WebSockets. This enabled continuous data transmission for gait analysis. FastAPI was used to manage asynchronous WebSocket connections, and the computer vision components were powered by OpenCV and MediaPipe to perform real-time gait detection and skeletal tracking.

---

## Challenges we ran into

Throughout the development process, we encountered several technical challenges, particularly in implementing the real-time chart display. One of the primary issues involved ensuring continuous data updates on the chart. Initially, the chart failed to render dynamic updates due to redundant logic and poorly defined conditional statements within our update algorithm. Through systematic debugging and code optimization, we corrected these issues and enabled the chart to reflect live data streams accurately.

Additionally, we faced challenges in integrating the back-end data stream with the React-based front-end. The graph was not accurately representing user motion captured by the camera. Upon investigation, we identified that the visualization was based on averaged values rather than raw sensor data, leading to a loss of fidelity and a disconnect between actual motion and displayed results. By modifying the data processing pipeline to transmit raw, time sensitive values, we restored the accuracy of the real time graph and ensured it responded correctly to movement.

---

## Accomplishments that we're proud of

As part of developing NeuroGait’s real-time gait analysis and neural risk assessment capabilities, we expanded our backend technology stack to include FastAPI and WebSockets for low-latency, bi-directional communication. This allowed for continuous data streaming and real-time plotting between the server and client, which is essential for responsive and interactive gait monitoring. We implemented WebSocket endpoints using FastAPI’s asynchronous capabilities and type-hinted route definitions, ensuring efficient data handling and scalability. In addition, we resolved integration challenges across the front-end and back-end by levera
