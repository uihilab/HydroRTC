# HydroRTC

It is a library to facilitate applications in data sharing and analysis. This library has following features with possible usecases:

## Features and Potential usecases
- <strong>Streaming and consuming large datasets</strong> for radar/satellite or sensor data (time series)
  - <strong>Streaming Large-scale Data:</strong> Visualizing and consuming large-scale streaming datasets as it arrives from server or other peers
    - DEM data
  - <strong>Smart Data Transmission:</strong> Analysis with first chunks of data and updating the data delivery priorities (start with 15 min, and switch to hourly)
    - Rainfall data streaming at different resolutions (60, 30, 15 minutes)
  - <strong>Distributed Data Analysis and Processing:</strong> Distributing modeling tasks and receiving results from peers
    - Flood forecasting/mapping - volunteer computing
- <strong>Peer to peer data sharing</strong>  for environmental science - first user downloads data to indexdb and shares this data with second user directly
  - <strong>Decentralizing Data Distribution:</strong> Peer to peer data sharing (reducing load on the server - decentralizing the data sharing) (1 peer is active - requesting, 2nd peer is passive which is sharing data)
  - <strong>Collaborative Data Exchange:</strong> Peer to peer model results sharing for collaborative data analysis, communication and exploration (2 peers actively interacting with each other) - chat/file exchange
    - <strong>Hydrological analysis, flood forecasting/mapping:</strong> Sharing the results with peers
    - <strong>VR Multiplayer Synchronization:</strong> Data and function sync for remote peers in the same VR room (GeospatialVR)
 
