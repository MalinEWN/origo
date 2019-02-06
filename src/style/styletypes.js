import pin from './pin';
import measure from './measure';
import selection from './selection';

export default function () {
  const styleTypes = {};

  styleTypes.pin = pin;
  styleTypes.measure = measure;
  styleTypes.selection = selection;

  return {
    getStyle: function getStyle(type) {
      if (type) {
        return styleTypes[type];
      }
      console.log(`${type} is not a default style`)
      return false;
    }
  };
}
