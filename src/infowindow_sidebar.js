import $ from 'jquery';
import selectionManager from './selectionmanager';

let urvalContainer;
let listContainer;
let sublists;
let urvalElements;
let expandableContents;

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
    const closeButtonSvg = createSvgElement('fa-window-close', 'closebutton-svg');
    closeButtonSvg.addEventListener('click', (e) => selectionManager.clearSelection());
    urvalContainer.appendChild(closeButtonSvg);


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

    urvalContainer.appendChild(urvalElement);
    urvalElements.set(layerName, urvalElement);

    urvalElement.addEventListener('click', (e) => {
        showSelectedList(layerName);
    });

    const sublistContainter = document.createElement('div');
    sublists.set(layerName, sublistContainter);
}

function showSelectedList(layerName) {
    while (listContainer.firstChild) {
        listContainer.removeChild(listContainer.firstChild);
    }

    const sublistToAppend = sublists.get(layerName);
    listContainer.appendChild(sublistToAppend);

    urvalElements.forEach((value, key, map) => {
        if (key === layerName) {
            value.classList.add('selectedurvalelement');
        } else {
            value.classList.remove('selectedurvalelement');
        }
    });
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

    if (items.length > 2) {

        const rightArrowSvg = createSvgElement('fa-chevron-right', 'expandlistelement-svg');

        listElementContentContainer.appendChild(rightArrowSvg);
        listElementContentContainer.setAttribute('expanded', 'false');

        const foldedItems = [];
        for (let i = 2; i < items.length; i++) {
            const item = items[i];
            item.classList.add('folded');
            foldedItems.push(item);
        }

        listElementContentContainer.addEventListener('click', (e) => {

            if (e.target.tagName.toUpperCase() === "A") return;

            const isExpanded = listElementContentContainer.getAttribute('expanded');
            if (isExpanded === 'true') {
                rightArrowSvg.classList.remove('rotated');
                listElementContentContainer.setAttribute('expanded', 'false');
                foldedItems.forEach(item => {
                    item.classList.add('folded');
                    item.classList.remove('unfolded');
                });

            } else {
                rightArrowSvg.classList.add('rotated');
                listElementContentContainer.setAttribute('expanded', 'true');
                foldedItems.forEach(item => {
                    item.classList.add('unfolded');
                    item.classList.remove('folded');
                });
                selectionManager.highlightFeatureById(elementId);
            }
        });

        listElementContentContainer.expand = function () {
            const isExpanded = listElementContentContainer.getAttribute('expanded');
            if (isExpanded === 'false') {
                rightArrowSvg.classList.add('rotated');
                listElementContentContainer.setAttribute('expanded', 'true');
                foldedItems.forEach(item => {
                    item.classList.add('unfolded');
                    item.classList.remove('folded');
                });
            }
        };

        expandableContents.set(elementId, listElementContentContainer);

    } else {

        listElementContentContainer.addEventListener('click', (e) => {

            if (e.target.tagName.toUpperCase() === "A") return;
            selectionManager.highlightFeatureById(elementId);
        });
    }
}

function expandListElement(featureId) {
    // This method expands the element even if it is not in the active list.
    const element = expandableContents.get(featureId);
    if (element) {
        element.expand();
    }

    /*
    This method works as well, but it olny expands an element of an active list (elements that are appended and exist in the DOM)
    const element = document.getElementById(featureId);
    if (element) {
        const listElementContentContainer = element.getElementsByClassName('listelement-content-container')[0];
        if (listElementContentContainer.expand) {
            listElementContentContainer.expand();
        }
    }
    */
}

function showUrvalElement(layerName) {
    const urvalElement = urvalElements.get(layerName);
    urvalElement.classList.remove('hidden');
}

function removeListElement(item) {
    const sublist = sublists.get(item.getLayer().get('name'));

    // This loop is needed because when clear() is called it will try to remove ALL elements, but elements 
    // for not-selected list are already removed, thus the element found by id becomes null if document.getElementById was used.
    // Also when removing an item by ctrl + click, the item might not be in the active list, but still nerds to be removed.
    // obs! getElementById works only on document and not on the element.
    let listElement;
    for (let i = 0; i < sublist.children.length; i++) {
        if (sublist.children[i].id === item.getId()) {
            listElement = sublist.children[i];
        }
    }

    if (listElement)
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

function hideInfowondow() {
    const infowindow = document.getElementsByClassName('sidebarcontainer');
    infowindow[0].classList.add('hidden');
}

function showInfowindow() {
    const infowindow = document.getElementsByClassName('sidebarcontainer');
    infowindow[0].classList.remove('hidden');
}

function init() {

    // runPollyfill();
    sublists = new Map();
    urvalElements = new Map();
    expandableContents = new Map();

    console.log('initiating infowindow_sidebar');
    render();

    return {
        createListElement: createListElement,
        removeListElement: removeListElement,
        expandListElement: expandListElement,
        createUrvalElement: createUrvalElement,
        hideUrvalElement: hideUrvalElement,
        updateUrvalElementText: updateUrvalElementText,
        showSelectedList: showSelectedList,
        hide: hideInfowondow,
        show: showInfowindow,
    };
}

export default {
    init
}