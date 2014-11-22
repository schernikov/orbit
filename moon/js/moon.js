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
    return gl;
}

function initShaders(gl) {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
    gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

    shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
    gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    shaderProgram.daySamplerUniform = gl.getUniformLocation(shaderProgram, "uDaySampler");
    shaderProgram.nightSamplerUniform = gl.getUniformLocation(shaderProgram, "uNightSampler");
    shaderProgram.useLightingUniform = gl.getUniformLocation(shaderProgram, "uUseLighting");
    shaderProgram.ambientLevelUniform = gl.getUniformLocation(shaderProgram, "uAmbientLevel");
    shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
    shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");

    return shaderProgram;
}


function handleLoadedTexture(gl, texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);
}

function initTexture(gl, on_update, name) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    /* init with fake one-pixel texture to make it happy before main image is loaded */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    tex.image = new Image();
    tex.image.onload = function () {
        handleLoadedTexture(gl, tex);
        on_update();
    };

    tex.image.src = name;
    return tex;
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

function addPoint(points, point, p, mat) {
    vec3.transformMat4(point, p, mat);
    points.push(point[0], point[1], point[2]);
}

function generateTicks() {
    var aspect = 0.6;  /* width to height ratio */
    var longitudeBands = 72;
    var step = Math.round(360/longitudeBands);
    var tickWidth = Math.sin(degToRad(0.3*step)); // degrees for each 1 degree tick


    var w = tickWidth/2;
    var h = tickWidth/aspect/2;

    var point = vec3.create();
    var tickMat = mat4.create();

    mat4.translate(tickMat, tickMat, [0, 0, 1]);

    var positions = [];
    var p1 = [-w, 0, -h];
    var p2 = [-w, 0,  h];
    var p3 = [ w, 0,  h];
    var p4 = [ w, 0, -h];
    _.each(_.range(longitudeBands), function (long) {
        var finalMat = mat4.create();
        mat4.rotateY(finalMat, finalMat, degToRad(long*step));
        mat4.multiply(finalMat, finalMat, tickMat);
        /* first triangle */
        addPoint(positions, point, p1, finalMat);
        addPoint(positions, point, p2, finalMat);
        addPoint(positions, point, p3, finalMat);
        /* second triangle */
        addPoint(positions, point, p1, finalMat);
        addPoint(positions, point, p3, finalMat);
        addPoint(positions, point, p4, finalMat);
    });
    return positions;
}

function measShaders(gl) {
    var fragmentShader = getShader(gl, "meas-fs");
    var vertexShader = getShader(gl, "meas-vs");

    var shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert("Could not initialise shaders");
    }

    shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

    shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    shaderProgram.uColor = gl.getUniformLocation(shaderProgram, "uColor");

    return shaderProgram;
}

function Measure(radius) {
    var self = this;

    var ticks = generateTicks();

    var posBuf;

    var movMat = mat4.create();
    var worldMat = mat4.create();
    var finalMat = mat4.create();

    mat4.multiply(movMat, movMat, scaleMat(radius));

    self.textures = function (gl) {
        posBuf = createABuffer(gl, ticks, 3);
    };

    self.rotate = function (deltaX, deltaY) {

    };

    self.transform = function (camMap, world) {
        mat4.multiply(worldMat, world, movMat);
        mat4.multiply(finalMat, camMap, worldMat);
    };

    self.draw = function (gl, shader) {
        gl.useProgram(shader);

        vertexPointer(gl, shader.vertexPositionAttribute, posBuf);

        gl.uniformMatrix4fv(shader.pMatrixUniform, false, finalMat);
        gl.uniform4fv(shader.uColor, meas_color);

        gl.drawArrays(gl.TRIANGLES, 0, posBuf.numItems);
    };
}

function scaleMat(radius) {
    var modMat = mat4.create();
    mat4.scale(modMat, modMat, [radius, radius, radius]);
    return modMat;
}

function Planet(radius) {
    var self = this;

    var sphere = createSphere();
    var texs;
    var normalBuf, texBuf, posBuf, indexBuf;

    /* normals are the same as positions as long as sphere radius is 1 */
    self.textures = function (gl, names, unifs, on_update) {
        normalBuf = createABuffer(gl, sphere.positions, 3);
        texBuf = createABuffer(gl, sphere.texMap, 2);
        posBuf = createABuffer(gl, sphere.positions, 3);
        indexBuf = createEBuffer(gl, sphere.indices, 1);

        texs = _.map(names, function (name, idx) {
            return {texture : initTexture(gl, on_update, name), field: unifs[idx]};
        });
    };

    var modMat = scaleMat(radius);

    var rotMat = mat4.create();
    var movMat = mat4.create();
    var normalMat = mat3.create();
    var worldMat = mat4.create();
    var finalMat = mat4.create();

    mat4.multiply(movMat, movMat, modMat);

    self.rotate = function (deltaX, deltaY) {
        var diffMat = mat4.create();
        mat4.rotateY(diffMat, diffMat, degToRad(deltaX / 10));
        mat4.rotateX(diffMat, diffMat, degToRad(deltaY / 10));

        mat4.multiply(rotMat, diffMat, rotMat);
        //TODO if model is rotated only then rotMat is not needed.
        // Need to have modMap only in case if there are other transforms
        mat4.multiply(movMat, rotMat, modMat);
    };

    self.transform = function (camMap, world) {
        mat4.multiply(worldMat, world, movMat);
        mat3.normalFromMat4(normalMat, worldMat);
        mat4.multiply(finalMat, camMap, worldMat);
    };

    self.draw = function (gl, shader) {
        gl.useProgram(shader);

        var lighting = document.getElementById("lighting").checked?1:0;
        gl.uniform1i(shader.useLightingUniform, lighting);
        if (lighting) {
            gl.uniform1f(shader.ambientLevelUniform, ambient);

            var lightingDirection = getUserValues('lightDirection', ['X', 'Y', 'Z']);
            var adjustedLD = vec3.normalize(vec3.create(), lightingDirection);
            vec3.scale(adjustedLD, adjustedLD, -1);
            gl.uniform3fv(shader.lightingDirectionUniform, adjustedLD);

            gl.uniform3fv(shader.directionalColorUniform, sun_hue);
        }

        _.each(texs, function (tex, idx) {
            gl.activeTexture(gl['TEXTURE'+idx]);
            gl.bindTexture(gl.TEXTURE_2D, tex.texture);
            gl.uniform1i(tex.field, idx);
        });
        vertexPointer(gl, shader.vertexPositionAttribute, posBuf);
        vertexPointer(gl, shader.textureCoordAttribute, texBuf);
        vertexPointer(gl, shader.vertexNormalAttribute, normalBuf);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);

        gl.uniformMatrix4fv(shader.pMatrixUniform, false, finalMat);
        gl.uniformMatrix4fv(shader.mvMatrixUniform, false, worldMat);
        gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMat);

        gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
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

function webGLStart() {
    var canvas = document.getElementById("canvas");
    var gl = initGL(canvas);

    var prog = initShaders(gl);
    var m_prog = measShaders(gl);

    var earth = new Planet(earth_rad);

    var measure = new Measure(meas_rad);

    var perspectiveMat = mat4.create();
    var cameraMat = mat4.create();
    var worldMat = mat4.create();
    var observerMat = mat4.create();
    //TODO react on viewport dimentions changes
    mat4.perspective(perspectiveMat, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    mat4.translate(cameraMat, cameraMat, [0, 0, -4*earth_rad]);

    mat4.multiply(observerMat, perspectiveMat, cameraMat);

    earth.transform(observerMat, worldMat);
    measure.transform(observerMat, worldMat);

    var motion = new Motion(function (dX, dY, lock) {
        //earth.rotate(dX, dY);

        var diffMat = mat4.create();
        mat4.rotateY(diffMat, diffMat, degToRad(dX / 10));
        mat4.rotateX(diffMat, diffMat, degToRad(dY / 10));

        if (lock) {
            mat4.rotateY(worldMat, worldMat, degToRad(dX / 10));
            //mat4.multiply(worldMat, diffMat, worldMat);
        } else {
            mat4.multiply(worldMat, diffMat, worldMat);
        }

        earth.transform(observerMat, worldMat);
        measure.transform(observerMat, worldMat);
    }, function () {
        drawScene(gl);

        earth.draw(gl, prog);
        measure.draw(gl, m_prog);
    });

    earth.textures(gl, ['images/earth.jpg', 'images/night.jpg'], [prog.daySamplerUniform, prog.nightSamplerUniform], function () {
        motion.moveIt();
    });
    measure.textures(gl);

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    canvas.onmousedown = motion.handleMouseDown;
    document.onmouseup = motion.handleMouseUp;
    document.onmousemove = motion.handleMouseMove;

    motion.moveIt();
}

$( document ).ready(webGLStart);
