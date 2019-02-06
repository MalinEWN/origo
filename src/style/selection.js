const blue = [0, 153, 255, 1];
const lightblue = [0, 153, 255, 0.1];

const green = [46, 184, 46, 1];
const lightgreen = [46, 184, 46, 0.1];

const red = [255, 51, 51, 1];
const lightred = [255, 51, 51, 0.1];

const width = 3;

const selection = {

  selected: [{
    fill: {
      color: lightblue
    },
    stroke: {
      color: blue,
      width: width
    },
    circle: {
      radius: 5,
      stroke: {
        color: blue
      },
      fill: {
        color: blue
      }
    }
  }],

  highlighted: [{
    fill: {
      color: lightred
    },
    stroke: {
      color: red,
      width: width
    },
    circle: {
      radius: 5,
      stroke: {
        color: red
      },
      fill: {
        color: red
      }
    }
  }]
};

export default selection;