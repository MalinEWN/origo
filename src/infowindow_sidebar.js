import $ from 'jquery';
import selectionManager from './selectionmanager';

let urvalContainer;
let listContainer;
let sublists;
let urvalElements;

function render() {

    const mainContainer = document.createElement('div');
    mainContainer.classList.add('sidebarcontainer');

    urvalContainer = document.createElement('div');
    urvalContainer.classList.add('urvalcontainer');
    const urvalTextNodeContainer = document.createElement('div');
    urvalTextNodeContainer.classList.add('urval-textnode-container');
    const urvalTextNode = document.createTextNode('Urval');
    urvalTextNodeContainer.appendChild(urvalTextNode);
    urvalContainer.appendChild(urvalTextNodeContainer);

    listContainer = document.createElement('div');
    listContainer.classList.add('listcontainer');

    const exportContainer = document.createElement('div');
    exportContainer.classList.add('exportcontainer');
    // const svg = createSvgElement('fa-file-export', 'export-svg');
    const svg = createSvgElement('fa-caret-square-o-right', 'export-svg');
    exportContainer.appendChild(svg);

    const exportTextNodeContainer = document.createElement('div');
    exportTextNodeContainer.classList.add('export-textnode-container');
    const exportTextNode = document.createTextNode('Exportera urvalet');
    exportTextNodeContainer.appendChild(exportTextNode);
    exportContainer.appendChild(exportTextNodeContainer);
    exportTextNodeContainer.addEventListener('click', (e) => {
        console.log('Exportera Urval');
    });


    mainContainer.appendChild(urvalContainer);
    mainContainer.appendChild(listContainer);
    mainContainer.appendChild(exportContainer);
    const parentElement = document.getElementById('o-map');
    parentElement.appendChild(mainContainer);
}

function createUrvalElement(layerName, layerTitle) {

    const urvalElement = document.createElement('div');
    urvalElement.classList.add('urvalelement');

    const textNode = document.createTextNode(layerTitle);
    urvalElement.appendChild(textNode);

    urvalElement.addEventListener('click', (e) => {

        while (listContainer.firstChild) {
            listContainer.removeChild(listContainer.firstChild);
        }

        const sublistToAppend = sublists.get(layerName);
        listContainer.appendChild(sublistToAppend);

        urvalElements.forEach((value, key, map) => {
            value.classList.remove('selectedurvalelement');
        });
        urvalElement.classList.add('selectedurvalelement');
    });

    urvalContainer.appendChild(urvalElement);
    urvalElements.set(layerName, urvalElement);

    const sublistContainter = document.createElement('div');
    sublists.set(layerName, sublistContainter);
}

function createListElement(item) {
    console.log('creating list item ' + item.getId());

    const listElement = document.createElement('div');
    listElement.classList.add('listelement');
    listElement.id = item.getId();

    const svg = createSvgElement('fa-times-circle', 'removelistelement-svg');

    svg.addEventListener('click', (e) => {
        console.log('removing element');
        // const sublist = sublists.get(item.getLayer().get('name'));
        // sublist.removeChild(listElement);

        // selectionManager.removeItemById();
        selectionManager.removeItem(item);
    });

    listElement.appendChild(svg);

    const listElementContentContainer = document.createElement('div');
    listElementContentContainer.classList.add('listelement-content-container');
    // const textNode = document.createTextNode(item.getId());
    const content = createElementFromHTML(item.getContent()); // Content that is created in getattribute module is a template is supposed to be used with jQuery. without jQuery we cannot append it before it is converted to a proper html element.
    listElementContentContainer.appendChild(content);
    listElement.appendChild(listElementContentContainer);
    
    createExpandableContent(listElementContentContainer, content, item.getId());
    
    const sublist = sublists.get(item.getLayer().get('name'));
    sublist.appendChild(listElement);

    showUrvalElement(item.getLayer().get('name'));
}

function createElementFromHTML(htmlString) {
    var div = document.createElement('div');
    div.innerHTML = htmlString.trim();

    // Change this to div.childNodes to support multiple top-level nodes
    return div.firstChild;
}

function createExpandableContent(listElementContentContainer, content, elementId) {

    const items = content.querySelectorAll('ul > li');
    const ul = content.getElementsByTagName('ul');
    console.log(items.length);

    if (items.length > 2) {

        const rightArrowSvg = createSvgElement('fa-chevron-right', 'expandlistelement-svg');
        const downArrowSvg = createSvgElement('fa-chevron-down', 'foldlistelement-svg');
        
        listElementContentContainer.appendChild(rightArrowSvg);
        listElementContentContainer.addEventListener('click', (e) => {
            listElementContentContainer.removeChild(rightArrowSvg);
            listElementContentContainer.appendChild(downArrowSvg);
        });
    }


    listElementContentContainer.addEventListener('click', (e) => {
        
        if (e.target.tagName.toUpperCase() === "A") return;
        
        console.log('list element clicked!');
        console.log(elementId);
        selectionManager.highlightFeature(elementId);
    });
}

function showUrvalElement(layerName) {
    const urvalElement = urvalElements.get(layerName);
    urvalElement.classList.remove('hidden');
}

function removeListElement(item) {
    const sublist = sublists.get(item.getLayer().get('name'));
    const listElement = document.getElementById(item.getId());
    sublist.removeChild(listElement);
}

function createSvgElement(id, className) {
    const svgContainer = document.createElement('div');
    const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use');

    svgElem.setAttribute('class', className); // this instead of above line to support ie!
    useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
    svgElem.appendChild(useElem);
    svgContainer.appendChild(svgElem);
    svgContainer.classList.add(className + '-container');

    return svgContainer;
}

function hideUrvalElement(layerName) {
    const urvalElement = urvalElements.get(layerName);
    urvalElement.classList.add('hidden');
}

function updateUrvalElementText(layerName, layerTitle, sum) {
    const urvalElement = urvalElements.get(layerName);
    const newNodeValue = `${layerTitle} (${sum})`;
    urvalElement.childNodes[0].nodeValue = newNodeValue;
}

function init() {

    // runPollyfill();
    sublists = new Map();
    urvalElements = new Map();
    console.log('initiating infowindow_sidebar');
    render();

    return {
        createUrvalElement: createUrvalElement,
        createListElement: createListElement,
        removeListElement: removeListElement,
        hideUrvalElement: hideUrvalElement,
        updateUrvalElementText: updateUrvalElementText
    };
}

export default {
    init
}