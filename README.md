This repository contains following two folders:
1. <strong> [hydro-rtc](https://github.com/uihilab/WebRTC/tree/main/hydro-rtc)</strong>: This folder contains all the HydroRTC library files and code.
2.  <strong> [hydro-rtc-test](https://github.com/uihilab/WebRTC/tree/main/hydro-rtc-test)</strong>: This is a demo application to demonstrate how HydroRTC library can be imported and used.

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
 
## Components
HydroRTC library is divided into two major components:

1. HydroRTC Client: Corresponding code for this component is in [hydrortcclient.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/hydrortcclient.js). This component gives access to the functions that are required by the client code of the application to utilize above list of features and usecases.
2. HydroRTC Server: Corresponding code for this component is in [hydrortcserver.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/hydrortcserver.js). This component manages all the connected peers and performs all the functions that are necessary for the application to utilize above list of features and usecases.

Both of the components communicate with each other using [Socket.IO library](https://socket.io/). HydroRTC Client uses [Client API](https://socket.io/docs/v3/client-api/index.html) while, HydroRTC uses [Server API](https://socket.io/docs/v3/server-api/index.html). In the following figure, Modules, Functions, and data contained inside these components can be seen.

![image info](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/Highlevel-component.png)
