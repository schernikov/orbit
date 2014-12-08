/**
 * Created by schernikov on 11/15/14.
 */

function getShader(gl, id) {
    var shaderScript = document.getElementById(id);
    if (!shaderScript) {
        return null;
    }

    var str = "";
    var k = shaderScript.firstChild;
    while (k) {
        if (k.nodeType == 3) {
            str += k.textContent;
        }
        k = k.nextSibling;
    }

    var shader;
    if (shaderScript.type == "x-shader/x-fragment") {
        shader = gl.createShader(gl.FRAGMENT_SHADER);
    } else if (shaderScript.type == "x-shader/x-vertex") {
        shader = gl.createShader(gl.VERTEX_SHADER);
    } else {
        return null;
    }

    gl.shaderSource(shader, str);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(gl.getShaderInfoLog(shader));
        return null;
    }

    return shader;
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

function createSphere() {
    var latitudeBands = 30;
    var longitudeBands = 30;

    var vertexPositionData = [];
    var textureCoordData = [];
    var indexData = [];

    var lats = _.range(latitudeBands+1);
    var longs = _.range(longitudeBands+1);
    _.each(lats, function (latNumber) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        _.each(longs, function (longNumber) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;
            var u = 1 - (longNumber / longitudeBands);
            var v = 1 - (latNumber / latitudeBands);

            textureCoordData.push(u, v);
            vertexPositionData.push(x, y, z);
        });
    });

    _.each(_.initial(lats), function (latNumber) {
        _.each(_.initial(longs), function (longNumber) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;

            indexData.push(first, second, first + 1, second, second + 1, first + 1);
        });
    });

    return {positions: vertexPositionData, indices: indexData, texMap: textureCoordData};
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

function scaleMat3(norm, sc) {
    norm[0] *= sc;
    norm[1] *= sc;
    norm[2] *= sc;
    norm[3] *= sc;
    norm[4] *= sc;
    norm[5] *= sc;
    norm[6] *= sc;
    norm[7] *= sc;
    norm[8] *= sc;
}
