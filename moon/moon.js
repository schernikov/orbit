/**
 * Created by schernikov on 11/15/14.
 */

var gl;

function initGL(canvas) {
    try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
        gl.viewportWidth = canvas.width;
        gl.viewportHeight = canvas.height;
    } catch (e) {
    }
    if (!gl) {
        alert("Could not initialise WebGL, sorry :-(");
    }
}

var shaderProgram;

function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");

    shaderProgram = gl.createProgram();
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
    shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
    shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
    shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
}


function handleLoadedTexture(texture) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);

    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);

    gl.bindTexture(gl.TEXTURE_2D, null);
}


var dayTexture;
var nightTexture;

function initTexture(name) {
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    /* init with fake one-pixel texture to make it happy before main image is loaded */
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    tex.image = new Image();
    tex.image.onload = function () {
        handleLoadedTexture(tex);
        motion.moveIt();
    };

    tex.image.src = name;
    return tex;
}


var mvMatrix = mat4.create();
var mvMatrixStack = [];
var pMatrix = mat4.create();

function mvPushMatrix() {
    var copy = mat4.create();
    mat4.set(mvMatrix, copy);
    mvMatrixStack.push(copy);
}

function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
        throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms() {
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);

    var normalMatrix = mat3.create();
    mat4.toInverseMat3(mvMatrix, normalMatrix);
    mat3.transpose(normalMatrix);
    gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}

var moonRotationMatrix = mat4.create();
mat4.identity(moonRotationMatrix);

var moonVertexPositionBuffer;
var moonVertexNormalBuffer;
var moonVertexTextureCoordBuffer;
var moonVertexIndexBuffer;

function createBuffer(type, array, size, count) {
    var buf = gl.createBuffer();
    gl.bindBuffer(type, buf);
    gl.bufferData(type, array, gl.STATIC_DRAW);
    buf.itemSize = count;
    buf.numItems = size / count;
    return buf;
}

function createABuffer(array, count) {
    return createBuffer(gl.ARRAY_BUFFER, new Float32Array(array), array.length, count);
}

function createEBuffer(array, count) {
    return createBuffer(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(array), array.length, count);
}

function initBuffers() {
    var latitudeBands = 30;
    var longitudeBands = 30;
    var radius = 2;

    var vertexPositionData = [];
    var normalData = [];
    var textureCoordData = [];
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);

            normalData.push(x, y, z);
            textureCoordData.push(u, v);
            vertexPositionData.push(radius * x, radius * y, radius * z);
        }
    }

    var indexData = [];
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            indexData.push(first, second, first + 1);
            indexData.push(second, second + 1, first + 1);
        }
    }


    moonVertexNormalBuffer = createABuffer(normalData, 3);
    moonVertexTextureCoordBuffer = createABuffer(textureCoordData, 2);
    moonVertexPositionBuffer = createABuffer(vertexPositionData, 3);

    moonVertexIndexBuffer = createEBuffer(indexData, 1);
}

function getUserValues(pref, names) {
    return _.map(names, function (name) {
        return parseFloat(document.getElementById(pref+name).value);
    });
}

function vertexPointer(attr, buf) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.vertexAttribPointer(attr, buf.itemSize, gl.FLOAT, false, 0, 0);
}

function drawScene() {
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);

    var lighting = document.getElementById("lighting").checked;
    gl.uniform1i(shaderProgram.useLightingUniform, lighting);
    if (lighting) {
        var ambient = getUserValues('ambient', ['R', 'G', 'B']);
        gl.uniform3fv(shaderProgram.ambientColorUniform, ambient);

        var lightingDirection = getUserValues('lightDirection', ['X', 'Y', 'Z']);
        var adjustedLD = vec3.create();
        vec3.normalize(lightingDirection, adjustedLD);
        vec3.scale(adjustedLD, -1);
        gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLD);

        var directional = getUserValues('directional', ['R', 'G', 'B']);
        gl.uniform3fv(shaderProgram.directionalColorUniform, directional);
    }

    mat4.identity(mvMatrix);

    mat4.translate(mvMatrix, [0, 0, -6]);

    mat4.multiply(mvMatrix, moonRotationMatrix);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, dayTexture);
    gl.uniform1i(shaderProgram.daySamplerUniform, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, nightTexture);
    gl.uniform1i(shaderProgram.nightSamplerUniform, 1);

    vertexPointer(shaderProgram.vertexPositionAttribute, moonVertexPositionBuffer);
    vertexPointer(shaderProgram.textureCoordAttribute, moonVertexTextureCoordBuffer);
    vertexPointer(shaderProgram.vertexNormalAttribute, moonVertexNormalBuffer);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, moonVertexIndexBuffer);
    setMatrixUniforms();
    gl.drawElements(gl.TRIANGLES, moonVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
}

function webGLStart() {
    var canvas = document.getElementById("lesson11-canvas");
    initGL(canvas);
    initShaders();
    initBuffers();
    dayTexture = initTexture('images/earth.jpg');
    nightTexture = initTexture('images/night.jpg');

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    canvas.onmousedown = motion.handleMouseDown;
    document.onmouseup = motion.handleMouseUp;
    document.onmousemove = motion.handleMouseMove;

    motion.moveIt();
}

