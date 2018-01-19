/**
 * For operating user controls
 */
"use strict";
window._Controls = function (el) {
  console.log(el);
  // The display context
  let ctx = el.getContext("2d");
  
  let g = document.getElementsByTagName('body')[0];
  el.setAttribute('width', window.innerWidth || el.clientWidth || g.clientWidth + 'px');
  el.setAttribute('height', window.innerHeight|| el.clientHeight|| g.clientHeight + 'px');

  // Records the current touch profile
  let ongoingTouches = [];

  // records the current tilt profile
  let tilt = null;

  // The socket transporter
  let socket = io.connect('/controls');

  // touch copier
  let copyTouch = touch => {
    console.log("copy Touch", touch)
    return {identifier: touch.identifier ? touch.identifier : touch.which, pageX: touch.pageX, pageY: touch.pageY};
  };

  // Assign a color to each touch
  let colorForTouch = touch => !touch || isNaN(touch.identifier) ? '#000' : '#' +
    (touch.identifier % 16).toString(16) +
    (Math.floor(touch.identifier / 3) % 16).toString(16) + 
    (Math.floor(touch.identifier / 7) % 16).toString(16);

  // Draw a touch event
  let DrawTouch = touch => {
    ctx.beginPath();
    ctx.arc(touch.pageX, touch.pageY, 4, 0, 2 * Math.PI, false);  // a circle at the start
    ctx.fillStyle = colorForTouch(touch);
    ctx.fill();
  };

  let ongoingTouchIndexById = (idToFind)  => {
    for (let i = 0; i < ongoingTouches.length; i++) {
      if (ongoingTouches[i].identifier == idToFind) {
        return i;
      }
    }
    return -1;    // not found
  };

  const SendTouches = data => {
    let g = document.getElementsByTagName('body')[0];
    socket.emit('control', Object.assign({}, data, {
      touches: ongoingTouches,
      screen: {
        width: window.innerWidth || el.clientWidth || g.clientWidth,
        height: window.innerHeight|| el.clientHeight|| g.clientHeight
      }
    }));
  };

  let listeners = {
    touchstart: evt => {
      console.log("touchstart ", evt);
      //evt.preventDefault();
      let touches = evt.changedTouches;
      // Debug the touches
      touches.forEach(touch => {
        console.log("touch start: ", touch);
        ongoingTouches.push(copyTouch(touch));
        DrawTouch(touch);
      });

      SendTouches();
    },

    touchend: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;

      touches.forEach(touch => {
        let idx = ongoingTouchIndexById(touch.identifier);
        if (idx >= 0) {
          ongoingTouches.splice(idx, 1);  // remove it; we're done
        } else {
          log("can't figure out which touch to end");
        }
      });

      SendTouches();
    },

    touchcancel: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      touches.forEach(touch => ongoingTouches.splice(ongoingTouchIndexById(touch.identifier), 1));
      SendTouches();
    },

    touchmove: evt => {
      evt.preventDefault();
      let touches = evt.changedTouches;
      touches.forEach(touch => {
        let idx = ongoingTouchIndexById(touch.identifier);
        if (idx >= 0)
          // swap in the new touch record
          ongoingTouches.splice(idx, 1, copyTouch(touch));
        else
          log("can't figure out which touch to continue");
      });
      SendTouches({touches3: touches});
    },

    mousedown: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      console.log("mousedown", touch);
      ongoingTouches.push(touch)
      DrawTouch(touch)
      SendTouches();
    },

    mouseup: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      let idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1);  // remove it; we're done
      } else {
        console.log("can't figure out which touch to end");
      }
      SendTouches();
    },

    mousemove: evt => {
      evt.preventDefault();
      let touch = copyTouch(evt);
      let idx = ongoingTouchIndexById(touch.identifier);
      if (idx >= 0) {
        ongoingTouches.splice(idx, 1, touch);  // remove it; we're done
      } else {
        console.log("can't figure out which mouse to continue");
      }
      SendTouches();
    }
  };

  socket
    .on('event', data => console.log('player event data: ', data));

  // monitor for all touch events and record them to the touches array
  el.addEventListener('touchstart', listeners.touchstart);
  el.addEventListener('touchend', listeners.touchend, false);
  el.addEventListener('touchcancel', listeners.touchcancel, false);
  el.addEventListener('touchmove', listeners.touchmove, false);

  // Monitor for mouse events
  el.addEventListener('mousedown', listeners.mousedown);
  el.addEventListener('mouseup', listeners.mouseup);
  el.addEventListener('mousemove', listeners.mousemove);

  // monitor for all tilt events and record them

  // Send the touches and tilt controls at a 100 ms interval
  // let timer = setInterval(() => socket.emit('control', {touches: ongoingTouches, tilt: tilt}),  500);
};

// Invoke the Controls object with an argument of the DOM element to monitor
_Controls(document.getElementById('body-ctx'));