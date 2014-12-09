/**
 * Created by schernikov on 11/15/14.
 */

function initGL(canvas) {
    try {
        var rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        var gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    return gl;
}

function createBuffer(gl, type, array, size, count) {
    var buf = gl.createBuffer();
    gl.bindBuffer(type, buf);
    gl.bufferData(type, array, gl.STATIC_DRAW);
    buf.itemSize = count;
    buf.numItems = size / count;
    return buf;
}

function createABuffer(gl, array, count) {
    return createBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(array), array.length, count);
}

function createEBuffer(gl, array, count) {
    return createBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(array), array.length, count);
}

function scaleMat(radius) {
    var modMat = mat4.create();
    mat4.scale(modMat, modMat, [radius, radius, radius]);
    return modMat;
}

function getUserValues(pref, names) {
    return _.map(names, function (name) {
        return parseFloat(document.getElementById(pref+name).value);
    });
}

function vertexPointer(gl, attr, buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(attr, buf.itemSize, gl.FLOAT, false, 0, 0);
}

function drawScene(gl) {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

function genObjects() {
    var earth = new Planet(earth_rad, ['images/earth.jpg', 'images/night.jpg']);
    var measure = new Measure(angleTicksConf);
    var orbit = new Measure(orbTicksConf);
    var sun = new Sun('images/star.png');
    return {list: [earth, measure, orbit, sun], sun: sun, earth: earth, measure: measure};
}

function webGLStart() {
    var canvas = document.getElementById("canvas");
    var gl = initGL(canvas);

    var objects = genObjects();

    var turnAngle = 0;
    var perspectiveMat = mat4.create();
    var cameraMat = mat4.create();
    var worldMat = mat4.create();
    var observerMat = mat4.create();
    //TODO react on viewport dimentions changes
    mat4.perspective(perspectiveMat, persp_angle, gl.viewportWidth / gl.viewportHeight, persp_near, persp_far);

    mat4.translate(cameraMat, cameraMat, [0, 0, -4*earth_rad]);

    function updateObjects(world) {
        mat4.multiply(observerMat, cameraMat, world);

        _.each(objects.list, function (obj) {
            obj.transform(perspectiveMat, observerMat, objects);
        });
    }

    function turnEarth(angle) {
        objects.earth.rotate(perspectiveMat, observerMat, angle);
        objects.measure.rotate(perspectiveMat, observerMat, angle);
    }

    updateObjects(worldMat);

    var motion = new Motion(function (dX, dY, lock) {
        if (lock) {
            //mat4.rotateY(worldMat, worldMat, degToRad(dX / 10));
            turnAngle += dX / 10;
            turnEarth(turnAngle);
        } else {
            var diffMat = mat4.create();
            mat4.rotateY(diffMat, diffMat, degToRad(dX / 10));
            mat4.rotateX(diffMat, diffMat, degToRad(dY / 10));

            mat4.multiply(worldMat, diffMat, worldMat);

            updateObjects(worldMat);
        }
    }, function () {
        drawScene(gl);

        _.each(objects.list, function (obj) {
            obj.draw(gl);
        });
    });
    function updater () {
        motion.moveIt();
    }
    _.each(objects.list, function (obj) {
        obj.textures(gl, updater);
    });

    canvas.onmousedown = motion.handleMouseDown;
    document.onmouseup = motion.handleMouseUp;
    document.onmousemove = motion.handleMouseMove;

    motion.moveIt();

    function rotate(speed) {
        var angle = 0;
        setInterval(function () {
            angle += speed;
            turnEarth(angle);

            motion.moveIt();
        }, 30);
    }
    //rotate(0.3);
}

$( document ).ready(webGLStart);
