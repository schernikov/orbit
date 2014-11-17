/**
 * Created by schernikov on 11/15/14.
 */

function Motion() {
    var self = this;
    var mouseDown = false;
    var lastMouseX = null;
    var lastMouseY = null;

    var interval = 1000/60;

    function redraw() {
        requestAnimFrame(drawScene);
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
    self.handleMouseUp = function (event) {
        mouseDown = false;
    };
    self.handleMouseMove = function (event) {
        if (!mouseDown) {
            return;
        }
        var newX = event.clientX;
        var newY = event.clientY;

        var deltaX = newX - lastMouseX;
        var newRotationMatrix = mat4.create();

        mat4.rotateY(newRotationMatrix, newRotationMatrix, degToRad(deltaX / 10));

        var deltaY = newY - lastMouseY;
        mat4.rotateX(newRotationMatrix, newRotationMatrix, degToRad(deltaY / 10));

        mat4.multiply(moonRotationMatrix, newRotationMatrix, moonRotationMatrix);

        lastMouseX = newX;
        lastMouseY = newY;

        self.moveIt();
    }

}

var motion = new Motion();
