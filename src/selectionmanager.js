
import infowindow_overlay from './infowindow_overlay';
import infowindow_sidebar from './infowindow_sidebar';

let isOverlay;

function init(options) {
    console.log('initiating selection manager');
    isOverlay = Object.prototype.hasOwnProperty.call(options, 'overlay') ? options.overlay : true;
    console.log(isOverlay);
   if (isOverlay) {
       infowindow_overlay.init();
   } else {
       infowindow_sidebar.init();
   }
}

export default {
    init
}