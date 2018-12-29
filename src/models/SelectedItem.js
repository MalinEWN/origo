import { getUid } from "ol";

export default class SelectedItem {
    constructor(feature, layer, content) {
        
        this.feature = feature;
        this.layer = layer;
        this.content = content;
    }

    getId() {
        let id = this.feature.getId().toString();
        if (!id) {
            id = getUid(this.feature);
        }
        return id;
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