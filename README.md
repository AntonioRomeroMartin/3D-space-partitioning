# 3D Space Partitioning Viewer

This project implements and visualizes different **3D space partitioning algorithms** for point cloud data.

The goal is to study spatial data structures used in computer graphics such as:

- Octree
- K-d Tree
- Binary Space Partitioning (BSP) Tree

A 3D viewer is used to visualize the point cloud and the partitions created by these structures.

---

## Technologies

- Node.js
- npm
- Three.js
- Vite

---

## Installation

Make sure you are using Node.js version 20 or higher.

Install dependencies:

```bash
npm install
```

## Run the project

Start the development server:

```bash
npm run dev
```

## Point Clouds

To use the application with example point clouds, you need to place the `.pcd` files in the following folder:

```
public/data/
```

You can download the example datasets from the following GitHub Release:

[https://github.com/AntonioRomeroMartin/3D-space-partitioning/releases/tag/datasets](https://github.com/AntonioRomeroMartin/3D-space-partitioning/releases/tag/datasets)

After downloading, copy the `.pcd` files (e.g., `ufo.pcd`, `hasselt.pcd`, `corridor_telin.pcd`) into the `public/data/` directory of the project.

When you run the app locally, it will automatically load the datasets from this folder.


## Authors

- Antonio Romero Martín
- Siebe Ternest

