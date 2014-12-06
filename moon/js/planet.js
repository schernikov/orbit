/**
 * Created by schernikov on 11/22/14.
 */

function Planet(radius, names) {
    var self = this;

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
        shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
        shaderProgram.daySamplerUniform = gl.getUniformLocation(shaderProgram, "uDaySampler");
        shaderProgram.nightSamplerUniform = gl.getUniformLocation(shaderProgram, "uNightSampler");
        shaderProgram.ambientLevelUniform = gl.getUniformLocation(shaderProgram, "uAmbientLevel");
        shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
        shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");

        return shaderProgram;
    }

    var sphere = createSphere();
    var texs, shader;
    var normalBuf, texBuf, posBuf, indexBuf;

    /* normals are the same as positions as long as sphere radius is 1 */
    self.textures = function (gl, on_update) {
        shader = initShaders(gl);
        var unifs = [shader.daySamplerUniform, shader.nightSamplerUniform];

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
    var lightingDirection = vec3.create();
    var correction = degToRad(90);
    mat4.rotateY(modMat, modMat, correction);
    mat4.multiply(movMat, rotMat, modMat);

    self.rotate = function (deltaX, deltaY) {
        var diffMat = mat4.create();
        mat4.rotateY(diffMat, diffMat, degToRad(deltaX / 10));
        mat4.rotateX(diffMat, diffMat, degToRad(deltaY / 10));

        mat4.multiply(rotMat, diffMat, rotMat);
        //TODO if model is rotated only then rotMat is not needed.
        // Need to have modMap only in case if there are other transforms
        mat4.multiply(movMat, rotMat, modMat);
    };

    self.transform = function (camMap, world, objects) {
        //vec3.transformMat4(lightingDirection, objects.sun.get_center(), rotMat);

        vec3.transformMat4(lightingDirection, objects.sun.get_center(), world);
        vec3.normalize(lightingDirection, lightingDirection);

        mat4.multiply(worldMat, world, movMat);
        mat3.normalFromMat4(normalMat, worldMat);

        mat4.multiply(finalMat, camMap, worldMat);
    };

    self.draw = function (gl) {
        gl.useProgram(shader);

        gl.uniform1f(shader.ambientLevelUniform, ambient);

        gl.uniform3fv(shader.lightingDirectionUniform, lightingDirection);

        gl.uniform3fv(shader.directionalColorUniform, sun_hue);

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
        gl.uniformMatrix3fv(shader.nMatrixUniform, false, normalMat);

        gl.drawElements(gl.TRIANGLES, indexBuf.numItems, gl.UNSIGNED_SHORT, 0);
    }
}
