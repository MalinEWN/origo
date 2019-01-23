
import infowindow_overlay from './infowindow_overlay';
import infowindow_sidebar from './infowindow_sidebar';
import Collection from 'ol/Collection';
import viewer from './viewer';
import featurelayer from './featurelayer';


let isOverlay;
let selectedItems;
let urval;
let map;
let infowindow;

function addItem(item) {
  if (alreadyExists(item)) {
    return;
  }
  selectedItems.push(item);
  console.log(selectedItems.getLength());
}

function addItems(items) {
  items.forEach(item => {
    addItem(item);
  });
  console.log(selectedItems.getLength());
}

function removeItem(item) {
  selectedItems.remove(item);
  console.log(selectedItems.getLength());
}

function removeItemById(id) {
  selectedItems.forEach(item => {
    if (item.getId() === id) removeItem(item);
  }); 
}

function clearSelection() {
  selectedItems.clear();
  console.log(selectedItems.getLength());
}

function alreadyExists(item) {
  return selectedItems.getArray().find(i => item.getId() === i.getId());
}

function onItemAdded(event) {
  const item = event.element;
  const layerName = event.element.getLayer().get('name');
  const layerTitle = event.element.getLayer().get('title');
  
  console.log(event.element.getLayer());

  if (!urval.has(layerName)) {
    //urval.set(layerName, new Collection([item], { unique: true }));
    urval.set(layerName, featurelayer(null, map));
    infowindow.createUrvalElement(layerName, layerTitle);
  }

  urval.get(layerName).addFeature(item.getFeature());
  infowindow.createListElement(item);
  
  const sum = urval.get(layerName).getFeatures().length;
  infowindow.updateUrvalElementText(layerName, layerTitle, sum);
}

function onItemRemoved(event) {

  const item = event.element;
  const layerName = event.element.getLayer().get('name');
  const layerTitle = event.element.getLayer().get('title');

  urval.get(layerName).removeFeature(item.getFeature());
  infowindow.removeListElement(item);

  const sum = urval.get(layerName).getFeatures().length;
  infowindow.updateUrvalElementText(layerName, layerTitle, sum);
  
  if (urval.get(layerName).getFeatures().length < 1) {
    infowindow.hideUrvalElement(layerName);
  }
}

function runPolyfill() {
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function (predicate) {
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

function init(options) {
  console.log('initiating selection manager');
  runPolyfill();
  map = viewer.getMap();
  selectedItems = new Collection([], { unique: true });
  urval = new Map();
  isOverlay = Object.prototype.hasOwnProperty.call(options, 'overlay') ? options.overlay : true;

  if (isOverlay) {
    infowindow = infowindow_overlay.init();
  } else {
    infowindow = infowindow_sidebar.init();
  }

  selectedItems.on('add', onItemAdded);
  selectedItems.on('remove', onItemRemoved);
}


export default {
  init,
  addItem,
  addItems,
  removeItem,
  removeItemById,
  clearSelection
}