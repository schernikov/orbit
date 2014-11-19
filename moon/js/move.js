/**
 * Created by schernikov on 11/15/14.
 */

function Motion(onScene, onShift) {
    var self = this;
    var mouseDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    var interval = 1000/60;

    function redraw() {
        requestAnimFrame(onScene);
    }
    var postDraw = _.debounce(redraw, interval*2);
    self.moveIt = _.throttle(function () {
        redraw();
        postDraw(); /* to redraw one more time after last motion */
    }, interval);


    self.handleMouseDown = function (event) {
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    };
    self.handleMouseUp = function () {
        mouseDown = false;
    };
    //TODO need to throttle this as well
    self.handleMouseMove = function (event) {
        if (!mouseDown) {
            return;
        }
        var newX = event.clientX;
        var newY = event.clientY;

        var deltaX = newX - lastMouseX;
        var deltaY = newY - lastMouseY;

        onShift(deltaX, deltaY);

        lastMouseX = newX;
        lastMouseY = newY;

        self.moveIt();
    }

}

