(function () {
    'use strict';

    function AddToDOM(element, parent) {
        let target;
        if (parent) {
            if (typeof parent === 'string') {
                //  Hopefully an element ID
                target = document.getElementById(parent);
            }
            else if (typeof parent === 'object' && parent.nodeType === 1) {
                //  Quick test for a HTMLElement
                target = parent;
            }
        }
        else if (element.parentElement) {
            return element;
        }
        //  Fallback, covers an invalid ID and a non HTMLElement object
        if (!target) {
            target = document.body;
        }
        target.appendChild(element);
        return element;
    }

    function DOMContentLoaded(callback) {
        const readyState = document.readyState;
        if (readyState === 'complete' || readyState === 'interactive') {
            callback();
            return;
        }
        const check = () => {
            document.removeEventListener('deviceready', check, true);
            document.removeEventListener('DOMContentLoaded', check, true);
            window.removeEventListener('load', check, true);
            callback();
        };
        if (!document.body) {
            window.setTimeout(check, 20);
        }
        else if (window.hasOwnProperty('cordova')) {
            document.addEventListener('deviceready', check, true);
        }
        else {
            document.addEventListener('DOMContentLoaded', check, true);
            window.addEventListener('load', check, true);
        }
    }

    //  From Pixi v5
    const fragTemplate = [
        'precision mediump float;',
        'void main(void){',
        'float test = 0.1;',
        '%forloop%',
        'gl_FragColor = vec4(0.0);',
        '}',
    ].join('\n');
    function generateSrc(maxIfs) {
        let src = '';
        for (let i = 0; i < maxIfs; ++i) {
            if (i > 0) {
                src += '\nelse ';
            }
            if (i < maxIfs - 1) {
                src += `if(test == ${i}.0){}`;
            }
        }
        return src;
    }
    function CheckShaderMaxIfStatements (maxIfs, gl) {
        const shader = gl.createShader(gl.FRAGMENT_SHADER);
        while (true) {
            const fragmentSrc = fragTemplate.replace(/%forloop%/gi, generateSrc(maxIfs));
            gl.shaderSource(shader, fragmentSrc);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                maxIfs = (maxIfs / 2) | 0;
            }
            else {
                // valid!
                break;
            }
        }
        return maxIfs;
    }

    const shaderSource = {
        fragmentShader: `
precision highp float;
varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vTintColor;
uniform sampler2D uTexture[%count%];
void main (void)
{
    vec4 color;
    %forloop%
    gl_FragColor = color * vec4(vTintColor.bgr * vTintColor.a, vTintColor.a);
}`,
        vertexShader: `
precision highp float;
attribute vec2 aVertexPosition;
attribute vec2 aTextureCoord;
attribute float aTextureId;
attribute vec4 aTintColor;
uniform mat4 uProjectionMatrix;
uniform mat4 uCameraMatrix;
varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vTintColor;
void main (void)
{
    vTextureCoord = aTextureCoord;
    vTextureId = aTextureId;
    vTintColor = aTintColor;
    gl_Position = uProjectionMatrix * uCameraMatrix * vec4(aVertexPosition, 0.0, 1.0);
}`
    };
    class MultiTextureQuadShader {
        constructor(renderer, config = {}) {
            this.attribs = { aVertexPosition: 0, aTextureCoord: 0, aTextureId: 0, aTintColor: 0 };
            this.uniforms = { uProjectionMatrix: 0, uCameraMatrix: 0, uTexture: 0 };
            /**
             * The size, in bytes, per entry in the array buffer.
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.dataSize = 4;
            /**
             * The size, in bytes, per entry in the element index array.
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.indexSize = 4;
            /**
             * The amount of elements / floats a single vertex consists of.
             *
             * The default is 6:
             *
             * position (x,y - 2 floats)
             * texture coord (x,y - 2 floats)
             * texture index (float)
             * packed color (vec4)
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.vertexElementSize = 6;
            /**
             * The size, in bytes, of a single vertex in the array buffer.
             *
             * This is `vertexElementSize * dataSize`.
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.vertexByteSize = 6 * 4;
            /**
             * The size, in bytes, of a single quad in the array buffer.
             *
             * This is `vertexByteSize * 4`.
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.quadByteSize = (6 * 4) * 4;
            /**
             * The size, in quantity of elements, of a single quad in the element index array.
             *
             * This is `vertexElementSize * 4`.
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.quadElementSize = 6 * 4;
            /**
             * The total number of entries per quad in the element index array.
             *
             * The IBO contains 6 entries per quad:
             *
             * 0, 1, 2
             * 2, 3, 0
             *
             * @type {number}
             * @memberof MultiTextureQuadShader
             */
            this.quadIndexSize = 6;
            this.renderer = renderer;
            this.gl = renderer.gl;
            const { batchSize = 4096, fragmentShader = shaderSource.fragmentShader, vertexShader = shaderSource.vertexShader } = config;
            this.batchSize = batchSize;
            this.bufferByteSize = batchSize * this.quadByteSize;
            this.createBuffers();
            this.createShaders(fragmentShader, vertexShader);
            this.count = 0;
        }
        createBuffers() {
            let ibo = [];
            //  Seed the index buffer
            for (let i = 0; i < (this.batchSize * this.indexSize); i += this.indexSize) {
                ibo.push(i + 0, i + 1, i + 2, i + 2, i + 3, i + 0);
            }
            this.data = new ArrayBuffer(this.bufferByteSize);
            this.index = new Uint16Array(ibo);
            this.vertexViewF32 = new Float32Array(this.data);
            this.vertexViewU32 = new Uint32Array(this.data);
            const gl = this.gl;
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.index, gl.STATIC_DRAW);
            //  Tidy-up
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            ibo = [];
        }
        createShaders(fragmentShaderSource, vertexShaderSource) {
            const gl = this.gl;
            const maxTextures = this.renderer.maxTextures;
            let src = '';
            if (maxTextures > 1) {
                for (let i = 0; i < maxTextures; i++) {
                    if (i > 0) {
                        src += '\nelse ';
                    }
                    if (i < maxTextures - 1) {
                        src += `if (vTextureId < ${i}.5)`;
                    }
                    src += '\n{';
                    src += `\n  color = texture2D(uTexture[${i}], vTextureCoord);`;
                    src += '\n}';
                }
                fragmentShaderSource = fragmentShaderSource.replace(/%count%/gi, `${maxTextures}`);
                fragmentShaderSource = fragmentShaderSource.replace(/%forloop%/gi, src);
            }
            else {
                src = 'color = texture2D(uTexture[0], vTextureCoord);';
            }
            //  Create the shaders
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fragmentShaderSource);
            gl.compileShader(fragmentShader);
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexShaderSource);
            gl.compileShader(vertexShader);
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);
            this.program = program;
            for (let key of Object.keys(this.attribs)) {
                let location = gl.getAttribLocation(program, key);
                gl.enableVertexAttribArray(location);
                this.attribs[key] = location;
            }
            for (let key of Object.keys(this.uniforms)) {
                this.uniforms[key] = gl.getUniformLocation(program, key);
            }
        }
        bind(projectionMatrix, cameraMatrix) {
            const gl = this.gl;
            const renderer = this.renderer;
            const uniforms = this.uniforms;
            gl.useProgram(this.program);
            gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(uniforms.uCameraMatrix, false, cameraMatrix);
            gl.uniform1iv(uniforms.uTexture, renderer.textureIndex);
            this.bindBuffers(this.indexBuffer, this.vertexBuffer);
        }
        bindBuffers(indexBuffer, vertexBuffer) {
            const gl = this.gl;
            const stride = this.vertexByteSize;
            const attribs = this.attribs;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            //  attributes must be reset whenever you change buffers
            gl.vertexAttribPointer(attribs.aVertexPosition, 2, gl.FLOAT, false, stride, 0); // size = 8
            gl.vertexAttribPointer(attribs.aTextureCoord, 2, gl.FLOAT, false, stride, 8); // size = 8, offset = position
            gl.vertexAttribPointer(attribs.aTextureId, 1, gl.FLOAT, false, stride, 16); // size = 4, offset = position + tex coord
            gl.vertexAttribPointer(attribs.aTintColor, 4, gl.UNSIGNED_BYTE, true, stride, 20); // size = 4, offset = position + tex coord + index
            this.count = 0;
        }
        draw(count) {
            const gl = this.gl;
            const offset = count * this.quadByteSize;
            if (offset === this.bufferByteSize) {
                gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);
            }
            else {
                let view = this.vertexViewF32.subarray(0, offset);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
            }
            gl.drawElements(gl.TRIANGLES, count * this.quadIndexSize, gl.UNSIGNED_SHORT, 0);
        }
        flush() {
            const count = this.count;
            if (count === 0) {
                return false;
            }
            this.draw(count);
            this.prevCount = count;
            this.count = 0;
            this.renderer.flushTotal++;
            return true;
        }
    }

    function Matrix2dEqual(mat1, mat2) {
        return (mat1[0] === mat2[0] &&
            mat1[1] === mat2[1] &&
            mat1[2] === mat2[2] &&
            mat1[3] === mat2[3] &&
            mat1[4] === mat2[4] &&
            mat1[5] === mat2[5]);
    }

    function Ortho(width, height, near = -1, far = 1) {
        const m00 = -2 * (1 / -width);
        const m11 = -2 * (1 / height);
        const m22 = 2 * (1 / (near - far));
        return new Float32Array([m00, 0, 0, 0, 0, m11, 0, 0, 0, 0, m22, 0, -1, 1, 0, 1]);
    }

    let gl;
    function get() {
        return gl;
    }
    function set(context) {
        gl = context;
    }
    var GL = {
        get,
        set
    };

    function RenderWebGL(sprite, renderer, shader, startActiveTexture) {
        const texture = sprite.texture;
        if (texture.glIndexCounter < startActiveTexture) {
            renderer.requestTexture(texture);
        }
        if (shader.count === shader.batchSize) {
            shader.flush();
        }
        sprite.uploadBuffers(shader.vertexViewF32, shader.vertexViewU32, shader.count * shader.quadElementSize);
        shader.count++;
    }

    class WebGLRenderer {
        constructor(width, height, resolution) {
            this.contextOptions = {
                alpha: false,
                antialias: false,
                premultipliedAlpha: false,
                stencil: false,
                preserveDrawingBuffer: false,
                desynchronized: false
            };
            this.clearColor = [0, 0, 0, 1];
            this.flushTotal = 0;
            this.maxTextures = 0;
            this.currentActiveTexture = 0;
            this.startActiveTexture = 0;
            this.tempTextures = [];
            this.clearBeforeRender = true;
            this.optimizeRedraw = true;
            this.autoResize = true;
            this.contextLost = false;
            this.width = width;
            this.height = height;
            this.resolution = resolution;
            const canvas = document.createElement('canvas');
            canvas.addEventListener('webglcontextlost', (event) => this.onContextLost(event), false);
            canvas.addEventListener('webglcontextrestored', () => this.onContextRestored(), false);
            this.canvas = canvas;
            this.initContext();
            this.shader = new MultiTextureQuadShader(this);
        }
        initContext() {
            const gl = this.canvas.getContext('webgl', this.contextOptions);
            GL.set(gl);
            this.gl = gl;
            this.elementIndexExtension = gl.getExtension('OES_element_index_uint');
            this.getMaxTextures();
            if (this.shader) {
                this.shader.gl = gl;
            }
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            this.resize(this.width, this.height, this.resolution);
        }
        resize(width, height, resolution = 1) {
            this.width = width * resolution;
            this.height = height * resolution;
            this.resolution = resolution;
            const canvas = this.canvas;
            canvas.width = this.width;
            canvas.height = this.height;
            if (this.autoResize) {
                canvas.style.width = this.width / resolution + 'px';
                canvas.style.height = this.height / resolution + 'px';
            }
            this.gl.viewport(0, 0, this.width, this.height);
            this.projectionMatrix = Ortho(width, height);
        }
        onContextLost(event) {
            event.preventDefault();
            this.contextLost = true;
        }
        onContextRestored() {
            this.contextLost = false;
            this.initContext();
        }
        setBackgroundColor(color) {
            const clearColor = this.clearColor;
            const r = color >> 16 & 0xFF;
            const g = color >> 8 & 0xFF;
            const b = color & 0xFF;
            const a = (color > 16777215) ? color >>> 24 : 255;
            clearColor[0] = r / 255;
            clearColor[1] = g / 255;
            clearColor[2] = b / 255;
            clearColor[3] = a / 255;
            return this;
        }
        getMaxTextures() {
            const gl = this.gl;
            let maxTextures = CheckShaderMaxIfStatements(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), gl);
            const tempTextures = this.tempTextures;
            if (tempTextures.length) {
                tempTextures.forEach(texture => {
                    gl.deleteTexture(texture);
                });
            }
            //  Create temp textures to stop WebGL errors on mac os
            for (let i = 0; i < maxTextures; i++) {
                let tempTexture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, tempTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
                tempTextures[i] = tempTexture;
            }
            this.maxTextures = maxTextures;
            this.textureIndex = Array.from(Array(maxTextures).keys());
            this.activeTextures = Array(maxTextures);
            this.currentActiveTexture = 0;
        }
        reset(framebuffer = null, width = this.width, height = this.height) {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, width, height);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            this.currentActiveTexture = 0;
            this.startActiveTexture++;
            this.flushTotal = 0;
        }
        render(sceneList, dirtyFrame, dirtyCameras) {
            if (this.contextLost) {
                return;
            }
            const gl = this.gl;
            const flushTotal = this.flushTotal;
            //  This is only here because if we don't do _something_ with the context, GL Spector can't see it.
            //  Technically, we could move it below the dirty bail-out below.
            this.reset();
            //  Cache 1 - Nothing dirty? Display the previous frame
            if (this.optimizeRedraw && dirtyFrame === 0 && dirtyCameras === 0) {
                return;
            }
            const shader = this.shader;
            const cls = this.clearColor;
            if (this.clearBeforeRender) {
                gl.clearColor(cls[0], cls[1], cls[2], cls[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            const projectionMatrix = this.projectionMatrix;
            //  Cache 2 - Only one dirty camera and one flush? We can re-use the buffers
            /*
            if (dirtyCameras === 1 && dirtyFrame === 0 && flushTotal === 1)
            {
                //  Total items rendered in the previous frame
                const count = shader.prevCount;

                shader.bind(projectionMatrix, sceneList[0].matrix);

                shader.draw(count);

                shader.prevCount = count;

                this.flushTotal = 1;

                return;
            }
            */
            let prevCamera;
            for (let c = 0; c < sceneList.length; c += 2) {
                let camera = sceneList[c];
                let list = sceneList[c + 1];
                //  This only needs rebinding if the camera matrix is different to before
                if (!prevCamera || !Matrix2dEqual(camera.worldTransform, prevCamera.worldTransform)) {
                    shader.flush();
                    shader.bind(projectionMatrix, camera.matrix);
                    prevCamera = camera;
                }
                //  Process the render list
                for (let i = 0; i < list.length; i++) {
                    RenderWebGL(list[i], this, shader, this.startActiveTexture);
                }
            }
            //  One final sweep
            shader.flush();
        }
        resetTextures(texture) {
            const gl = this.gl;
            const active = this.activeTextures;
            active.fill(null);
            this.currentActiveTexture = 0;
            this.startActiveTexture++;
            if (texture) {
                //  Set this texture as texture0
                active[0] = texture;
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
                this.currentActiveTexture = 1;
            }
        }
        requestTexture(texture) {
            const gl = this.gl;
            texture.glIndexCounter = this.startActiveTexture;
            if (this.currentActiveTexture < this.maxTextures) {
                //  Make this texture active
                this.activeTextures[this.currentActiveTexture] = texture;
                texture.glIndex = this.currentActiveTexture;
                gl.activeTexture(gl.TEXTURE0 + this.currentActiveTexture);
                gl.bindTexture(gl.TEXTURE_2D, texture.glTexture);
                this.currentActiveTexture++;
            }
            else {
                //  We're out of textures, so flush the batch and reset them all
                this.shader.flush();
                this.resetTextures(texture);
            }
        }
    }

    function GetConfigValue(config, property, defaultValue) {
        if (config.hasOwnProperty(property)) {
            return config[property];
        }
        else {
            return defaultValue;
        }
    }

    class SceneManager {
        constructor(game) {
            this.sceneIndex = 0;
            //  Flush the cache
            this.flush = false;
            //  How many Cameras were made dirty this frame across all Scenes?
            this.dirtyCameras = 0;
            //  How many Game Objects were made dirty this frame across all Scenes?
            this.dirtyFrame = 0;
            //  How many Game Objects were processed this frame across all Scenes?
            this.totalFrame = 0;
            this.game = game;
            this.scenes = new Map();
            this.renderList = [];
        }
        boot(scenes) {
            scenes.forEach(scene => {
                this.add(scene);
            });
        }
        add(scene) {
            const instance = new scene();
            //  At this point the act of creating a new instance of the Scene
            //  will have invoked the init method below, so we can now safely
            //  add the Scene into our Map
            if (instance.willUpdate) {
                instance.boot.call(instance);
            }
        }
        init(scene, config = {}) {
            const size = this.scenes.size;
            const sceneIndex = this.sceneIndex;
            const firstScene = (size === 0);
            if (typeof config === 'string') {
                scene.key = config;
            }
            else if (config || (!config && firstScene)) {
                scene.key = GetConfigValue(config, 'key', 'scene' + sceneIndex);
                scene.willUpdate = GetConfigValue(config, 'willUpdate', firstScene);
                scene.willRender = GetConfigValue(config, 'willRender', firstScene);
            }
            if (this.scenes.has(scene.key)) {
                console.warn('Scene key already in use: ' + scene.key);
            }
            else {
                this.scenes.set(scene.key, scene);
                this.flush = true;
                this.sceneIndex++;
            }
        }
        update(delta, now) {
            for (const scene of this.scenes.values()) {
                if (scene.willUpdate) {
                    scene.update.call(scene, delta, now);
                    scene.world.update(delta, now);
                }
            }
        }
        render(gameFrame) {
            const renderList = this.renderList;
            renderList.length = 0;
            this.dirtyCameras = 0;
            this.dirtyFrame = 0;
            this.totalFrame = 0;
            for (let scene of this.scenes.values()) {
                if (scene.willRender) {
                    let world = scene.world;
                    this.dirtyFrame += world.render(gameFrame);
                    this.totalFrame += world.totalFrame;
                    if (world.renderList.length === 0) {
                        continue;
                    }
                    if (world.camera.dirtyRender) {
                        this.dirtyCameras++;
                        world.camera.dirtyRender = false;
                    }
                    renderList.push(world.camera);
                    renderList.push(world.renderList);
                }
            }
            if (this.flush) {
                //  Invalidate the renderer cache
                this.dirtyFrame++;
                //  And reset
                this.flush = false;
            }
            return [renderList, this.dirtyFrame, this.dirtyCameras];
        }
    }

    class Frame {
        constructor(texture, key, x, y, width, height) {
            this.trimmed = false;
            this.texture = texture;
            this.key = key;
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            this.sourceSizeWidth = width;
            this.sourceSizeHeight = height;
            this.updateUVs();
        }
        setPivot(x, y) {
            this.pivot = { x, y };
        }
        setSize(width, height) {
            this.width = width;
            this.height = height;
            this.sourceSizeWidth = width;
            this.sourceSizeHeight = height;
            this.updateUVs();
        }
        setSourceSize(width, height) {
            this.sourceSizeWidth = width;
            this.sourceSizeHeight = height;
        }
        setTrim(width, height, x, y, w, h) {
            this.trimmed = true;
            this.sourceSizeWidth = width;
            this.sourceSizeHeight = height;
            this.spriteSourceSizeX = x;
            this.spriteSourceSizeY = y;
            this.spriteSourceSizeWidth = w;
            this.spriteSourceSizeHeight = h;
        }
        updateUVs() {
            const { x, y, width, height } = this;
            const baseTextureWidth = this.texture.width;
            const baseTextureHeight = this.texture.height;
            this.u0 = x / baseTextureWidth;
            this.v0 = y / baseTextureHeight;
            this.u1 = (x + width) / baseTextureWidth;
            this.v1 = (y + height) / baseTextureHeight;
        }
    }

    function SetGLTextureFilterMode(texture, linear = true) {
        const gl = GL.get();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const mode = (linear) ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
    }

    function DeleteGLTexture(texture) {
        const gl = GL.get();
        if (gl.isTexture(texture)) {
            gl.deleteTexture(texture);
        }
    }

    function DeleteFramebuffer(framebuffer) {
        const gl = GL.get();
        if (gl.isFramebuffer(framebuffer)) {
            gl.deleteFramebuffer(framebuffer);
        }
    }

    function IsPowerOfTwo(width, height) {
        if (width < 1 || height < 1) {
            return false;
        }
        return ((width & (width - 1)) === 0) && ((height & (height - 1)) === 0);
    }

    function CreateGLTexture(source, width, height, potClamp = true, linear = true) {
        const gl = GL.get();
        const glTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        if (source) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            width = source.width;
            height = source.height;
        }
        else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        const mode = (linear) ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
        const pot = (source && IsPowerOfTwo(width, height));
        const wrap = (pot && potClamp) ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        if (pot) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        return glTexture;
    }

    function UpdateGLTexture(source, dstTexture, flipY = false) {
        const gl = GL.get();
        const width = source.width;
        const height = source.height;
        if (width > 0 && height > 0) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, dstTexture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }
    }

    class Texture {
        constructor(image, width, height) {
            //  Unique identifier of this Texture, if stored in the Texture Manager
            this.key = '';
            this.glIndex = 0;
            this.glIndexCounter = -1;
            if (image) {
                width = image.width;
                height = image.height;
            }
            this.image = image;
            this.width = width;
            this.height = height;
            this.frames = new Map();
            this.data = {};
            this.add('__BASE', 0, 0, width, height);
        }
        add(key, x, y, width, height) {
            if (this.frames.has(key)) {
                return null;
            }
            let frame = new Frame(this, key, x, y, width, height);
            this.frames.set(key, frame);
            if (!this.firstFrame || this.firstFrame.key === '__BASE') {
                this.firstFrame = frame;
            }
            return frame;
        }
        get(key) {
            //  null, undefined, empty string, zero
            if (!key) {
                return this.firstFrame;
            }
            if (key instanceof Frame) {
                key = key.key;
            }
            let frame = this.frames.get(key);
            if (!frame) {
                console.warn('Texture.frame missing: ' + key);
                frame = this.firstFrame;
            }
            return frame;
        }
        getFrames(frames) {
            const output = [];
            frames.forEach((key) => {
                output.push(this.get(key));
            });
            return output;
        }
        getFramesInRange(prefix, start, end, zeroPad = 0, suffix = '') {
            const frameKeys = [];
            const diff = (start < end) ? 1 : -1;
            //  Adjust because we use i !== end in the for loop
            end += diff;
            for (let i = start; i !== end; i += diff) {
                frameKeys.push(prefix + i.toString().padStart(zeroPad, '0') + suffix);
            }
            return this.getFrames(frameKeys);
        }
        setSize(width, height) {
            this.width = width;
            this.height = height;
            const frame = this.frames.get('__BASE');
            frame.setSize(width, height);
        }
        setFilter(linear) {
            SetGLTextureFilterMode(this.glTexture, linear);
        }
        createGL() {
            if (this.glTexture) {
                DeleteGLTexture(this.glTexture);
            }
            this.glTexture = CreateGLTexture(this.image);
        }
        updateGL() {
            if (!this.glTexture) {
                this.glTexture = CreateGLTexture(this.image);
            }
            else {
                UpdateGLTexture(this.image, this.glTexture);
            }
        }
        destroy() {
            this.frames.clear();
            this.image = null;
            this.firstFrame = null;
            this.data = null;
            DeleteGLTexture(this.glTexture);
            DeleteFramebuffer(this.glFramebuffer);
        }
    }

    function CreateCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    class TextureManager {
        constructor() {
            this.textures = new Map();
            this.createDefaultTextures();
        }
        createDefaultTextures() {
            this.add('__BLANK', new Texture(CreateCanvas(32, 32).canvas));
            const missing = CreateCanvas(32, 32);
            missing.strokeStyle = '#0f0';
            missing.moveTo(0, 0);
            missing.lineTo(32, 32);
            missing.stroke();
            missing.strokeRect(0.5, 0.5, 31, 31);
            this.add('__MISSING', new Texture(missing.canvas));
        }
        get(key) {
            if (this.textures.has(key)) {
                return this.textures.get(key);
            }
            else {
                return this.textures.get('__MISSING');
            }
        }
        has(key) {
            return this.textures.has(key);
        }
        add(key, source) {
            let texture;
            if (!this.textures.has(key)) {
                if (source instanceof Texture) {
                    texture = source;
                }
                else {
                    texture = new Texture(source);
                }
                texture.key = key;
                if (!texture.glTexture) {
                    texture.createGL();
                }
                this.textures.set(key, texture);
            }
            return texture;
        }
    }

    class EE {
        constructor(callback, context, once = false) {
            this.callback = callback;
            this.context = context;
            this.once = once;
        }
    }
    class EventEmitter {
        constructor() {
            this._events = new Map();
        }
        on(event, callback, context = this, once = false) {
            if (typeof callback !== 'function') {
                throw new TypeError('The listener must be a function');
            }
            const listener = new EE(callback, context, once);
            const listeners = this._events.get(event);
            if (!listeners) {
                this._events.set(event, new Set([listener]));
            }
            else {
                listeners.add(listener);
            }
            return this;
        }
        once(event, callback, context = this) {
            return this.on(event, callback, context, true);
        }
        /**
         * Clear an event by name.
         */
        clearEvent(event) {
            this._events.delete(event);
            return this;
        }
        /**
         * Return an array listing the events for which the emitter has registered listeners.
         */
        eventNames() {
            return [...this._events.keys()];
        }
        /**
         * Return the listeners registered for a given event.
         */
        listeners(event) {
            const out = [];
            const listeners = this._events.get(event);
            listeners.forEach((ee) => {
                out.push(ee.callback);
            });
            return out;
        }
        /**
         * Return the number of listeners listening to a given event.
         */
        listenerCount(event) {
            const listeners = this._events.get(event);
            return (listeners) ? listeners.size : 0;
        }
        /**
         * Calls each of the listeners registered for a given event.
         */
        emit(event, ...args) {
            if (!this._events.has(event)) {
                return false;
            }
            const listeners = this._events.get(event);
            for (const ee of listeners) {
                ee.callback.apply(ee.context, args);
                if (ee.once) {
                    listeners.delete(ee);
                }
            }
            if (listeners.size === 0) {
                this._events.delete(event);
            }
            return true;
        }
        /**
         * Remove the listeners of a given event.
         *
         * @param event
         * @param callback
         * @param context
         * @param once
         */
        off(event, callback, context, once) {
            if (!callback) {
                //  Remove all events matching the given key
                this._events.delete(event);
            }
            else {
                const listeners = this._events.get(event);
                const hasContext = !context;
                const hasOnce = (once !== undefined);
                for (const ee of listeners) {
                    if (ee.callback === callback && (hasContext && ee.context === console) && (hasOnce && ee.once === once)) {
                        listeners.delete(ee);
                    }
                }
                if (listeners.size === 0) {
                    this._events.delete(event);
                }
            }
            return this;
        }
        /**
         * Remove all listeners, or those of the specified event.
         *
         * @param event
         */
        removeAllListeners(event) {
            if (!event) {
                this._events.clear();
            }
            else {
                this._events.delete(event);
            }
        }
    }

    let gameInstance;
    function get$1() {
        return gameInstance;
    }
    function set$1(game) {
        gameInstance = game;
    }
    var GameInstance = {
        get: get$1,
        set: set$1
    };

    class Game extends EventEmitter {
        constructor(config) {
            super();
            this.VERSION = '4.0.0-beta1';
            this.isPaused = false;
            this.isBooted = false;
            this.lifetime = 0;
            this.elapsed = 0;
            //  The current game frame
            this.frame = 0;
            const { width = 800, height = 600, resolution = 1, backgroundColor = 0x00000, parent = document.body, scene = null } = config;
            this.config = { width, height, resolution, backgroundColor, parent, scene };
            this.cache = {
                json: new Map(),
                csv: new Map(),
                xml: new Map()
            };
            GameInstance.set(this);
            DOMContentLoaded(() => this.boot());
        }
        pause() {
            this.isPaused = true;
            this.emit('pause');
        }
        resume() {
            this.isPaused = false;
            this.lastTick = Date.now();
            this.emit('resume');
        }
        boot() {
            const config = this.config;
            this.isBooted = true;
            this.lastTick = Date.now();
            const renderer = new WebGLRenderer(config.width, config.height, config.resolution);
            renderer.setBackgroundColor(config.backgroundColor);
            AddToDOM(renderer.canvas, config.parent);
            this.renderer = renderer;
            this.textures = new TextureManager();
            this.scenes = new SceneManager(this);
            this.banner(this.VERSION);
            this.scenes.boot([].concat(config.scene));
            //  Visibility API
            document.addEventListener('visibilitychange', () => {
                this.emit('visibilitychange', document.hidden);
                if (document.hidden) {
                    this.pause();
                }
                else {
                    this.resume();
                }
            });
            // window.addEventListener('blur', () => this.pause());
            // window.addEventListener('focus', () => this.resume());
            this.emit('boot');
            requestAnimationFrame(() => this.step());
        }
        banner(version) {
            console.log('%cPhaser v' + version + '%c https://phaser4.io', 'padding: 4px 16px; color: #fff; background: linear-gradient(#3e0081 40%, #00bcc3)', '');
        }
        step() {
            const now = Date.now();
            const delta = now - this.lastTick;
            const dt = delta / 1000;
            this.lifetime += dt;
            this.elapsed = dt;
            this.lastTick = now;
            this.emit('step', dt, now);
            const sceneManager = this.scenes;
            if (!this.isPaused) {
                sceneManager.update(dt, now);
            }
            this.emit('update', dt, now);
            //  TODO: Optimize to remove const and array creation here:
            const [renderList, dirtyFrame, dirtyCameras] = sceneManager.render(this.frame);
            this.renderer.render(renderList, dirtyFrame, dirtyCameras);
            this.emit('render', dt, now);
            //  The frame always advances by 1 each step (even when paused)
            this.frame++;
            requestAnimationFrame(() => this.step());
        }
        destroy() {
            //  TODO
        }
    }

    class Rectangle {
        constructor(x = 0, y = 0, width = 0, height = 0) {
            this.set(x, y, width, height);
        }
        set(x = 0, y = 0, width = 0, height = 0) {
            this.x = x;
            this.y = y;
            this.width = width;
            this.height = height;
            return this;
        }
        set right(value) {
            if (value <= this.x) {
                this.width = 0;
            }
            else {
                this.width = value - this.x;
            }
        }
        get right() {
            return this.x + this.width;
        }
        set bottom(value) {
            if (value <= this.y) {
                this.height = 0;
            }
            else {
                this.height = value - this.y;
            }
        }
        get bottom() {
            return this.y + this.height;
        }
        contains(px, py) {
            const { x, y, width, height } = this;
            if (width <= 0 || height <= 0) {
                return false;
            }
            return (x <= px && x + width >= px && y <= py && y + height >= py);
        }
    }

    class StaticCamera {
        constructor(scene) {
            this.scene = scene;
            this.renderer = scene.game.renderer;
            this.matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
            this.bounds = new Rectangle();
            this.reset();
        }
        reset() {
            const width = this.renderer.width;
            const height = this.renderer.height;
            this.width = width;
            this.height = height;
            this.bounds.set(0, 0, width, height);
        }
        destroy() {
            this.scene = null;
            this.renderer = null;
            this.matrix = null;
            this.bounds = null;
        }
    }

    //  A Static World is designed specifically to have a bounds of a fixed size
    //  and a camera that doesn't move at all (no scrolling, rotation, etc)
    //  Because it has a fixed size, there is no camera culling enabled.
    //  Games that use this kind of world include Pacman, Bejeweled and 2048.
    class StaticWorld {
        constructor(scene) {
            //  How many Game Objects were made dirty this frame?
            this.dirtyFrame = 0;
            //  How many Game Objects will be rendered this frame? (are in-bounds)
            this.totalFrame = 0;
            //  How many Game Objects passed `willRender` this frame? (but may not have been in bounds)
            this.visibleFrame = 0;
            this.forceRefresh = false;
            this.scene = scene;
            this.children = [];
            this.renderList = [];
            this.worldTransform = new Float32Array([1, 0, 0, 1, 0, 0]);
            this.camera = new StaticCamera(scene);
        }
        scanChildren(root, gameFrame) {
            const children = root.children;
            for (let i = 0; i < children.length; i++) {
                this.buildRenderList(children[i], gameFrame);
            }
        }
        buildRenderList(root, gameFrame) {
            if (root.isRenderable()) {
                this.renderList.push(root);
                if (root.dirtyFrame >= gameFrame) {
                    this.dirtyFrame++;
                }
                this.visibleFrame++;
            }
            if (root.isParent && root.visible) {
                this.scanChildren(root, gameFrame);
            }
        }
        update(delta, time) {
            const children = this.children;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child && child.willUpdate) {
                    child.update(delta, time);
                }
            }
        }
        render(gameFrame) {
            this.dirtyFrame = 0;
            this.visibleFrame = 0;
            this.renderList.length = 0;
            this.scanChildren(this, gameFrame);
            this.totalFrame = this.renderList.length;
            if (this.forceRefresh) {
                this.dirtyFrame++;
                this.forceRefresh = false;
            }
            return this.dirtyFrame;
        }
        shutdown() {
            //  Clear the display list and reset the camera, but leave
            //  everything in place so we can return to this World again
            //  at a later stage
            // this.removeChildren();
            this.renderList = [];
            this.camera.reset();
        }
        destroy() {
            this.camera.destroy();
            this.camera = null;
            this.renderList = null;
        }
        get numChildren() {
            return this.children.length;
        }
    }

    class StaticScene {
        constructor(config) {
            this.willUpdate = false;
            this.willRender = false;
            this.game = GameInstance.get();
            this.world = new StaticWorld(this);
            this.game.scenes.init(this, config);
        }
        boot() {
        }
        update() {
        }
        render() {
        }
        shutdown() {
        }
        destroy() {
            this.world.destroy();
            this.world = null;
            this.game = null;
        }
    }

    //  The Base Game Object which all Scene entites extend
    class GameObject {
        constructor() {
            this.name = '';
            this.type = 'GameObject';
            this.willRender = true;
            this.willUpdate = true;
            this.dirtyRender = true;
            this.dirtyUpdate = true;
            this.dirtyFrame = 0;
            this.isParent = false;
            this.visible = true;
            this.inputEnabled = false;
            this.inputEnabledChildren = true;
            this.fixBounds = false;
            this.bounds = new Rectangle();
        }
        isRenderable() {
            return (this.visible && this.willRender);
        }
        setDirtyRender(setFrame = true) {
            this.dirtyRender = true;
            const scene = this.scene;
            if (setFrame && scene) {
                this.dirtyFrame = scene.game.frame;
            }
            return this;
        }
        setDirtyUpdate() {
            this.dirtyUpdate = true;
            return this;
        }
        getBounds(includeChildren = false) {
            return this.bounds;
        }
        setBounds(x, y, width, height) {
            this.bounds.set(x, y, width, height);
            return this;
        }
        update() {
        }
        updateTransform() {
            return this;
        }
        render() {
        }
        destroy(reparentChildren) {
            this.scene = null;
        }
    }

    var CONST = {
        POSITION_X: 0,
        POSITION_Y: 1,
        ORIGIN_X: 2,
        ORIGIN_Y: 3,
        SKEW_X: 4,
        SKEW_Y: 5,
        SCALE_X: 6,
        SCALE_Y: 7,
        ROTATION: 8,
        ANGLE: 9
    };

    class TransformGameObject extends GameObject {
        constructor(x = 0, y = 0) {
            super();
            const byte = Float32Array.BYTES_PER_ELEMENT;
            const buffer = new ArrayBuffer(22 * byte);
            this.transformBuffer = buffer;
            /**
             * transformData:
             * 0 = position x
             * 1 = position y
             * 2 = origin x
             * 3 = origin y
             * 4 = skew x
             * 5 = skew y
             * 6 = scale x
             * 7 = scale y
             * 8 = rotation
             * 9 = angle
             * localTransform
             * 10 = local transform a
             * 11 = local transform b
             * 12 = local transform c
             * 13 = local transform d
             * 14 = local transform tx
             * 15 = local transform ty
             * worldTransform
             * 16 = world transform a
             * 17 = world transform b
             * 18 = world transform c
             * 19 = world transform d
             * 20 = world transform tx
             * 21 = world transform ty
             */
            this.transformData = new Float32Array(buffer, 0, 10);
            this.localTransform = new Float32Array(buffer, byte * 10, 6);
            this.worldTransform = new Float32Array(buffer, byte * 16, 6);
            this.transformData.set([x, y, 0.5, 0.5, 0, 0, 1, 1, 0, 0]);
            this.localTransform.set([1, 0, 0, 1, 0, 0]);
            this.worldTransform.set([1, 0, 0, 1, 0, 0]);
            this.width = 0;
            this.height = 0;
            this.updateCache();
        }
        updateCache() {
            const transform = this.localTransform;
            const { rotation, skewX, skewY, scaleX, scaleY } = this;
            transform.set([
                Math.cos(rotation + skewY) * scaleX,
                Math.sin(rotation + skewY) * scaleX,
                -Math.sin(rotation - skewX) * scaleY,
                Math.cos(rotation - skewX) * scaleY
            ]);
            return this.updateTransform();
        }
        updateTransform() {
            this.setDirtyRender();
            const parent = this.parent;
            const lt = this.localTransform;
            const wt = this.worldTransform;
            lt[4] = this.x;
            lt[5] = this.y;
            if (!parent) {
                wt.set(lt);
                return this;
            }
            const [a, b, c, d, tx, ty] = lt;
            const [pa, pb, pc, pd, ptx, pty] = parent.worldTransform;
            wt.set([
                a * pa + b * pc,
                a * pb + b * pd,
                c * pa + d * pc,
                c * pb + d * pd,
                tx * pa + ty * pc + ptx,
                tx * pb + ty * pd + pty
            ]);
            return this;
        }
        setSize(width, height) {
            this.width = width;
            this.height = height;
            return this;
        }
        setOrigin(originX, originY = originX) {
            const data = this.transformData;
            data[CONST.ORIGIN_X] = originX;
            data[CONST.ORIGIN_Y] = originY;
            return this;
        }
        setPosition(x, y = x) {
            const data = this.transformData;
            data[CONST.POSITION_X] = x;
            data[CONST.POSITION_Y] = y;
            return this.updateTransform();
        }
        setRotation(rotation) {
            const data = this.transformData;
            if (rotation !== data[CONST.ROTATION]) {
                data[CONST.ROTATION] = rotation;
                this.updateCache();
            }
            return this;
        }
        setScale(scaleX, scaleY = scaleX) {
            const data = this.transformData;
            data[CONST.SCALE_X] = scaleX;
            data[CONST.SCALE_Y] = scaleY;
            return this.updateCache();
        }
        setSkew(skewX, skewY = skewX) {
            const data = this.transformData;
            data[CONST.SKEW_X] = skewX;
            data[CONST.SKEW_Y] = skewY;
            return this.updateCache();
        }
        destroy() {
            super.destroy();
            this.localTransform = null;
            this.worldTransform = null;
            this.transformBuffer = null;
            this.transformData = null;
        }
        set x(value) {
            this.transformData[CONST.POSITION_X] = value;
            this.updateTransform();
        }
        get x() {
            return this.transformData[CONST.POSITION_X];
        }
        set y(value) {
            this.transformData[CONST.POSITION_Y] = value;
            this.updateTransform();
        }
        get y() {
            return this.transformData[CONST.POSITION_Y];
        }
        get originX() {
            return this.transformData[CONST.ORIGIN_X];
        }
        set originX(value) {
            this.transformData[CONST.ORIGIN_X] = value;
        }
        get originY() {
            return this.transformData[CONST.ORIGIN_Y];
        }
        set originY(value) {
            this.transformData[CONST.ORIGIN_Y] = value;
        }
        set skewX(value) {
            const data = this.transformData;
            if (value !== data[CONST.SKEW_X]) {
                data[CONST.SKEW_X] = value;
                this.updateCache();
            }
        }
        get skewX() {
            return this.transformData[CONST.SKEW_X];
        }
        set skewY(value) {
            const data = this.transformData;
            if (value !== data[CONST.SKEW_Y]) {
                data[CONST.SKEW_Y] = value;
                this.updateCache();
            }
        }
        get skewY() {
            return this.transformData[CONST.SKEW_Y];
        }
        set scaleX(value) {
            const data = this.transformData;
            if (value !== data[CONST.SCALE_X]) {
                data[CONST.SCALE_X] = value;
                this.updateCache();
            }
        }
        get scaleX() {
            return this.transformData[CONST.SCALE_X];
        }
        set scaleY(value) {
            const data = this.transformData;
            if (value !== data[CONST.SCALE_Y]) {
                data[CONST.SCALE_Y] = value;
                this.updateCache();
            }
        }
        get scaleY() {
            return this.transformData[CONST.SCALE_Y];
        }
        set rotation(value) {
            const data = this.transformData;
            if (value !== data[CONST.ROTATION]) {
                data[CONST.ROTATION] = value;
                this.updateCache();
            }
        }
        get rotation() {
            return this.transformData[CONST.ROTATION];
        }
    }

    class Container extends TransformGameObject {
        constructor(x = 0, y = 0) {
            super(x, y);
            this._alpha = 1;
            this.children = [];
            this.isParent = true;
            this.type = 'Container';
        }
        update(delta, time) {
            const children = this.children;
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                if (child && child.willUpdate) {
                    child.update(delta, time);
                }
            }
        }
        destroy(reparentChildren) {
            // if (reparentChildren)
            // {
            //     this.reparentChildren(reparentChildren);
            // }
            // else
            // {
            //     this.destroyChildren();
            // }
            this.children = null;
            super.destroy();
        }
        get numChildren() {
            return this.children.length;
        }
        get alpha() {
            return this._alpha;
        }
        set alpha(value) {
            if (value !== this._alpha) {
                this._alpha = value;
                this.setDirtyRender();
            }
        }
    }

    function SetFrame(key, ...sprite) {
        sprite.forEach(entity => {
            let frame = entity.texture.get(key);
            if (frame === entity.frame) {
                return;
            }
            entity.frame = frame;
            entity.setSize(frame.sourceSizeWidth, frame.sourceSizeHeight);
            entity.setBounds(entity.x, entity.y, entity.width, entity.height);
            if (frame.pivot) {
                entity.setOrigin(frame.pivot.x, frame.pivot.y);
            }
            let data = entity.vertexData;
            //  This rarely changes, so we'll set it here, rather than every game step:
            data[2] = frame.u0;
            data[3] = frame.v0;
            data[8] = frame.u0;
            data[9] = frame.v1;
            data[14] = frame.u1;
            data[15] = frame.v1;
            data[20] = frame.u1;
            data[21] = frame.v0;
            entity.setDirtyRender();
            entity.hasTexture = true;
        });
    }

    function SetTexture(key, frame, ...sprite) {
        sprite.forEach(entity => {
            if (!key) {
                return;
            }
            if (key instanceof Texture) {
                entity.texture = key;
            }
            else {
                entity.texture = GameInstance.get().textures.get(key);
            }
            if (!entity.texture) {
                console.warn('Invalid Texture key: ' + key);
            }
            else {
                SetFrame(frame, entity);
            }
        });
    }

    class Sprite extends Container {
        constructor(x, y, texture, frame) {
            super(x, y);
            this.hasTexture = false;
            this._tint = 0xffffff;
            this._prevTextureID = -1;
            this.vertexData = new Float32Array(24).fill(0);
            this.vertexColor = new Uint32Array(4).fill(4294967295);
            this.vertexAlpha = new Float32Array(4).fill(1);
            this.vertexTint = new Uint32Array(4).fill(0xffffff);
            this.type = 'Sprite';
            this.setTexture(texture, frame);
            this.setBounds(x, y, this.width, this.height);
        }
        getBounds(includeChildren = false) {
            if (this.dirtyRender) {
                this.updateVertices();
            }
            super.getBounds(includeChildren);
            return this.bounds;
        }
        setTexture(key, frame) {
            SetTexture(key, frame, this);
            return this;
        }
        setFrame(key) {
            SetFrame(key, this);
            return this;
        }
        isRenderable() {
            return (this.visible && this.willRender && this.hasTexture && this.alpha > 0);
        }
        updateVertices() {
            const data = this.vertexData;
            this.dirtyRender = false;
            const frame = this.frame;
            const originX = this.originX;
            const originY = this.originY;
            let w0;
            let w1;
            let h0;
            let h1;
            const [a, b, c, d, tx, ty] = this.worldTransform;
            if (frame.trimmed) {
                w1 = frame.spriteSourceSizeX - (originX * frame.sourceSizeWidth);
                w0 = w1 + frame.spriteSourceSizeWidth;
                h1 = frame.spriteSourceSizeY - (originY * frame.sourceSizeHeight);
                h0 = h1 + frame.spriteSourceSizeHeight;
            }
            else {
                w1 = -originX * frame.sourceSizeWidth;
                w0 = w1 + frame.sourceSizeWidth;
                h1 = -originY * frame.sourceSizeHeight;
                h0 = h1 + frame.sourceSizeHeight;
            }
            const x0 = (w1 * a) + (h1 * c) + tx;
            const y0 = (w1 * b) + (h1 * d) + ty;
            const x1 = (w1 * a) + (h0 * c) + tx;
            const y1 = (w1 * b) + (h0 * d) + ty;
            const x2 = (w0 * a) + (h0 * c) + tx;
            const y2 = (w0 * b) + (h0 * d) + ty;
            const x3 = (w0 * a) + (h1 * c) + tx;
            const y3 = (w0 * b) + (h1 * d) + ty;
            //  top left
            data[0] = x0;
            data[1] = y0;
            //  bottom left
            data[6] = x1;
            data[7] = y1;
            //  bottom right
            data[12] = x2;
            data[13] = y2;
            //  top right
            data[18] = x3;
            data[19] = y3;
            const bounds = this.bounds;
            bounds.x = Math.min(x0, x1, x2, x3);
            bounds.y = Math.min(y0, y1, y2, y3);
            bounds.right = Math.max(x0, x1, x2, x3);
            bounds.bottom = Math.max(y0, y1, y2, y3);
        }
        uploadBuffers(F32, U32, offset, setTexture = true) {
            //  Skip all of this if not dirty
            if (this.dirtyRender) {
                this.updateVertices();
            }
            const data = this.vertexData;
            const textureIndex = this.texture.glIndex;
            //  Do we have a different texture ID?
            if (setTexture && textureIndex !== this._prevTextureID) {
                this._prevTextureID = textureIndex;
                data[4] = textureIndex;
                data[10] = textureIndex;
                data[16] = textureIndex;
                data[22] = textureIndex;
            }
            //  Copy the data to the array buffer
            F32.set(data, offset);
            const color = this.vertexColor;
            //  Copy the vertex colors to the Uint32 view (as the data copy above overwrites them)
            U32[offset + 5] = color[0];
            U32[offset + 11] = color[2];
            U32[offset + 17] = color[3];
            U32[offset + 23] = color[1];
        }
        destroy(reparentChildren) {
            super.destroy(reparentChildren);
            this.texture = null;
            this.frame = null;
            this.hasTexture = false;
            this.vertexData = null;
            this.vertexColor = null;
            this.vertexAlpha = null;
            this.vertexTint = null;
        }
        get tint() {
            return this._tint;
        }
        set tint(value) {
            this._tint = value;
            // this.setTint(value);
        }
    }
    /*
        vertexData array structure:

        0 = topLeft.x
        1 = topLeft.y
        2 = frame.u0
        3 = frame.v0
        4 = textureIndex
        5 = topLeft.packedColor

        6 = bottomLeft.x
        7 = bottomLeft.y
        8 = frame.u0
        9 = frame.v1
        10 = textureIndex
        11 = bottomLeft.packedColor

        12 = bottomRight.x
        13 = bottomRight.y
        14 = frame.u1
        15 = frame.v1
        16 = textureIndex
        17 = bottomRight.packedColor

        18 = topRight.x
        19 = topRight.y
        20 = frame.u1
        21 = frame.v0
        22 = textureIndex
        23 = topRight.packedColor
    */

    class File {
        constructor(key, url, config) {
            this.responseType = 'text';
            this.crossOrigin = undefined;
            this.skipCache = false;
            this.hasLoaded = false;
            this.key = key;
            this.url = url;
            this.config = config;
        }
    }

    function ImageTagLoader(file) {
        file.data = new Image();
        if (file.crossOrigin) {
            file.data.crossOrigin = file.crossOrigin;
        }
        return new Promise((resolve, reject) => {
            file.data.onload = () => {
                if (file.data.onload) {
                    file.data.onload = null;
                    file.data.onerror = null;
                    resolve(file);
                }
            };
            file.data.onerror = (event) => {
                if (file.data.onload) {
                    file.data.onload = null;
                    file.data.onerror = null;
                    file.error = event;
                    reject(file);
                }
            };
            file.data.src = file.url;
            // Image is immediately-available or cached
            if (file.data.complete && file.data.width && file.data.height) {
                file.data.onload = null;
                file.data.onerror = null;
                resolve(file);
            }
        });
    }

    function GetURL(key, url, extension, loader) {
        if (!url) {
            url = key + extension;
        }
        if (url.match(/^(?:blob:|data:|http:\/\/|https:\/\/|\/\/)/)) {
            return url;
        }
        else {
            if (loader) {
                return loader.baseURL + loader.path + url;
            }
            else {
                return url;
            }
        }
    }

    function ImageFile(key, url) {
        const file = new File(key, url);
        file.load = () => {
            file.url = GetURL(file.key, file.url, '.png', file.loader);
            if (file.loader) {
                file.crossOrigin = file.loader.crossOrigin;
            }
            return new Promise((resolve, reject) => {
                const game = GameInstance.get();
                if (game.textures.has(file.key)) {
                    resolve(file);
                }
                else {
                    ImageTagLoader(file).then(file => {
                        game.textures.add(file.key, file.data);
                        resolve(file);
                    }).catch(file => {
                        reject(file);
                    });
                }
            });
        };
        return file;
    }

    function RemoveChild(parent, ...child) {
        const children = parent.children;
        child.forEach(entity => {
            let index = children.indexOf(entity);
            if (index > -1) {
                children.splice(index, 1);
                entity.parent = null;
            }
        });
    }

    function SetParent(parent, ...child) {
        child.forEach(entity => {
            if (entity.parent) {
                RemoveChild(entity.parent, entity);
            }
            entity.scene = parent.scene;
            entity.parent = parent;
        });
    }

    function AddChild(parent, ...child) {
        child.forEach(entity => {
            SetParent(parent, entity);
            parent.children.push(entity);
            entity.updateTransform();
        });
    }

    class Demo extends StaticScene {
        constructor() {
            super({ willUpdate: false });
            ImageFile('logo', 'assets/logo.png').load().then(() => {
                this.logo = new Sprite(400, 300, 'logo');
                const logo2 = new Sprite(400, 400, 'logo').setScale(0.5);
                AddChild(this.world, this.logo, logo2);
                this.willUpdate = true;
            });
        }
        update() {
            this.logo.rotation += 0.01;
        }
    }
    new Game({
        width: 800,
        height: 600,
        backgroundColor: 0x330033,
        parent: 'gameParent',
        scene: Demo
    });

}());
//# sourceMappingURL=sprite1.js.map
