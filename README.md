# HydroRTC
A Web-Based Data Transfer and Communication Library for Collaborative Data Processing and Sharing in the Hydrological Domain

## Table of Contents

* [Introduction](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#introduction)
* [How to Use](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#how-to-use)
* [Expansions and Test Cases](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#expansions-and-test-cases)
* [Community](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#community)
* [Feedback](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#feedback)
* [Scalability and To Do's](https://github.com/uihilab/HydroRTC/tree/main?tab=readme-ov-file#scalability-and-to-dos)
* [License]()
* [Acknowledgements]()
* [References]()

## Introduction
It is a library to facilitate applications in data sharing and analysis. This library has following features with possible usecases:
 
## How to Use
HydroRTC library is divided into two major components:

1. HydroRTC Client: Corresponding code for this component is in [hydrortcclient.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/hydrortcclient.js). This component gives access to the functions that are required by the client code of the application to utilize above list of features and usecases.
2. HydroRTC Server: Corresponding code for this component is in [hydrortcserver.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/hydrortcserver.js). This component manages all the connected peers and performs all the functions that are necessary for the application to utilize above list of features and usecases.

Both of the components communicate with each other using [Socket.IO library](https://socket.io/). HydroRTC Client uses [Client API](https://socket.io/docs/v3/client-api/index.html) while, HydroRTC uses [Server API](https://socket.io/docs/v3/server-api/index.html). In the following figure, Modules, Functions, and data contained inside these components can be seen.

![component](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/architecture.png)

This repository is mainly composed of the following:
1. <strong> [src](https://github.com/uihilab/WebRTC/tree/main/src)</strong>: This folder contains all the HydroRTC library files and code.
2.  <strong> [test](https://github.com/uihilab/WebRTC/tree/main/test)</strong>: This folder contains example for the peer-to-peer and server-to-peer usage of the library.

### Deployment
The library is based on [NodeJS](https://nodejs.org/en/download/) so you need to install and configure  in your environment. Afterwards you can take the next steps to setup the library for publishing or deployment.

The library is dependent on following packages:

1. [PeerJS](https://peerjs.com/) for peer to peer communication using WebRTC.
2. [Socket.IO](https://socket.io/) for client-server and server-client communication.

To install these packages, you need to go terminal and point to root folder of the library then type following command to install all the dependencies in [package.json](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/package.json).

```
npm install
```
After installing the packages, you need to run following command to transpile [hydrortcclient.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc/hydrortcclient.js)
into a separate build folder to make it available for browser/client code of the application so it imports the required code.

```
npm run build
```

Now, the library is ready for distribution.

### How to import this library

The [hydro-rtc-test](https://github.com/uihilab/WebRTC/tree/main/hydro-rtc-test)</strong> is the demo application that demonstrates how to use the HydroRTC. Please note, since the library is based on NodeJS server so, any application that will import this library will become a NodeJS application and all pre-requisites of NodeJS application will be applied.

1. In package.json file of the application please, list the hydro-rtc as dependency as demonstrated in [package.json](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc-test/package.json). Please note, this is a package.json file of demo application and its in the same location where library code is placed once, the library is deployed the path of hydro-rtc dependency should be updated accordingly.
2. Then, type the following command in the root folder of the application where package.json file is placed, to download the required dependencies.

```
npm install
```

3. After downloading the dependencies, in the server file of the application e-g index.js in case of NodeJS application, import the server component of the library and configure the server accordingly. Please see [index.js](https://github.com/uihilab/WebRTC/blob/main/hydro-rtc-test/index.js) to get the idea.
4. Then, you need to import the client component of the library in the browser/client code of the application for that purpose you can look at script sections of (index.html)[https://github.com/uihilab/WebRTC/blob/main/hydro-rtc-test/index.html] file. In this file, you can also view how to call appropriate functions to achieve particular feature.
5. Now, the library is imported and this application can be run like any other NodeJS application.

## Expansions and Test Cases
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

To test the applications, we have used HDF5, NetCDF, GRIBB, and large TIFF/geoTIFF files that streamed data through dependencies in the node package. This can be made available upon request.

### Use case diagrams

1. Sever-to-Peer Data:

![stream-data](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/s2p.png)

2. Smart Data Tranmission:

![smart-data-sharing](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/data-p2p.png)

3. Distributed Data Sharing:

![distributed-data-sharing](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/tasks.png)

4. Decentralized Data Distribution:

![decentralized-data-distribution](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/decentralized.png)

5. Peer to Peer Data Exchange:

![collaborative-data-exchange](https://github.com/uihilab/WebRTC/blob/main/docs/diagrams/p2p.png)

## Community

The library is meant as a developing environment that allows the deployment of different types of application through an easy to use interface. New workflows and examples can be added by the community of users to exemplofy different examples on how to create web applications for server and client side using the library.

## Feedback

Please feel free to send feedback to us on any issues found by filing an issue.

## Scalability and To Do's

The framework is not limited to the functions and modules implemented, but rather provides a boilerplate for new features to be added. Nonetheless, the following should be considered:

* The current implementation runs solely on Node.js environment, and thus not optimized to render 

## License

This project is licensed under the MIT License - see the [LICENSE](https://github.com/uihilab/HydroRTC/tree/main?tab=MIT-1-ov-file#readme) file for details.

## Acknowledgements
This project is developed by the University of Iowa Hydroinformatics Lab (UIHI Lab):

https://hydroinformatics.uiowa.edu/.

## References

* Erazo Ramirez, C., Sermet, Y., Shahid, M., & Demir, I. (2024). HydroRTC: A web-based data transfer and communication library for collaborative data processing and sharing in the hydrological domain. Environmental Modelling & Software, 178, 106068. https://doi.org/10.1016/j.envsoft.2024.106068
