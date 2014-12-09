/**
 * Created by schernikov on 12/8/14.
 */

function initGL(name) {
    var canvas = document.getElementById(name);

    var gl = WebGLUtils.setupWebGL(canvas);

    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    gl.viewportWidth = canvas.width;
    gl.viewportHeight = canvas.height;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    return gl;
}

function drawScene(gl) {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function particlesStart() {
    var gl = initGL('canvas');

    drawScene(gl);
}

$( document ).ready(particlesStart);