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
