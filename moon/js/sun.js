/**
 * Created by schernikov on 11/22/14.
 */

function Sun(name) {
    var self = this;

    function sunShaders(gl) {
        var fragmentShader = getShader(gl, "sun-fs");
        var vertexShader = getShader(gl, "sun-vs");

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

        shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");

        shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");

        return shaderProgram;
    }

    function makePoints() {
        var points = [
            [-1, -1], [-1, 1], [1, 1],
            [-1, -1], [1, 1], [1, -1]];
        var tex = [], vert = [];
        _.each(points, function (point) {
            var x = point[0], y = point[1];
            var u = (x+1)/2;
            var v = (y+1)/2;
            tex.push(u, v);
            vert.push(x, y, 0);
        });
        return {positions: vert, texMap: tex};
    }

    var posBuf, texBuf;
    var shader;
    var texture;

    var points = makePoints();

    var scale = 3;
    var sun_center = vec3.fromValues(earth_orb, 0, 0);

    self.get_center = function () {
        return vec3.clone(sun_center);
    };

    var finalMat = mat4.create();

    self.textures = function (gl, on_update) {
        shader = sunShaders(gl);

        texBuf = createABuffer(gl, points.texMap, 2);
        posBuf = createABuffer(gl, points.positions, 3);

        texture = initTexture(gl, on_update, name);
    };

    self.rotate = function (deltaX, deltaY) {

    };

    function show(point) {
        return ''+point[0].toFixed(2)+', '+point[1].toFixed(2)+', '+point[2].toFixed(2);
    }
    self.transform = function (camera, world) {
        var center = vec3.clone(sun_center);
        var side = vec3.fromValues(earth_orb, sun_rad, 0);

        vec3.transformMat4(center, center, world);
        vec3.transformMat4(side, side, world);
        var size = vec3.distance(center, side);

        var nworld = mat4.create();

        vec3.scale(center, vec3.normalize(center, center), persp_far);
        mat4.translate(nworld, nworld, center);
        var sc = size/sun_rad*scale;
        mat4.scale(nworld, nworld, [sc, sc, sc]);

        mat4.multiply(finalMat, camera, nworld);
    };

    self.draw = function (gl) {
        gl.useProgram(shader);

        var idx = 0;
        gl.activeTexture(gl['TEXTURE'+idx]);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(shader.samplerUniform, idx);

        vertexPointer(gl, shader.vertexPositionAttribute, posBuf);
        vertexPointer(gl, shader.textureCoordAttribute, texBuf);

        gl.uniformMatrix4fv(shader.pMatrixUniform, false, finalMat);

        gl.drawArrays(gl.TRIANGLES, 0, posBuf.numItems);
    };
}
