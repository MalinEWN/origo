import download from 'downloadjs';
import replacer from '../src/utils/replacer';


export function simpleExportHandler(simpleExportUrl, activeLayer, selectedItems) {
    if (!simpleExportUrl) {
        alert('Export URL is not specified.');
        return;
    }
    // console.log('simple Exporting layer ' + activeLayer.get('name'));

    /* if (activeLayer.get('type') === 'GROUP') {
        const subLayers = activeLayer.getLayers().getArray();
        const subLayersNames = subLayers.map(l => l.get('name'));
        console.log(subLayersNames);
    } */

    const features = {};
    selectedItems.forEach(item => {
        const layerName = item.getLayer().get('name');
        if (!features[layerName]) {
            features[layerName] = [];
        }
        const obj = item.getFeature().getProperties();
        if (obj.geom) delete obj.geom;
        features[layerName].push(obj);
    });

    return fetch(simpleExportUrl, {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(features), // data can be `string` or {object}!
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status !== 200) {
                throw response.statusText;
                // return Promise.reject(response.statusText);
            }
            return response.blob();
        })
        .then(blob => {
            download(blob, 'ExportedFeatures.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        })
        .catch(err => {
            console.log(err);
            throw err;
            // return Promise.reject(err);
        });
}

export function layerSpecificExportHandler(url, activeLayer, selectedItems, attributesToSendToExport) {
    if (!url) {
        alert('Export URL is not specified.');
        return;
    }
    // let replacedUrl;
    const features = {};
    selectedItems.forEach(item => {
        const layerName = item.getLayer().get('name');
        if (!features[layerName]) {
            features[layerName] = [];
        }
        const properties = item.getFeature().getProperties();
        // replacedUrl = replacer.replace(url, properties);
        let obj = {};
        if (attributesToSendToExport) {
            attributesToSendToExport.forEach(att => {
                if (att in properties) {
                    obj[att] = properties[att];
                }
            });
        } else {
            obj = properties;
        }
        if (obj.geom) delete obj.geom;
        features[layerName].push(obj);
    });

    return fetch(url, {
        method: 'POST', // or 'PUT'
        body: JSON.stringify(features), // data can be `string` or {object}!
        headers: {
            'Content-Type': 'application/json'
        }
    })
        .then(response => {
            if (response.status !== 200) { // fmeserver  response status check!
                throw "fmeserver failed"
            }
            const contentType = response.headers.get('content-type');
            switch (contentType) {
                
                case 'application/json;charset=UTF-8':
                    response.json()
                    .then(json => {
                        let urlZip = json.serviceResponse.url.replace("http://si-sbkgeoapp01:8080", "https://gisapp.sigtuna.se");
                        download(urlZip);
                    });
                    break;

                case 'application/vnd.ms-excel':
                    response.blob()
                    .then(blob => {
                        download(blob, 'data_siggis.xlsx', contentType);
                    });
                    break;

                case 'application/octet-stream':
                    response.blob()
                    .then(blob => {
                        download(blob, 'data_siggis.docx', contentType);
                    });
                    break;

                case 'application/pdf':
                    response.blob()
                    .then(blob => {
                        download(blob, 'data_siggis.pdf', contentType);
                    });
                    break;
            }
        })
        .catch(err => {
            console.log(err);
            throw err;
            // return Promise.reject(err);
        });
}
