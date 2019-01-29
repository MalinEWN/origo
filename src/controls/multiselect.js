import $ from 'jquery';
import VectorSource from 'ol/source/Vector';
import VectorLayer from 'ol/layer/Vector';
import DrawInteraction, { createBox } from 'ol/interaction/Draw';
import PointerInteraction from 'ol/interaction/Pointer';
import Overlay from 'ol/Overlay';
import Polygon, { fromCircle } from 'ol/geom/Polygon';
import viewer from '../viewer';
import utils from '../utils';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import wfs from '../controls/offline/wfs';
import getFeatureInfo from '../getfeatureinfo';
import GeoJSON from 'ol/format/GeoJSON';
import disjoint from '@turf/boolean-disjoint';
import buffer from '@turf/buffer';
import modal from '../modal';
import { selectionLayer } from '../featureinfo';
import GeometryType from 'ol/geom/GeometryType';
import selectionManager from '../selectionmanager';
import SelectedItem from '../models/SelectedItem'

// import Style from '../style';
// import StyleTypes from '../style/styletypes';

// const style = Style();
// const styleTypes = StyleTypes();

let map;
let activeButton;
let defaultButton;
let type;
let selectSource;
let resultsSource;
let resultsVector;
let defaultTool;
let clickSelection;
let boxSelection;
let circleSelection;
let bufferSelection;
let isActive = false;
let clickInteraction;
let boxInteraction;
let circleInteraction;
let bufferInteraction;
let testStyle;
let sketch;
let radius;
let radiusXPosition;
let radiusYPosition;
let radiusLengthTooltip;
let radiusLengthTooltipElement;

function toggleSelect() {
  if (isActive) {
    $('.o-map').trigger({
      type: 'enableInteraction',
      interaction: 'featureInfo'
    });
  } else {
    $('.o-map').trigger({
      type: 'enableInteraction',
      interaction: 'multiselect'
    });
  }
}

function setActive(state) {
  isActive = state;
}

function onEnableInteraction(e) {
  if (e.interaction === 'multiselect') {
    $('#o-multiselect-button button').addClass('o-multiselect-button-true');
    if (clickSelection) {
      $('#o-multiselect-click-button').removeClass('o-hidden');
    }
    if (boxSelection) {
      $('#o-multiselect-box-button').removeClass('o-hidden');
    }
    if (circleSelection) {
      $('#o-multiselect-circle-button').removeClass('o-hidden');
    }
    if (bufferSelection) {
      $('#o-multiselect-buffer-button').removeClass('o-hidden');
    }
    $('#o-multiselect-button').removeClass('o-tooltip');
    setActive(true);
    addInteractions();
    resultsVector.setVisible(true);
    defaultButton.trigger('click');
  } else {
    $('#o-multiselect-button button').removeClass('o-multiselect-button-true');
    if (clickSelection) {
      $('#o-multiselect-click-button').addClass('o-hidden');
    }
    if (boxSelection) {
      $('#o-multiselect-box-button').addClass('o-hidden');
    }
    if (circleSelection) {
      $('#o-multiselect-circle-button').addClass('o-hidden');
    }
    if (bufferSelection) {
      $('#o-multiselect-buffer-button').addClass('o-hidden');
    }
    $('#o-multiselect-button').addClass('o-tooltip');

    //map.un('pointermove', pointerMoveHandler);
    //map.un('click', pointerMoveHandler);
    removeInteractions();
    resultsVector.setVisible(false);
    removeRadiusLengthTooltip();
    resultsSource.clear();
    setActive(false);
  }
}

function fetchFeatures_Click(evt) {

  //const point = evt.feature.getGeometry().getCoordinates();
  if (evt.type === 'singleclick') {

    const isCtrlKeyPressed = evt.originalEvent.ctrlKey;
   /*  // calculating tolerance based on the resolution(zoom). This way zooming out increase the tolerance and make the selection of the point features easier.
    const pixelTolerance = 1;
    const resolution = map.getView().getResolution();
    const distanceTolerance = resolution * pixelTolerance;
    // console.log(resolution);
    const extent = [evt.coordinate[0] - distanceTolerance, evt.coordinate[1] - distanceTolerance, evt.coordinate[0] + distanceTolerance, evt.coordinate[1] + distanceTolerance];
    // console.log(extent);
    //const selectedFeatures = resultsSource.getFeaturesAtCoordinate(evt.coordinate);
    // using extent to be able to deselect point features as well.
    const selectedFeatures = [];
    resultsSource.forEachFeatureIntersectingExtent(extent, f => {
      selectedFeatures.push(f);
      return false;
    });

    if (selectedFeatures.length > 0) {
      selectedFeatures.forEach(f => resultsSource.removeFeature(f));
      return;
    } */

    // Featurinfo in two steps. Concat serverside and clientside when serverside is finished
    const clientResult = getFeatureInfo.getFeaturesAtPixel(evt, -1);
    // Abort if clientResult is false
    if (clientResult !== false) {
      getFeatureInfo.getFeaturesFromRemote(evt)
        .done((data) => {
          const serverResult = data || [];
          const result = serverResult.concat(clientResult);
          if (isCtrlKeyPressed) {
            if (result.length > 0) {
              selectionManager.removeItems(result);
              console.log(result);
            }
          } else {
            if (result.length === 1) {
              console.log(result.length);
              selectionManager.addOrHighlightItem(result[0]);
            } else if (result.length > 1) {
              console.log(result.length);
              selectionManager.addItems(result);
            }
          }
        });
    }
    
    return false;
  }
  return true;
}

function fetchFeatures_Box(evt) {
  //const extent = boxInteraction.getGeometry().getExtent();
  const extent = evt.feature.getGeometry().getExtent();
  const layers = viewer.getQueryableLayers();
  if (layers.length < 1) return;

  const results = getFeaturesIntersectingExtent(layers, extent);

  // adding clint features
  resultsSource.addFeatures(results.selectedClientFeatures);
  // adding features got from wfs GetFeature
  Promise.all(results.featuresPromise).then(data => {
    // data is an array containing corresponding arrays of features for each layer.
    data.forEach(features => resultsSource.addFeatures(features));
  });
}

function fetchFeatures_Circle(evt) {

  // Things needed to be done on 'drawend
  // ==>
  sketch = null;
  removeRadiusLengthTooltip();
  // <==

  const circle = evt.feature.getGeometry();
  const center = circle.getCenter();
  const radius = circle.getRadius();
  const extent = circle.getExtent();
  const layers = viewer.getQueryableLayers();

  const results = getFeaturesIntersectingExtent(layers, extent);

  // adding clint features
  resultsSource.addFeatures(getFeaturesIntersectingGeometry(results.selectedClientFeatures, circle));
  // adding features got from wfs GetFeature
  Promise.all(results.featuresPromise).then(data => {
    // data is an array containing corresponding arrays of features for each layer.
    data.forEach(features => resultsSource.addFeatures(getFeaturesIntersectingGeometry(features, circle)));
  });
  /*
  Uncomment this to draw the extent on the map for debugging porposes
  const f = new Feature(Polygon.fromExtent(extent));
  f.setStyle(testStyle);
  resultsSource.addFeature(f);
  */
}

let bufferFeature;
function fetchFeatures_Buffer_click(evt) {

  //console.log(evt.type);
  if (evt.type === 'singleclick') {

    // Featurinfo in two steps. Concat serverside and clientside when serverside is finished
    const clientResult = getFeatureInfo.getFeaturesAtPixel(evt, -1);
    // Abort if clientResult is false
    if (clientResult !== false) {
      getFeatureInfo.getFeaturesFromRemote(evt)
        .done((data) => {
          const serverResult = data || [];
          const result = serverResult.concat(clientResult);
          if (result.length > 0) {
            // extracting features only. we do not need contents which is created to use in pop-up
            const features = result.map(r => r.feature);
            let promise;
            if (features.length === 1) {
              bufferFeature = features[0].clone();
              promise = Promise.resolve();
            } else if (features.length > 1) {
              promise = createFeatureSelectionModal(features);
            }
            promise.then(() => createRadiusModal());
          }
        });
    }
    return false;
  }
  return true;
}

function createFeatureSelectionModal(features) {

  const featuresList = features.map(f => {
    const title = f.get('namn') ? f.get('namn') : f.getId();
    return `<div class="featureSelectorItem" id="${f.getId()}"> ${title} </div>`;
  });

  return new Promise((resolve, reject) => {
    const title = 'Du har valt flera objekt:';
    const content = `<div id="featureSelector"> 
                      ${featuresList.join('')}
                    </div>`;
    modal.createModal('#o-map', {
      title,
      content
    });
    modal.showModal();
    $('.featureSelectorItem').on('click', (e) => {
      bufferFeature = features.find(f => f.getId().toString() === e.target.id).clone();
      console.log(bufferFeature);
      modal.closeModal();
      resolve();
      e.stopPropagation();
    });
  });
}

function createRadiusModal() {
  const title = 'Ange buffer radie:';
  const content = `<div> 
                    <input type="number" id="bufferradius">
                    <button id="bufferradiusBtn">OK</button>
                  </div>`;
  modal.createModal('#o-map', {
    title,
    content
  });
  modal.showModal();
  $('#bufferradiusBtn').on('click', (e) => {
    const radiusVal = $('#bufferradius').val();
    // entered value should only be a number
    // const pattern = /^[0-9]*$/;
    // const onlyNumbers = pattern.test(radiusVal);
    // console.log(onlyNumbers);
    const radius = parseFloat(radiusVal);

    if (!radius || (radius < 0 && bufferFeature.getGeometry().getType() === GeometryType.POINT)) {
      $('#bufferradius').addClass('unvalidValue');
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    modal.closeModal();
    // TODO: validating radius(only number, min, max)
    fetchFeatures_Buffer_buffer(radius);
  });
}

function fetchFeatures_Buffer_buffer(radius) {
  const geometry = bufferFeature.getGeometry();
  const bufferedFeature = createBufferedFeature(geometry, radius);
  const bufferedGeometry = bufferedFeature.getGeometry();

  const extent = bufferedGeometry.getExtent();
  const layers = viewer.getQueryableLayers();

  /*
  Uncomment this to draw the extent on the map for debugging porposes
  const f = new Feature(Polygon.fromExtent(extent));
  f.setStyle(testStyle);
  resultsSource.addFeature(f);
  */

  const results = getFeaturesIntersectingExtent(layers, extent);

  // adding clint features
  resultsSource.addFeatures(getFeaturesIntersectingGeometry(results.selectedClientFeatures, bufferedGeometry));
  // adding features got from wfs GetFeature
  Promise.all(results.featuresPromise).then(data => {
    // data is an array containing corresponding arrays of features for each layer.
    data.forEach(features => resultsSource.addFeatures(getFeaturesIntersectingGeometry(features, bufferedGeometry)));
  });

}

// General function that recieves a geometry and a radius and returns a buffered feature
function createBufferedFeature(geometry, radius) {

  const format = new GeoJSON();
  const projection = map.getView().getProjection();

  let turfGeometry;

  if (geometry.getType() === 'Circle') {
    // circle is not a standard geometry. we need to create a polygon first.
    const polygon = fromCircle(geometry);
    polygon.transform(projection, 'EPSG:4326');
    turfGeometry = format.writeGeometryObject(polygon);
  } else {
    geometry.transform(projection, 'EPSG:4326');
    turfGeometry = format.writeGeometryObject(geometry);
  }

  // OBS! buffer always return a feature
  const bufferedTurfFeature = buffer(turfGeometry, radius / 1000, { units: 'kilometers' });
  const bufferedOLFeature = format.readFeature(bufferedTurfFeature);
  bufferedOLFeature.getGeometry().transform('EPSG:4326', projection);

  // Uncomment this to draw the geometry for debugging puposes.
  const f = bufferedOLFeature.clone();
  f.setStyle(testStyle);
  resultsSource.addFeature(f);

  return bufferedOLFeature;
}

// General function that recieves an extent and some layers and returns all features in those layers that intersect the extent.
function getFeaturesIntersectingExtent(layers, extent) {

  const selectedClientFeatures = [];
  const featuresPromise = [];

  layers.forEach(layer => {
    // check if layer supports this method, or basically is some sort of vector layer.
    // Alternatively we can check layer.getType === 'VECTOR', but a bit unsure if all types of vector layer have 'VECTOR' as type.
    // Basically here we get all vector features from client.
    if (layer.getSource().forEachFeatureIntersectingExtent) {
      layer.getSource().forEachFeatureIntersectingExtent(extent, (feature) => {
        selectedClientFeatures.push(feature);
      });
    } else {
      featuresPromise.push(wfs.request(layer, extent));
    }
  });

  return {
    selectedClientFeatures: selectedClientFeatures,
    featuresPromise: featuresPromise
  };
}

// General function that recieves a list of features and a geometry, then removes all the features that lie outside of the geometry.
// Do not confuse this function with getFeaturesIntersectingExtent!
function getFeaturesIntersectingGeometry(features, geometry) {

  const format = new GeoJSON();
  const projection = map.getView().getProjection();

  let turfGeometry;

  if (geometry.getType() === 'Circle') {
    // circle is not a standard geometry. we need to create a polygon first.
    const polygon = fromCircle(geometry);
    polygon.transform(projection, 'EPSG:4326');
    turfGeometry = format.writeGeometryObject(polygon);

  } else {
    geometry.transform(projection, 'EPSG:4326');
    turfGeometry = format.writeGeometryObject(geometry);
  }

  const intersectingFeatures = [];

  features.forEach(feature => {
    feature.getGeometry().transform(projection, 'EPSG:4326');
    const turfFeature = format.writeFeatureObject(feature);
    const booleanDisjoint = disjoint(turfFeature, turfGeometry);

    if (!booleanDisjoint) {
      intersectingFeatures.push(feature);
    }

    feature.getGeometry().transform('EPSG:4326', projection);
  });

  /*
  Uncomment this to draw the geometry for debugging puposes.
  const olFeature = format.readFeature(turfGeometry);
  olFeature.getGeometry().transform('EPSG:4326', projection);
  olFeature.setStyle(testStyle);
  resultsSource.addFeature(olFeature);
  
  console.log(features.length);
  console.log(intersectingFeatures.length);
*/

  return intersectingFeatures;
}

function addInteractions() {

  clickInteraction = new PointerInteraction({
    handleEvent: fetchFeatures_Click
  });

  boxInteraction = new DrawInteraction({
    source: selectSource,
    type: 'Circle',
    geometryFunction: createBox()
  });

  circleInteraction = new DrawInteraction({
    source: selectSource,
    type: 'Circle'
  });

  bufferInteraction = new PointerInteraction({
    handleEvent: fetchFeatures_Buffer_click
  });

  map.addInteraction(clickInteraction);
  map.addInteraction(boxInteraction);
  map.addInteraction(circleInteraction);
  map.addInteraction(bufferInteraction);

  boxInteraction.on('drawend', fetchFeatures_Box);
  circleInteraction.on('drawstart', (evt) => {
    sketch = evt.feature.getGeometry();
    createRadiusLengthTooltip();
  });
  circleInteraction.on('drawend', fetchFeatures_Circle);
}

function removeInteractions() {
  map.removeInteraction(clickInteraction);
  map.removeInteraction(boxInteraction);
  map.removeInteraction(circleInteraction);
  map.removeInteraction(bufferInteraction);
}

function toggleType(button) {
  if (activeButton) {
    activeButton.removeClass('o-multiselect-button-true');
  }

  button.addClass('o-multiselect-button-true');
  activeButton = button;

  if (type === 'click') {
    clickInteraction.setActive(true);
    boxInteraction.setActive(false);
    circleInteraction.setActive(false);
    bufferInteraction.setActive(false);
    map.un('pointermove', pointerMoveHandler);

  } else if (type === 'box') {
    clickInteraction.setActive(false);
    boxInteraction.setActive(true);
    circleInteraction.setActive(false);
    bufferInteraction.setActive(false);
    map.un('pointermove', pointerMoveHandler);

  } else if (type === 'circle') {
    clickInteraction.setActive(false);
    boxInteraction.setActive(false);
    circleInteraction.setActive(true);
    bufferInteraction.setActive(false);
    map.on('pointermove', pointerMoveHandler);

  } else if (type === 'buffer') {
    clickInteraction.setActive(false);
    boxInteraction.setActive(false);
    circleInteraction.setActive(false);
    bufferInteraction.setActive(true);
    map.un('pointermove', pointerMoveHandler);
  }
}

function pointerMoveHandler(e) {

  if (!sketch) return;

  radius = sketch.getRadius();
  radiusLengthTooltipElement.innerHTML = radius.toFixed() + ' m';
  radiusXPosition = (e.coordinate[0] + sketch.getCenter()[0]) / 2;
  radiusYPosition = (e.coordinate[1] + sketch.getCenter()[1]) / 2;
  radiusLengthTooltip.setPosition([radiusXPosition, radiusYPosition]);
}

function createRadiusLengthTooltip() {
  if (radiusLengthTooltipElement) {
    radiusLengthTooltipElement.parentNode.removeChild(radiusLengthTooltipElement);
  }

  radiusLengthTooltipElement = document.createElement('div');
  radiusLengthTooltipElement.className = 'o-tooltip o-tooltip-measure';

  radiusLengthTooltip = new Overlay({
    element: radiusLengthTooltipElement,
    offset: [0, 0],
    positioning: 'bottom-center',
    stopEvent: false
  });

  //overlayArray.push(radiusLengthTooltip);
  map.addOverlay(radiusLengthTooltip);
}

function removeRadiusLengthTooltip() {
  map.removeOverlay(radiusLengthTooltip);
  //  viewer.removeOverlays(overlayArray);
}

function render() {
  if (clickSelection || boxSelection || circleSelection || bufferSelection) {
    const toolbar = utils.createElement('div', '', {
      id: 'o-multiselect-toolbar',
      cls: 'o-toolbar-horizontal'
    });

    $('#o-toolbar-multiselect').append(toolbar);

    const msb = utils.createButton({
      id: 'o-multiselect-button',
      cls: 'o-multiselect-button',
      iconCls: 'o-icon-multiselect-main',
      src: '#fa-search',
      tooltipText: 'markera i kartan'
    });
    $('#o-multiselect-toolbar').append(msb);
  }

  if (clickSelection) {
    const cs = utils.createButton({
      id: 'o-multiselect-click-button',
      cls: '',
      iconCls: 'o-icon-multiselect-click',
      src: '#fa-mouse-pointer',
      tooltipText: 'Klick',
      tooltipPlacement: 'north'
    });
    $('#o-multiselect-toolbar').append(cs);
    $('#o-multiselect-click-button').addClass('o-hidden');
  }

  if (boxSelection) {
    const bs = utils.createButton({
      id: 'o-multiselect-box-button',
      cls: '',
      iconCls: 'o-icon-multiselect-box',
      src: '#fa-square-o',
      tooltipText: 'Box',
      tooltipPlacement: 'north'
    });
    $('#o-multiselect-toolbar').append(bs);
    $('#o-multiselect-box-button').addClass('o-hidden');
  }

  if (circleSelection) {
    const cs = utils.createButton({
      id: 'o-multiselect-circle-button',
      cls: '',
      iconCls: 'o-icon-multiselect-circle',
      src: '#fa-circle-o',
      tooltipText: 'Circle',
      tooltipPlacement: 'north'
    });
    $('#o-multiselect-toolbar').append(cs);
    $('#o-multiselect-circle-button').addClass('o-hidden');
  }

  if (bufferSelection) {
    const bfs = utils.createButton({
      id: 'o-multiselect-buffer-button',
      cls: '',
      iconCls: 'o-icon-multiselect-buffer',
      src: '#fa-bullseye',
      tooltipText: 'Buffer',
      tooltipPlacement: 'north'
    });
    $('#o-multiselect-toolbar').append(bfs);
    $('#o-multiselect-buffer-button').addClass('o-hidden');
  }
}

function bindUIActions() {
  if (clickSelection || boxSelection || circleSelection) {
    $('#o-multiselect-button').on('click', (e) => {
      toggleSelect();
      $('#o-multiselect-button button').blur();
      e.preventDefault();
    });
  }
  if (clickSelection) {
    $('#o-multiselect-click-button').on('click', (e) => {
      type = 'click';
      toggleType($('#o-multiselect-click-button button'));
      $('#o-multiselect-click-button button').blur();
      e.preventDefault();
    });
  }
  if (boxSelection) {
    $('#o-multiselect-box-button').on('click', (e) => {
      type = 'box';
      toggleType($('#o-multiselect-box-button button'));
      $('#o-multiselect-box-button button').blur();
      e.preventDefault();
    });
  }
  if (circleSelection) {
    $('#o-multiselect-circle-button').on('click', (e) => {
      type = 'circle';
      toggleType($('#o-multiselect-circle-button button'));
      $('#o-multiselect-circle-button button').blur();
      e.preventDefault();
    });
  }
  if (bufferSelection) {
    $('#o-multiselect-buffer-button').on('click', (e) => {
      type = 'buffer';
      toggleType($('#o-multiselect-buffer-button button'));
      $('#o-multiselect-buffer-button button').blur();
      e.preventDefault();
    });
  }
}

function runpolyfill() {
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function(predicate) {
       // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }
  
        var o = Object(this);
  
        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;
  
        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }
  
        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];
  
        // 5. Let k be 0.
        var k = 0;
  
        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k++;
        }
  
        // 7. Return undefined.
        return undefined;
      },
      configurable: true,
      writable: true
    });
  }
}

function init(optOptions) {
  // console.log(optOptions);
  // const options = optOptions || {};
  // const savedSelection = options.savedSelection || undefined;
  // const savedPin = options.savedPin ? maputils.createPointFeature(options.savedPin, pinStyle) : undefined;
  
  runpolyfill();
  defaultTool = 'click';
  clickSelection = true, boxSelection = true, circleSelection = true, bufferSelection = true;

  map = viewer.getMap();
  // source object to hold drawn features that mark an area to select features from
  selectSource = new VectorSource();
  // source object to hold selected features
  // resultsSource = new VectorSource();
  resultsSource = selectionLayer.getFeatureStore();

  /*
  // Drawn features for selection, 
  // Draw Interaction does not need a layer, only a source is enough for it to work.
  selectVector = new VectorLayer({
    source: selectSource,
    name: 'multiselect',
    visible: true,
    zIndex: 6
  });

  selectVector.setStyle(new Style({
    stroke: new Stroke({
      color: 'red',
      width: 3
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0.1)'
    })
  }));
  */

  testStyle = new Style({
    stroke: new Stroke({
      color: 'rgba(255, 0, 0, 0.5)',
      width: 1
    }),
    fill: new Fill({
      color: 'rgba(0, 0, 255, 0)'
    })
  });

  resultsVector = selectionLayer.getFeatureLayer();
  /*  resultsVector = new VectorLayer({
     source: resultsSource,
     name: 'multiselect',
     visible: true,
     zIndex: 6
   }); */

  // map.addLayer(selectVector);
  // map.addLayer(resultsVector);

  $('.o-map').on('enableInteraction', onEnableInteraction);
  render();
  bindUIActions();
  if (defaultTool === 'click') {
    defaultButton = $('#o-multiselect-click-button button');
  } else if (defaultTool === 'box') {
    defaultButton = $('#o-multiselect-box-button button');
  } else if (defaultTool === 'circle') {
    defaultButton = $('#o-multiselect-circle-button button');
  } else if (defaultTool === 'buffer') {
    defaultButton = $('#o-multiselect-buffer-button button');
  }
}

export default { init };
