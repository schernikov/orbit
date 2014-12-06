/**
 * Created by schernikov on 11/22/14.
 */

function Measure(conf) {
    var self = this;

    function addPoint(points, point, p, mat) {
        vec3.transformMat4(point, p, mat);
        points.push(point[0], point[1], point[2]);
    }

    function makeTick(positions, mat, pp, angle) {
        var point = vec3.create();
        var finalMat = mat4.create();
        mat4.rotateY(finalMat, finalMat, degToRad(angle));
        mat4.multiply(finalMat, finalMat, mat);
        /* first triangle */
        addPoint(positions, point, pp[0], finalMat);
        addPoint(positions, point, pp[1], finalMat);
        addPoint(positions, point, pp[2], finalMat);
        /* second triangle */
        addPoint(positions, point, pp[0], finalMat);
        addPoint(positions, point, pp[2], finalMat);
        addPoint(positions, point, pp[3], finalMat);
    }

    function makeTickPoints(width, aspect) {
        var w = width/2;
        var h = width/aspect/2;
        return[
            [-w, 0, -h],
            [-w, 0,  h],
            [ w, 0,  h],
            [ w, 0, -h]];
    }

    function makeTickWidth(scale, main, gen, step) {
        var width = main || gen || {absolute: 0, relative: 0.1};
        return (width.absolute || 0) + Math.sin(degToRad((width.relative || 0)*step))*scale;
    }

    function generateTicks(conf) {
        if (!conf.primary) return [];
        var radius = conf.radius || 1;

        var aspect = conf.aspect || 1;
        var longitudeBands = conf.primary.count;
        var step = 360/longitudeBands;

        var tickMat = mat4.create();
        mat4.translate(tickMat, tickMat, [0, 0, radius]);

        var positions = [];
        var pp, ss;
        pp = makeTickPoints(makeTickWidth(radius, conf.primary.width, conf.width, step), conf.primary.aspect || aspect);

        if (conf.secondary) {
            var subs = conf.secondary.count;
            var subStep = step/subs;

            ss = makeTickPoints(makeTickWidth(radius, conf.secondary.width, conf.width, subStep), conf.secondary.aspect || aspect);
        }
        var mn = conf.range ? ((360 + conf.range[0]) % 360) : 0;
        var mx = conf.range ? ((360 + conf.range[1]) % 360) : 0;
        if (mx == 0) mx = 360;
        _.each(_.range(longitudeBands), function (long) {
            var angle = long*step;
            if (angle >= mn && angle <= mx) {
                makeTick(positions, tickMat, pp, angle);
            }
            if (ss) {
                _.each(_.range(1, subs), function (sub) {
                    var subangle = angle + sub * subStep;
                    if (subangle >= mn && subangle <= mx) {
                        makeTick(positions, tickMat, ss, subangle);
                    }
                });
            }
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

    var ticks = generateTicks(conf);

    var posBuf, shader;

    var movMat = mat4.create();
    var worldMat = mat4.create();
    var finalMat = mat4.create();

    if (conf.offset) mat4.translate(movMat, movMat, [conf.offset, 0, 0]);

    self.textures = function (gl) {
        shader = measShaders(gl);
        posBuf = createABuffer(gl, ticks, 3);
    };

    self.rotate = function (deltaX, deltaY) {

    };

    self.transform = function (camMap, world) {
        mat4.multiply(worldMat, world, movMat);
        mat4.multiply(finalMat, camMap, worldMat);
    };

    self.draw = function (gl) {
        gl.useProgram(shader);

        vertexPointer(gl, shader.vertexPositionAttribute, posBuf);

        gl.uniformMatrix4fv(shader.pMatrixUniform, false, finalMat);
        gl.uniform4fv(shader.uColor, meas_color);

        var skip = 2*posBuf.itemSize;
        gl.drawArrays(gl.TRIANGLES, skip, posBuf.numItems-skip);

        gl.uniform4fv(shader.uColor, zmeas_color);

        gl.drawArrays(gl.TRIANGLES, 0, skip);
    };
}
