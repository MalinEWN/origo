import { Component, dom } from '../ui';

const Exportmap = function (options = {}) {

  const {
    buttonText = 'Ladda ner kartan',
    attributionFontSize = options.attributionFontSize = "10",
    attributionFontColor = options.attributionFontColor = "rgb(64, 64, 64)",
    icon = '#fa-download'
  } = options;

  let viewer;
  let mapMenu;
  let menuItem;
  let map;
  let alreadyDrawn = false;

  function download(format) {
    const attr = getAttributions();
    const scaleInfo = getScaleInfo();

    map.once('postrender', (event) => {
      let canvasOriginal = document.getElementsByTagName('canvas')[0];
      // cloning canvas so that adding text to it doesn't dirty map view.
      let canvas = cloneCanvas(canvasOriginal);
      let ctx = canvas.getContext("2d");
      //var text = ctx.measureText('foo'); // TextMetrics object
      ctx.font = attributionFontSize + "px Arial";
      ctx.fillStyle = attributionFontColor;
      ctx.strokeStyle = attributionFontColor;

      ctx.fillText(attr, 10, canvas.height - 5);

      ctx.beginPath();
      ctx.moveTo(canvas.width - 5, canvas.height - 10);
      ctx.lineTo(canvas.width - 5, canvas.height - 5);
      ctx.lineTo(canvas.width - 5 - scaleInfo.width, canvas.height - 5);
      ctx.lineTo(canvas.width - 5 - scaleInfo.width, canvas.height - 10);

      ctx.font = "10px Arial";
      const textSize = ctx.measureText(scaleInfo.innerHTML); // TextMetrics object
      ctx.fillText(scaleInfo.innerHTML, canvas.width - 5 - (scaleInfo.width / 2) - (textSize.width / 2), canvas.height - 10);
      ctx.stroke();

      let fileName = format === 'image/png' ? 'map.png' : 'map.jpeg';

      canvas.toBlob((blob) => {
        if (navigator.msSaveBlob) {
          navigator.msSaveBlob(blob, fileName);
        } else {
          let link = document.createElement('a');
          let objectURL = URL.createObjectURL(blob);
          link.setAttribute('download', fileName);
          link.setAttribute('href', objectURL);
          link.click();
          URL.revokeObjectURL(objectURL);
        }
      }, format);
    });
    map.renderSync();
  }

  function cloneCanvas(oldCanvas) {

    //create a new canvas
    let newCanvas = document.createElement('canvas');
    let context = newCanvas.getContext('2d');

    //set dimensions
    newCanvas.width = oldCanvas.width;
    newCanvas.height = oldCanvas.height;

    //apply the old canvas to the new one
    context.drawImage(oldCanvas, 0, 0);

    //return the new canvas
    return newCanvas;
  }

  function getAttributions() {

    const layers = viewer.getLayers();
    const attributionsFunctions = layers.map(layer => {
      if (layer.getVisible())
        return layer.getSource().getAttributions();
    });
    const attributionHTMLs = [];
    attributionsFunctions.forEach(f => {
      if (f) { // check is needed because layers without attribution return null. And if layer is not visible returned value of the map is undefined.
        const attributionsList = f();
        attributionsList.forEach(att => attributionHTMLs.push(att));
      }
    });

    const replacedAttributions = attributionHTMLs.map(a => {
      // enkel lösning för att slippa anchor tag med länk till OSM
      if (a.indexOf('OpenStreetMap') > 0)
        return '© OpenStreetMap';
      else
        return a.replace('&copy', '©');
    });
    return replacedAttributions.join(' ');
  }

  function getScaleInfo() {
    const el = document.getElementsByClassName('ol-scale-line-inner')[0];
    const widthStr = el.style.width;
    const widthNumber = parseInt(widthStr, 10);

    return {
      innerHTML: el.innerHTML,
      width: widthNumber
    };
  }

  /**
 * Using canvas.msToBlob() is much easier but it always turns a blob to a png.
 * This polyfill is needed if we want to choose format other than png.
 */
  (function runPolyfills() {
    if (!HTMLCanvasElement.prototype.toBlob) {
      Object.defineProperty(HTMLCanvasElement.prototype, 'toBlob', {
        value: function (callback, type, quality) {
          var dataURL = this.toDataURL(type, quality).split(',')[1];
          setTimeout(function () {
            var binStr = atob(dataURL),
              len = binStr.length,
              arr = new Uint8Array(len);

            for (var i = 0; i < len; i++) {
              arr[i] = binStr.charCodeAt(i);
            }
            callback(new Blob([arr], { type: type || 'image/png' }));
          });
        }
      });
    }
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
  })();

  function createFormatsContainer(options) {
    const el = `
      <div id="${options.id}" class="folded">
        <span id="o-export-format-png" class="o-export-format"> PNG </span>
        <span id="o-export-format-jpg" class="o-export-format"> JPG </span>
      </div>`;
    return el;
  }

  let fc;
  let formatsContainerVisible = false;

  function toggleFormatContainter() {
    if (formatsContainerVisible) {
      setTimeout(() => {
        fc.classList.add('folded');
        fc.classList.remove('unfolded');
        formatsContainerVisible = false;
      }, 50);
    } else {
      setTimeout(() => {
        fc.classList.add('unfolded');
        fc.classList.remove('folded');
        formatsContainerVisible = true;
      }, 50);
    }
  }

  function createFormatSelector(id) {
    if (alreadyDrawn) {
      toggleFormatContainter();
      return;
    }

    const formatsContainerId = 'o-select-format-button';
    const el = document.getElementById(id).parentElement;
    const formatsContainerString = createFormatsContainer({
      id: formatsContainerId,
    });
    const formatsContainerElement = dom.html(formatsContainerString)
    //to support IE otherwise el.after(formatsContainerElement) would work perfectly.
    el.parentNode.insertBefore(formatsContainerElement, el.nextSibling);
    el.appendChild(formatsContainerElement);
    // dom.html method used above doesn't create a real element. To be able to use classList we need to use getElementBtId
    fc = document.getElementById(formatsContainerId);
    setTimeout(() => {
      fc.classList.add('unfolded');
      fc.classList.remove('folded');
    }, 100);
    
    const pngButton = document.getElementById('o-export-format-png');
    const jpgButton = document.getElementById('o-export-format-jpg');

    pngButton.addEventListener('click', (e) => {
      download('image/png');
      menuItem.close();
      toggleFormatContainter();
      e.stopPropagation();
    });
    jpgButton.addEventListener('click', (e) => {
      download('image/jpg');
      menuItem.close();
      toggleFormatContainter();
      e.stopPropagation();
    });
    
    alreadyDrawn = true;
    formatsContainerVisible = true;
  }

  const component = Component({
    name: 'exportmap',
    onAdd(evt) {
      viewer = evt.target;
      map = viewer.getMap();
      mapMenu = viewer.getControlByName('mapmenu');
      menuItem = mapMenu.MenuItem({
        click() {
          createFormatSelector(this.getId());
        },
        icon,
        title: buttonText
      });
      this.addComponent(menuItem);
      this.render();
    },
    render() {
      mapMenu.appendMenuItem(menuItem);
      this.dispatch('render'); // this triggers menuItem.onRender()
    }
  });
  return component;
};

export default Exportmap;