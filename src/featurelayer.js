import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style.js';

// create unmanaged layer
export default function (features, map) {
  let sourceLayer;
  var styles = [
    /* We are using two different styles:
     *  - The first style is for polygons geometries.
     *  - The second style is for point geometries.
     */
    new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 3
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)'
      })
    }),
    new Style({
      image: new CircleStyle({
        radius: 5,
        fill: new Fill({
          color: 'red'
        })
      })
    })
  ];
  const collection = features ? [features] : [];
  const featureLayerStore = new VectorSource({
    features: collection
  });
  const featureLayer = new VectorLayer({
    source: featureLayerStore,
    map,
    style: styles
  });

  function onAddFeature(e) {
    console.log(e.feature);
  }

  featureLayerStore.on('addfeature', onAddFeature);

  return {
    addFeature: function addFeature(feature) {
      featureLayerStore.addFeature(feature);
    },
    removeFeature: function removeFeature(feature) {
      featureLayerStore.removeFeature(feature);
    },
    setSourceLayer: function setSourceLayer(layer) {
      sourceLayer = layer;
    },
    getFeatures: function getFeatures() {
      return featureLayerStore.getFeatures();
    },
    getFeatureLayer: function getFeatureLayer() {
      return featureLayer;
    },
    getFeatureStore: function getFeatureStore() {
      return featureLayerStore;
    },
    getSourceLayer: function getSourceLayer() {
      return sourceLayer;
    },
    clear: function clear() {
      featureLayerStore.clear();
    },
    clearAndAdd: function clearAndAdd(feature, style) {
      featureLayerStore.clear();
      featureLayer.setStyle(style);
      featureLayerStore.addFeature(feature);
    }
  };
}
