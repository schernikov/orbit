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

    gl.useProgram(shaderProgram);

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

function initTexture(gl, motion, name) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    /* init with fake one-pixel texture to make it happy before main image is loaded */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    tex.image = new Image();
    tex.image.onload = function () {
        handleLoadedTexture(gl, tex);
        motion.moveIt();
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

function Planet(radius) {
    var self = this;

    var sphere = createSphere();

    var normalBuf, texBuf, posBuf, indexBuf;

    /* normals are the same as positions as long as sphere radius is 1 */
    self.push_buffers = function (gl) {
        normalBuf = createABuffer(gl, sphere.positions, 3);
        texBuf = createABuffer(gl, sphere.texMap, 2);
        posBuf = createABuffer(gl, sphere.positions, 3);
        indexBuf = createEBuffer(gl, sphere.indices, 1);
    };

    var modMat = mat4.create();
    mat4.scale(modMat, modMat, [radius, radius, radius]);

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

    self.draw = function (gl, shader, dayTexture, nightTexture) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, dayTexture);
        gl.uniform1i(shader.daySamplerUniform, 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, nightTexture);
        gl.uniform1i(shader.nightSamplerUniform, 1);

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

function drawScene(gl, shaderProgram) {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var lighting = document.getElementById("lighting").checked?1:0;
    gl.uniform1i(shaderProgram.useLightingUniform, lighting);
    if (lighting) {
        gl.uniform1f(shaderProgram.ambientLevelUniform, ambient);

        var lightingDirection = getUserValues('lightDirection', ['X', 'Y', 'Z']);
        var adjustedLD = vec3.normalize(vec3.create(), lightingDirection);
        vec3.scale(adjustedLD, adjustedLD, -1);
        gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

        gl.uniform3fv(shaderProgram.directionalColorUniform, sun_hue);
    }
}

function webGLStart() {
    var dayTexture;
    var nightTexture;

    var canvas = document.getElementById("canvas");
    var gl = initGL(canvas);

    var prog = initShaders(gl);

    var earth = new Planet(earth_rad);

    earth.push_buffers(gl);

    var perspectiveMat = mat4.create();
    var worldMat = mat4.create();
    //TODO react on viewport dimentions changes
    mat4.perspective(perspectiveMat, 45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0);

    mat4.translate(worldMat, worldMat, [0, 0, -4*earth_rad]);

    earth.transform(perspectiveMat, worldMat);

    var motion = new Motion(function () {
        drawScene(gl, prog);
        earth.draw(gl, prog, dayTexture, nightTexture);
    }, function (dX, dY) {
        //TODO rotate the world, not models
        earth.rotate(dX, dY);

        earth.transform(perspectiveMat, worldMat);
    });

    dayTexture = initTexture(gl, motion, 'images/earth.jpg');
    nightTexture = initTexture(gl, motion, 'images/night.jpg');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    canvas.onmousedown = motion.handleMouseDown;
    document.onmouseup = motion.handleMouseUp;
    document.onmousemove = motion.handleMouseMove;

    motion.moveIt();
}

$( document ).ready(webGLStart);
