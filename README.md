## Inspiration


## What it does

## How we built it

## Challenges we ran into
Throughout the development process, we encountered several technical challenges, particularly in implementing the real-time chart display. One of the primary issues involved ensuring continuous data updates on the chart. Initially, the chart failed to render dynamic updates due to redundant logic and poorly defined conditional statements within our update algorithm. Through systematic debugging and code optimization, we corrected these issues and enabled the chart to reflect live data streams accurately. Additionally, we faced challenges in integrating the back-end data stream with the React-based front-end. The graph was not accurately representing user motion captured by the camera. Upon investigation, we identified that the visualization was based on averaged values rather than raw sensor data, leading to a loss of fidelity and a disconnect between actual motion and displayed results. By modifying the data processing pipeline to transmit raw, time sensitive values, we restored the accuracy of the real time graph and ensured it responded correctly to movement.


## Accomplishments that we're proud of
As part of developing NeuroGait’s real-time gait analysis and neural risk assessment capabilities, we expanded our backend technology stack to include FastAPI and WebSockets for low-latency, bi-directional communication. This allowed for continuous data streaming and real-time plotting between the server and client, which is essential for responsive and interactive gait monitoring. We implemented WebSocket endpoints using FastAPI’s asynchronous capabilities and type-hinted route definitions, ensuring efficient data handling and scalability. In addition, we resolved integration challenges across the front-end and back-end by leveraging terminal-based tools for dependency management, environment configuration, and debugging.

## What's next for NeuroGait
To enhance the impact of NeuroGait, we have identified three key areas for improvement.
First, we plan to integrate advanced sensors such as LiDAR to accurately measure distances in real world units. This offers significantly greater precision than traditional webcam based systems that rely on pixel based measurements, enabling more reliable gait analysis and improved clinical insights.
Second, we aim to personalize the user experience. At present, NeuroGait compares a user’s gait data against generalized statistics for elderly populations. Moving forward, we plan to collect personalized baseline data through a brief onboarding survey, including details like height, mobility history, and previous diagnoses. This will allow us to tailor the analysis to each individual, such as calculating gait ratios based on step length relative to height, resulting in more accurate and meaningful assessments.
Finally, we intend to broaden NeuroGait’s reach through both hardware accessibility and strategic partnerships. Our goal is to release an affordable hardware kit that could be subsidized by healthcare programs, much like publicly funded colon cancer screening kits. Additionally, collaborating with institutions such as nursing homes and elder care centers will help us deliver NeuroGait to a larger population of seniors who could benefit from early detection of neurological conditions.
