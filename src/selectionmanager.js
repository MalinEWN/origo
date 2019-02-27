import infowindowManager from './infowindow';
import Collection from 'ol/Collection';
import viewer from './viewer';
import featurelayer from './featurelayer';
import Style from './style';
import StyleTypes from './style/styletypes';

const style = Style();
const styleTypes = StyleTypes();
const multiselectStyleOptions = styleTypes.getStyle('selection');

let selectedItems;
let urval;
let map;
let infowindow;
let isInfowindow;

function addItem(item) {
  if (alreadyExists(item)) {
    return;
  }
  selectedItems.push(item);
}

function addItems(items) {
  items.forEach(item => {
    addItem(item);
  });
}

function highlightAndExpandItem(item) {
  const featureId = item.getFeature().getId();
  highlightFeatureById(featureId);
  infowindow.showSelectedList(item.getLayer().get('name'));
  infowindow.expandListElement(featureId);
  infowindow.highlightListElement(featureId);
}

function highlightItem(item) {
  const featureId = item.getFeature().getId();
  highlightFeatureById(featureId);
  infowindow.showSelectedList(item.getLayer().get('name'));
  infowindow.expandListElement(featureId);
  infowindow.highlightListElement(featureId);
  infowindow.scrollListElementToView(featureId);
}

function addOrHighlightItem(item) {
  if (alreadyExists(item)) {
    // highlight
    highlightItem(item);
  } else {
    // add
    selectedItems.push(item);
    if (selectedItems.getLength() === 1) {
      highlightAndExpandItem(item);
    }
  }
}

function getSelectedItemsForALayer(layerName) {
  const items = selectedItems.getArray().filter(i => i.getLayer().get('name') === layerName);
  return items;
}

function removeItem(item) {
  selectedItems.remove(item);
}

function removeItems(items) {
  const itemsToBeRemoved = [];
  items.forEach(item => {
    selectedItems.forEach(si => {
      if (item.getId() === si.getId()) {
        itemsToBeRemoved.push(si);
      }
    });
  });
  itemsToBeRemoved.forEach(item => selectedItems.remove(item));
}

function removeItemById(id) {
  selectedItems.forEach(item => {
    if (item.getId() === id) {
      selectedItems.remove(item);
    }
  });
}

function clearSelection() {
  selectedItems.clear();
}

function alreadyExists(item) {
  return selectedItems.getArray().find(i => item.getId() === i.getId());
}

function featureStyler(feature) {
  if (feature.get('state') === 'selected') {
    return style.createStyleRule(multiselectStyleOptions.highlighted);
  } else {
    return style.createStyleRule(multiselectStyleOptions.selected);
  }
}

function onItemAdded(event) {
  const item = event.element;
  const layerName = event.element.getLayer().get('name');
  const layerTitle = event.element.getLayer().get('title');

  if (!urval.has(layerName)) {
    const urvalLayer = featurelayer(null, map);
    urvalLayer.setStyle(featureStyler);
    urval.set(layerName, urvalLayer);
    infowindow.createUrvalElement(layerName, layerTitle);
  }

  urval.get(layerName).addFeature(item.getFeature());
  infowindow.createListElement(item);

  const sum = urval.get(layerName).getFeatures().length;
  infowindow.updateUrvalElementText(layerName, layerTitle, sum);

  if (isInfowindow)
    infowindow.show();
}

function onItemRemoved(event) {

  const item = event.element;
  const layerName = event.element.getLayer().get('name');
  const layerTitle = event.element.getLayer().get('title');
  const feature = item.getFeature();
  feature.unset('state', 'selected');

  urval.get(layerName).removeFeature(feature);
  infowindow.removeListElement(item);

  const sum = urval.get(layerName).getFeatures().length;
  infowindow.updateUrvalElementText(layerName, layerTitle, sum);

  if (urval.get(layerName).getFeatures().length < 1) {
    infowindow.hideUrvalElement(layerName);
  }

  if (selectedItems.getLength() < 1) {
    infowindow.hide();
  }
}

function highlightFeatureById(id) {
  selectedItems.forEach(item => {
    const feature = item.getFeature();
    if (item.getId() === id)
      feature.set('state', 'selected');
    else
      feature.unset('state', 'selected');
  });
  // we need to manually refresh other layers, otherwise unselecting does not take effect until the next layer refresh which is a bit strange!
  urval.forEach((value, key, map) => value.refresh());
}

function highlightFeature(feature) {
  feature.set('state', 'selected');
}

function getNumberOfSelectedItems() {
  return selectedItems.getLength();
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

  runPolyfill();
  map = viewer.getMap();
  selectedItems = new Collection([], { unique: true });
  urval = new Map();
  isInfowindow = Object.prototype.hasOwnProperty.call(options, 'infowindow') ? options.infowindow === 'infowindow' : false;
  infowindow = infowindowManager.init(options.infowindowOptions ? options.infowindowOptions : {});
  selectedItems.on('add', onItemAdded);
  selectedItems.on('remove', onItemRemoved);
}

export default {
  init,
  addItems,
  removeItem,
  removeItems,
  addOrHighlightItem,
  removeItemById,
  clearSelection,
  highlightFeature,
  highlightFeatureById,
  getNumberOfSelectedItems,
  getSelectedItemsForALayer
}