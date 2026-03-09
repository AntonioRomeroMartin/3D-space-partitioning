import { PCDLoader } from "three/addons/loaders/PCDLoader.js";

export function loadPointCloud(scene, datasetPath, onLoaded, onError) {

  const loader = new PCDLoader();

  loader.load(
    datasetPath,
    function (points) {

      console.log("Point cloud loaded");

      points.geometry.center();
      scene.add(points);

      if (onLoaded) {
        onLoaded(points);
      }

    },
    undefined,
    function (error) {

      console.error("Error loading PCD:", error);

      if (onError) {
        onError(error);
      }

    }
  );

}