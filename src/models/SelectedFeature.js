export class SelectedFeature {
    constructor(feature, layer, content) {
        this.feature = feature;
        this.layer = layer;
        this.content = content;
    }

    getFeature() {
        return this.feature;
    }

    getLayer() {
        return this.layer;
    }

    getContent() {
        return this.layer;
    }

    setFeature(feature) {
        this.feature = feature;
    }

    setLayer(layer) {
        this.layer = layer;
    }

    setContent(content) {
        this.content = content;
    }
}