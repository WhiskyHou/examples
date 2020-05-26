(function () {
    'use strict';

    function DepthFirstSearch(parent) {
        const stack = [parent];
        const output = [];
        while (stack.length > 0) {
            const node = stack.shift();
            output.push(node);
            const numChildren = node.numChildren;
            if (numChildren > 0) {
                for (let i = numChildren - 1; i >= 0; i--) {
                    stack.unshift(node.children[i]);
                }
            }
        }
        output.shift();
        return output;
    }

    function GetChildIndex(parent, child) {
        return parent.children.indexOf(child);
    }

    function RemoveChildAt(parent, index) {
        const children = parent.children;
        let child;
        if (index >= 0 && index < children.length) {
            const removed = children.splice(index, 1);
            if (removed[0]) {
                child = removed[0];
                child.parent = null;
            }
        }
        return child;
    }

    function RemoveChild(parent, child) {
        const currentIndex = GetChildIndex(parent, child);
        if (currentIndex > -1) {
            RemoveChildAt(parent, currentIndex);
        }
        return child;
    }

    const AddedToWorldEvent = 'addedtoworld';

    const RemovedFromWorldEvent = 'removedfromworld';

    function Emit(emitter, event, ...args) {
        if (emitter.events.size === 0 || !emitter.events.has(event)) {
            return false;
        }
        const listeners = emitter.events.get(event);
        for (const ee of listeners) {
            ee.callback.apply(ee.context, args);
            if (ee.once) {
                listeners.delete(ee);
            }
        }
        if (listeners.size === 0) {
            emitter.events.delete(event);
        }
        return true;
    }

    function SetWorld(world, ...children) {
        children.forEach(child => {
            if (child.world) {
                Emit(child.world, RemovedFromWorldEvent, child, child.world);
                Emit(child, RemovedFromWorldEvent, child, child.world);
            }
            child.world = world;
            Emit(world, AddedToWorldEvent, child, world);
            Emit(child, AddedToWorldEvent, child, world);
        });
        return children;
    }

    function SetParent(parent, ...children) {
        children.forEach(child => {
            if (child.parent) {
                RemoveChild(child.parent, child);
            }
            child.parent = parent;
        });
        const parentWorld = parent.world;
        if (parentWorld) {
            SetWorld(parentWorld, ...DepthFirstSearch(parent));
        }
        return children;
    }

    function AddChild(parent, child) {
        parent.children.push(child);
        SetParent(parent, child);
        child.transform.updateWorld();
        return child;
    }

    function AddChildren(parent, ...children) {
        children.forEach(child => {
            AddChild(parent, child);
        });
        return children;
    }

    const DIRTY_CONST = {
        CLEAR: 0,
        TRANSFORM: 1,
        UPDATE: 2,
        CHILD_CACHE: 4,
        POST_RENDER: 8,
        COLORS: 16,
        BOUNDS: 32,
        TEXTURE: 64,
        FRAME: 128,
        ALPHA: 256,
        CHILD: 512,
        DEFAULT: 1 + 2 + 16 + 32,
        USER1: 536870912,
        USER2: 1073741824,
        USER3: 2147483648,
        USER4: 4294967296
    };

    function RemoveChildrenBetween(parent, beginIndex = 0, endIndex) {
        const children = parent.children;
        if (endIndex === undefined) {
            endIndex = children.length;
        }
        const range = endIndex - beginIndex;
        if (range > 0 && range <= endIndex) {
            const removed = children.splice(beginIndex, range);
            removed.forEach(child => {
                child.parent = null;
            });
            return removed;
        }
        else {
            return [];
        }
    }

    function DestroyChildren(parent, beginIndex = 0, endIndex) {
        const removed = RemoveChildrenBetween(parent, beginIndex, endIndex);
        removed.forEach(child => {
            child.destroy();
        });
    }

    function RemoveChildren(parent, ...children) {
        children.forEach(child => {
            RemoveChild(parent, child);
        });
        return children;
    }

    function ReparentChildren(parent, newParent, beginIndex = 0, endIndex) {
        const moved = RemoveChildrenBetween(parent, beginIndex, endIndex);
        SetParent(newParent, ...moved);
        moved.forEach(child => {
            child.transform.updateWorld();
        });
        return moved;
    }

    let instance;
    let frame = 0;
    let elapsed = 0;
    const GameInstance = {
        get: () => {
            return instance;
        },
        set: (game) => {
            instance = game;
        },
        getFrame: () => {
            return frame;
        },
        setFrame: (current) => {
            frame = current;
        },
        getElapsed: () => {
            return elapsed;
        },
        setElapsed: (current) => {
            elapsed = current;
        }
    };

    let bgColor = 0;
    function BackgroundColor(color = 0) {
        return () => {
            bgColor = color;
        };
    }
    function GetBackgroundColor() {
        return bgColor;
    }

    let title = 'Phaser';
    let url = 'https://phaser4.io';
    let color = '#fff';
    let background = 'linear-gradient(#3e0081 40%, #00bcc3)';
    function GetBanner() {
        {
            const game = GameInstance.get();
            const version =  ' v' + game.VERSION ;
            console.log(`%c${title}${version}%c ${url}`, `padding: 4px 16px; color: ${color}; background: ${background}`, '');
        }
    }

    let _width = 800;
    let _height = 600;
    let _resolution = 1;
    function Size(width = 800, height = 600, resolution = 1) {
        if (resolution === 0) {
            resolution = window.devicePixelRatio;
        }
        return () => {
            _width = width;
            _height = height;
            _resolution = resolution;
        };
    }
    function GetWidth() {
        return _width;
    }
    function GetHeight() {
        return _height;
    }
    function GetResolution() {
        return _resolution;
    }

    const queue = [];
    const BindingQueue = {
        add: (texture) => {
            queue.push(texture);
        },
        get: () => {
            return queue;
        },
        clear: () => {
            queue.length = 0;
        }
    };

    let instance$1;
    function SetRenderer(renderer) {
        instance$1 = renderer;
    }
    function GetRenderer() {
        return instance$1;
    }

    let originX = 0.5;
    let originY = 0.5;

    let maxTextures = 0;
    function SetMaxTextures(max) {
        maxTextures = max;
    }
    function GetMaxTextures() {
        return maxTextures;
    }

    function GetElement(target) {
        let element;
        if (target) {
            if (typeof target === 'string') {
                element = document.getElementById(target);
            }
            else if (typeof target === 'object' && target.nodeType === 1) {
                element = target;
            }
        }
        if (!element) {
            element = document.body;
        }
        return element;
    }

    let parent;
    function Parent(parentElement) {
        return () => {
            if (parentElement) {
                parent = GetElement(parentElement);
            }
        };
    }
    function GetParent() {
        return parent;
    }

    let _scenes = [];
    function Scenes(scenes) {
        return () => {
            _scenes = [].concat(scenes);
        };
    }
    function GetScenes() {
        return _scenes;
    }

    let _contextAttributes = {
        alpha: false,
        antialias: false,
        depth: false,
        premultipliedAlpha: false
    };
    function GetWebGLContext() {
        return _contextAttributes;
    }

    class FBOSystem {
        constructor(renderer) {
            this.stack = [];
            this.current = null;
            this.renderer = renderer;
        }
        reset() {
            this.stack = [];
            this.current = null;
            const renderer = this.renderer;
            const gl = renderer.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, renderer.width, renderer.height);
        }
        add(framebuffer, clear = true, width = 0, height = 0) {
            this.stack.push({ framebuffer, width, height });
            this.set(framebuffer, clear, width, height);
        }
        set(framebuffer, clear = true, width = 0, height = 0) {
            const renderer = this.renderer;
            const gl = renderer.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            if (clear) {
                gl.clearColor(0, 0, 0, 0);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            if (width > 0) {
                gl.viewport(0, 0, width, height);
            }
            this.current = framebuffer;
        }
        pop() {
            this.stack.pop();
            const len = this.stack.length;
            if (len > 0) {
                const entry = this.stack[len - 1];
                this.set(entry.framebuffer, false, entry.width, entry.height);
            }
            else {
                this.reset();
            }
        }
        rebind() {
            const gl = this.renderer.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.current);
        }
        destroy() {
            this.stack = [];
        }
    }

    let gl;
    const GL = {
        get: () => {
            return gl;
        },
        set: (context) => {
            gl = context;
        }
    };

    function GetRGBArray(color, output = []) {
        const r = color >> 16 & 0xFF;
        const g = color >> 8 & 0xFF;
        const b = color & 0xFF;
        const a = (color > 16777215) ? color >>> 24 : 255;
        output[0] = r / 255;
        output[1] = g / 255;
        output[2] = b / 255;
        output[3] = a / 255;
        return output;
    }

    function ExactEquals(a, b) {
        return (a.a === b.a &&
            a.b === b.b &&
            a.c === b.c &&
            a.d === b.d &&
            a.tx === b.tx &&
            a.ty === b.ty);
    }

    function CreateFramebuffer(texture, attachment) {
        const gl = GL.get();
        if (!attachment) {
            attachment = gl.COLOR_ATTACHMENT0;
        }
        const framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, texture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return framebuffer;
    }

    function CreateGLTexture(binding) {
        const gl = GL.get();
        if (!gl) {
            return;
        }
        const { parent, flipY, unpackPremultiplyAlpha, minFilter, magFilter, wrapS, wrapT, generateMipmap, isPOT } = binding;
        const source = parent.image;
        let width = parent.width;
        let height = parent.height;
        const glTexture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, glTexture);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, unpackPremultiplyAlpha);
        if (source) {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            width = source.width;
            height = source.height;
        }
        else {
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        }
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
        if (generateMipmap && isPOT) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        binding.texture = glTexture;
        return glTexture;
    }

    function DeleteFramebuffer(framebuffer) {
        const gl = GL.get();
        if (gl && gl.isFramebuffer(framebuffer)) {
            gl.deleteFramebuffer(framebuffer);
        }
    }

    function DeleteGLTexture(texture) {
        const gl = GL.get();
        if (!gl) {
            return;
        }
        if (gl.isTexture(texture)) {
            gl.deleteTexture(texture);
        }
    }

    function IsSizePowerOfTwo(width, height) {
        if (width < 1 || height < 1) {
            return false;
        }
        return ((width & (width - 1)) === 0) && ((height & (height - 1)) === 0);
    }

    function SetGLTextureFilterMode(texture, linear = true) {
        const gl = GL.get();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        const mode = (linear) ? gl.LINEAR : gl.NEAREST;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mode);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, mode);
    }

    function UpdateGLTexture(binding) {
        const gl = GL.get();
        const source = binding.parent.image;
        const width = source.width;
        const height = source.height;
        if (width > 0 && height > 0) {
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, binding.texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, binding.flipY);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
        }
        return binding.texture;
    }

    class GLTextureBinding {
        constructor(parent, config = {}) {
            this.index = 0;
            this.indexCounter = -1;
            this.dirtyIndex = true;
            this.unpackPremultiplyAlpha = true;
            this.flipY = false;
            this.isPOT = false;
            this.generateMipmap = false;
            const gl = GL.get();
            this.parent = parent;
            this.isPOT = IsSizePowerOfTwo(parent.width, parent.height);
            const { texture = null, framebuffer = null, unpackPremultiplyAlpha = true, minFilter = gl.LINEAR, magFilter = gl.LINEAR, wrapS = gl.CLAMP_TO_EDGE, wrapT = gl.CLAMP_TO_EDGE, generateMipmap = this.isPOT, flipY = false } = config;
            this.minFilter = minFilter;
            this.magFilter = magFilter;
            this.wrapS = wrapS;
            this.wrapT = wrapT;
            this.generateMipmap = generateMipmap;
            this.flipY = flipY;
            this.unpackPremultiplyAlpha = unpackPremultiplyAlpha;
            if (framebuffer) {
                this.framebuffer = framebuffer;
            }
            if (texture) {
                this.texture = texture;
            }
            else {
                CreateGLTexture(this);
            }
        }
        setFilter(linear) {
            if (this.texture) {
                SetGLTextureFilterMode(this.texture, linear);
            }
        }
        create() {
            const texture = this.texture;
            if (texture) {
                DeleteGLTexture(texture);
            }
            return CreateGLTexture(this);
        }
        update() {
            const texture = this.texture;
            if (!texture) {
                return CreateGLTexture(this);
            }
            else {
                return UpdateGLTexture(this);
            }
        }
        setIndex(index) {
            this.dirtyIndex = (index !== this.index);
            this.index = index;
        }
        destroy() {
            DeleteGLTexture(this.texture);
            DeleteFramebuffer(this.framebuffer);
            this.parent = null;
            this.texture = null;
            this.framebuffer = null;
        }
    }

    class IndexedBuffer {
        constructor(batchSize, dataSize, indexSize, vertexElementSize, quadIndexSize) {
            this.batchSize = batchSize;
            this.dataSize = dataSize;
            this.indexSize = indexSize;
            this.vertexElementSize = vertexElementSize;
            this.quadIndexSize = quadIndexSize;
            this.vertexByteSize = vertexElementSize * dataSize;
            this.quadByteSize = this.vertexByteSize * 4;
            this.quadElementSize = vertexElementSize * 4;
            this.bufferByteSize = batchSize * this.quadByteSize;
            this.create();
        }
        create() {
            let ibo = [];
            for (let i = 0; i < (this.batchSize * this.indexSize); i += this.indexSize) {
                ibo.push(i + 0, i + 1, i + 2, i + 2, i + 3, i + 0);
            }
            this.data = new ArrayBuffer(this.bufferByteSize);
            this.index = new Uint16Array(ibo);
            this.vertexViewF32 = new Float32Array(this.data);
            this.vertexViewU32 = new Uint32Array(this.data);
            const gl = GL.get();
            this.vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.data, gl.DYNAMIC_DRAW);
            this.indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.index, gl.STATIC_DRAW);
            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            ibo = [];
        }
        destroy() {
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
        getExtent(originX, originY) {
            const sourceSizeWidth = this.sourceSizeWidth;
            const sourceSizeHeight = this.sourceSizeHeight;
            let left;
            let right;
            let top;
            let bottom;
            if (this.trimmed) {
                left = this.spriteSourceSizeX - (originX * sourceSizeWidth);
                right = left + this.spriteSourceSizeWidth;
                top = this.spriteSourceSizeY - (originY * sourceSizeHeight);
                bottom = top + this.spriteSourceSizeHeight;
            }
            else {
                left = -originX * sourceSizeWidth;
                right = left + sourceSizeWidth;
                top = -originY * sourceSizeHeight;
                bottom = top + sourceSizeHeight;
            }
            return { left, right, top, bottom };
        }
        setExtent(child) {
            const transform = child.transform;
            const originX = transform.origin.x;
            const originY = transform.origin.y;
            const sourceSizeWidth = this.sourceSizeWidth;
            const sourceSizeHeight = this.sourceSizeHeight;
            let x;
            let y;
            let width;
            let height;
            if (this.trimmed) {
                x = this.spriteSourceSizeX - (originX * sourceSizeWidth);
                y = this.spriteSourceSizeY - (originY * sourceSizeHeight);
                width = this.spriteSourceSizeWidth;
                height = this.spriteSourceSizeHeight;
            }
            else {
                x = -originX * sourceSizeWidth;
                y = -originY * sourceSizeHeight;
                width = sourceSizeWidth;
                height = sourceSizeHeight;
            }
            transform.setExtent(x, y, width, height);
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

    class Texture {
        constructor(image, width, height) {
            this.key = '';
            if (image) {
                width = image.width;
                height = image.height;
            }
            this.image = image;
            this.width = width;
            this.height = height;
            this.frames = new Map();
            this.data = {};
            this.addFrame('__BASE', 0, 0, width, height);
            BindingQueue.add(this);
        }
        addFrame(key, x, y, width, height) {
            if (this.frames.has(key)) {
                return null;
            }
            const frame = new Frame(this, key, x, y, width, height);
            this.frames.set(key, frame);
            if (!this.firstFrame || this.firstFrame.key === '__BASE') {
                this.firstFrame = frame;
            }
            return frame;
        }
        getFrame(key) {
            if (!key) {
                return this.firstFrame;
            }
            if (key instanceof Frame) {
                key = key.key;
            }
            let frame = this.frames.get(key);
            if (!frame) {
                console.warn(`Frame missing: ${key}`);
                frame = this.firstFrame;
            }
            return frame;
        }
        setSize(width, height) {
            this.width = width;
            this.height = height;
            const frame = this.frames.get('__BASE');
            frame.setSize(width, height);
        }
        destroy() {
            if (this.binding) {
                this.binding.destroy();
            }
            this.frames.clear();
            this.data = null;
            this.image = null;
            this.firstFrame = null;
        }
    }

    let instance$2;
    const WebGLRendererInstance = {
        get: () => {
            return instance$2;
        },
        set: (renderer) => {
            instance$2 = renderer;
        }
    };

    const shaderSource = {
        fragmentShader: `
#define SHADER_NAME SINGLE_QUAD_FRAG

precision highp float;

varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vTintColor;

uniform sampler2D uTexture;

void main (void)
{
    vec4 color = texture2D(uTexture, vTextureCoord);

    gl_FragColor = color * vec4(vTintColor.bgr * vTintColor.a, vTintColor.a);
}`,
        vertexShader: `
#define SHADER_NAME SINGLE_QUAD_VERT

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
    class SingleTextureQuadShader {
        constructor(config = {}) {
            this.attribs = { aVertexPosition: 0, aTextureCoord: 0, aTextureId: 0, aTintColor: 0 };
            this.uniforms = { uProjectionMatrix: 0, uCameraMatrix: 0, uTexture: 0, uTime: 0, uResolution: 0 };
            this.renderToFBO = false;
            this.renderer = WebGLRendererInstance.get();
            const { batchSize = 4096, dataSize = 4, indexSize = 4, vertexElementSize = 6, quadIndexSize = 6, fragmentShader = shaderSource.fragmentShader, vertexShader = shaderSource.vertexShader, width = GetWidth(), height = GetHeight(), resolution = GetResolution(), renderToFBO = false } = config;
            this.buffer = new IndexedBuffer(batchSize, dataSize, indexSize, vertexElementSize, quadIndexSize);
            this.createShaders(fragmentShader, vertexShader);
            this.count = 0;
            this.renderToFBO = renderToFBO;
            const texture = new Texture(null, width * resolution, height * resolution);
            const binding = new GLTextureBinding(texture);
            texture.binding = binding;
            binding.framebuffer = CreateFramebuffer(binding.texture);
            this.texture = texture;
            this.framebuffer = binding.framebuffer;
        }
        createShaders(fragmentShaderSource, vertexShaderSource) {
            const gl = this.renderer.gl;
            const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fragmentShader, fragmentShaderSource);
            gl.compileShader(fragmentShader);
            let failed = false;
            let message = gl.getShaderInfoLog(fragmentShader);
            if (message.length > 0) {
                failed = true;
                console.error(message);
            }
            const vertexShader = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vertexShader, vertexShaderSource);
            gl.compileShader(vertexShader);
            message = gl.getShaderInfoLog(fragmentShader);
            if (message.length > 0) {
                failed = true;
                console.error(message);
            }
            if (failed) {
                return;
            }
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            gl.useProgram(program);
            this.program = program;
            for (const key of Object.keys(this.attribs)) {
                const location = gl.getAttribLocation(program, key);
                gl.enableVertexAttribArray(location);
                this.attribs[key] = location;
            }
            for (const key of Object.keys(this.uniforms)) {
                this.uniforms[key] = gl.getUniformLocation(program, key);
            }
        }
        bind(projectionMatrix, cameraMatrix, textureID) {
            if (!this.program) {
                return false;
            }
            const renderer = this.renderer;
            const gl = renderer.gl;
            const uniforms = this.uniforms;
            gl.useProgram(this.program);
            gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(uniforms.uCameraMatrix, false, cameraMatrix);
            gl.uniform1i(uniforms.uTexture, renderer.textures.textureIndex[textureID]);
            gl.uniform1f(uniforms.uTime, performance.now());
            gl.uniform2f(uniforms.uResolution, renderer.width, renderer.height);
            this.bindBuffers(this.buffer.indexBuffer, this.buffer.vertexBuffer);
            return true;
        }
        bindBuffers(indexBuffer, vertexBuffer) {
            const gl = this.renderer.gl;
            const stride = this.buffer.vertexByteSize;
            const attribs = this.attribs;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.vertexAttribPointer(attribs.aVertexPosition, 2, gl.FLOAT, false, stride, 0);
            gl.vertexAttribPointer(attribs.aTextureCoord, 2, gl.FLOAT, false, stride, 8);
            gl.vertexAttribPointer(attribs.aTextureId, 1, gl.FLOAT, false, stride, 16);
            gl.vertexAttribPointer(attribs.aTintColor, 4, gl.UNSIGNED_BYTE, true, stride, 20);
            this.count = 0;
        }
        draw(count) {
            const renderer = this.renderer;
            const gl = renderer.gl;
            const buffer = this.buffer;
            if (count === buffer.batchSize) {
                gl.bufferData(gl.ARRAY_BUFFER, buffer.data, gl.DYNAMIC_DRAW);
            }
            else {
                const view = buffer.vertexViewF32.subarray(0, count * buffer.quadElementSize);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
            }
            if (this.renderToFBO) {
                renderer.fbo.add(this.framebuffer, true);
            }
            gl.drawElements(gl.TRIANGLES, count * buffer.quadIndexSize, gl.UNSIGNED_SHORT, 0);
            if (this.renderToFBO) {
                renderer.fbo.pop();
            }
        }
        flush() {
            const count = this.count;
            if (count === 0) {
                return false;
            }
            this.draw(count);
            this.prevCount = count;
            this.count = 0;
            return true;
        }
    }

    const fragmentShader = `
#define SHADER_NAME MULTI_QUAD_FRAG

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
}`;
    class MultiTextureQuadShader extends SingleTextureQuadShader {
        constructor(config = { fragmentShader }) {
            super(config);
        }
        createShaders(fragmentShaderSource, vertexShaderSource) {
            const maxTextures = GetMaxTextures();
            let src = '';
            for (let i = 1; i < maxTextures; i++) {
                if (i > 1) {
                    src += '\n\telse ';
                }
                if (i < maxTextures - 1) {
                    src += `if (vTextureId < ${i}.5)`;
                }
                src += '\n\t{';
                src += `\n\t\tcolor = texture2D(uTexture[${i}], vTextureCoord);`;
                src += '\n\t}';
            }
            fragmentShaderSource = fragmentShaderSource.replace(/%count%/gi, `${maxTextures}`);
            fragmentShaderSource = fragmentShaderSource.replace(/%forloop%/gi, src);
            super.createShaders(fragmentShaderSource, vertexShaderSource);
        }
        bind(projectionMatrix, cameraMatrix) {
            if (!this.program) {
                return false;
            }
            const renderer = this.renderer;
            const gl = renderer.gl;
            const uniforms = this.uniforms;
            gl.useProgram(this.program);
            gl.uniformMatrix4fv(uniforms.uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(uniforms.uCameraMatrix, false, cameraMatrix);
            gl.uniform1iv(uniforms.uTexture, renderer.textures.textureIndex);
            gl.uniform1f(uniforms.uTime, performance.now());
            gl.uniform2f(uniforms.uResolution, renderer.width, renderer.height);
            this.bindBuffers(this.buffer.indexBuffer, this.buffer.vertexBuffer);
            return true;
        }
    }

    function Ortho(width, height, near = -1, far = 1) {
        const m00 = -2 * (1 / -width);
        const m11 = -2 * (1 / height);
        const m22 = 2 * (1 / (near - far));
        return new Float32Array([m00, 0, 0, 0, 0, m11, 0, 0, 0, 0, m22, 0, -1, 1, 0, 1]);
    }

    class ShaderSystem {
        constructor(renderer, currentShader) {
            this.renderer = renderer;
            const stackEntry = {
                shader: new currentShader()
            };
            this.stack = [stackEntry];
            this.currentEntry = stackEntry;
            this.current = stackEntry.shader;
            this.singleQuadShader = new SingleTextureQuadShader();
        }
        add(shader, textureID) {
            const stackEntry = { shader, textureID };
            this.stack.push(stackEntry);
            return stackEntry;
        }
        set(shader, textureID) {
            this.flush();
            const renderer = this.renderer;
            const projectionMatrix = renderer.projectionMatrix;
            const cameraMatrix = renderer.currentCamera.matrix;
            const success = shader.bind(projectionMatrix, cameraMatrix, textureID);
            if (success) {
                const entry = this.add(shader, textureID);
                this.currentEntry = entry;
                this.current = shader;
            }
            return success;
        }
        setDefault(textureID) {
            this.set(this.singleQuadShader, textureID);
        }
        pop() {
            this.flush();
            const stack = this.stack;
            if (stack.length > 1) {
                stack.pop();
            }
            this.currentEntry = stack[stack.length - 1];
            this.current = this.currentEntry.shader;
        }
        reset() {
            this.pop();
            this.rebind();
        }
        flush() {
            if (this.current.flush()) {
                this.renderer.flushTotal++;
                return true;
            }
            return false;
        }
        rebind() {
            const renderer = this.renderer;
            const projectionMatrix = renderer.projectionMatrix;
            const cameraMatrix = renderer.currentCamera.matrix;
            const current = this.currentEntry;
            current.shader.bind(projectionMatrix, cameraMatrix, current.textureID);
        }
        popAndRebind() {
            this.pop();
            this.rebind();
        }
        clear() {
        }
        destroy() {
        }
    }

    const fragTemplate = [
        'precision mediump float;',
        'void main(void){',
        'float test = 0.1;',
        '%forloop%',
        'gl_FragColor = vec4(0.0);',
        '}'
    ].join('\n');
    function GenerateSrc(maxIfs) {
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
    function CheckShaderMaxIfStatements(maxIfs, gl) {
        const shader = gl.createShader(gl.FRAGMENT_SHADER);
        while (true) {
            const fragmentSrc = fragTemplate.replace(/%forloop%/gi, GenerateSrc(maxIfs));
            gl.shaderSource(shader, fragmentSrc);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                maxIfs = (maxIfs / 2) | 0;
            }
            else {
                break;
            }
        }
        return maxIfs;
    }

    class TextureSystem {
        constructor(renderer) {
            this.startActiveTexture = 0;
            this.renderer = renderer;
            this.tempTextures = [];
            this.textureIndex = [];
        }
        init() {
            const gl = this.renderer.gl;
            let maxGPUTextures = CheckShaderMaxIfStatements(gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS), gl);
            const maxConfigTextures = GetMaxTextures();
            if (maxConfigTextures === 0 || (maxConfigTextures > 0 && maxConfigTextures > maxGPUTextures)) {
                SetMaxTextures(maxGPUTextures);
            }
            else if (maxConfigTextures > 0 && maxConfigTextures < maxGPUTextures) {
                maxGPUTextures = Math.max(8, maxConfigTextures);
            }
            const tempTextures = this.tempTextures;
            if (tempTextures.length) {
                tempTextures.forEach(texture => {
                    gl.deleteTexture(texture);
                });
            }
            const index = [];
            for (let texturesIndex = 0; texturesIndex < maxGPUTextures; texturesIndex++) {
                const tempTexture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE0 + texturesIndex);
                gl.bindTexture(gl.TEXTURE_2D, tempTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 255, 255]));
                tempTextures[texturesIndex] = tempTexture;
                index.push(texturesIndex);
            }
            this.maxTextures = maxGPUTextures;
            this.textureIndex = index;
            this.currentActiveTexture = 1;
        }
        update() {
            const queue = BindingQueue.get();
            for (let i = 0; i < queue.length; i++) {
                const texture = queue[i];
                if (!texture.binding) {
                    texture.binding = new GLTextureBinding(texture);
                }
            }
            BindingQueue.clear();
        }
        reset() {
            const gl = this.renderer.gl;
            const temp = this.tempTextures;
            for (let i = 0; i < temp.length; i++) {
                gl.activeTexture(gl.TEXTURE0 + i);
                gl.bindTexture(gl.TEXTURE_2D, temp[i]);
            }
            this.currentActiveTexture = 1;
            this.startActiveTexture++;
        }
        bind(texture, index = 0) {
            const gl = this.renderer.gl;
            const binding = texture.binding;
            binding.setIndex(index);
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, binding.texture);
        }
        unbind(index = 0) {
            const gl = this.renderer.gl;
            gl.activeTexture(gl.TEXTURE0 + index);
            gl.bindTexture(gl.TEXTURE_2D, this.tempTextures[index]);
            if (index > 0) {
                this.startActiveTexture++;
            }
        }
        request(texture) {
            const gl = this.renderer.gl;
            const binding = texture.binding;
            const currentActiveTexture = this.currentActiveTexture;
            if (binding.indexCounter >= this.startActiveTexture) {
                return false;
            }
            binding.indexCounter = this.startActiveTexture;
            if (currentActiveTexture < this.maxTextures) {
                binding.setIndex(currentActiveTexture);
                gl.activeTexture(gl.TEXTURE0 + currentActiveTexture);
                gl.bindTexture(gl.TEXTURE_2D, binding.texture);
                this.currentActiveTexture++;
            }
            else {
                this.renderer.flush();
                this.startActiveTexture++;
                binding.indexCounter = this.startActiveTexture;
                binding.setIndex(1);
                gl.activeTexture(gl.TEXTURE1);
                gl.bindTexture(gl.TEXTURE_2D, binding.texture);
                this.currentActiveTexture = 2;
            }
            return true;
        }
    }

    class WebGLRenderer {
        constructor() {
            this.clearColor = [0, 0, 0, 1];
            this.flushTotal = 0;
            this.clearBeforeRender = true;
            this.optimizeRedraw = false;
            this.autoResize = true;
            this.contextLost = false;
            this.currentCamera = null;
            this.width = GetWidth();
            this.height = GetHeight();
            this.resolution = GetResolution();
            this.setBackgroundColor(GetBackgroundColor());
            const canvas = document.createElement('canvas');
            canvas.addEventListener('webglcontextlost', (event) => this.onContextLost(event), false);
            canvas.addEventListener('webglcontextrestored', () => this.onContextRestored(), false);
            this.canvas = canvas;
            this.fbo = new FBOSystem(this);
            this.textures = new TextureSystem(this);
            this.initContext();
            WebGLRendererInstance.set(this);
            this.shaders = new ShaderSystem(this, MultiTextureQuadShader);
        }
        initContext() {
            const gl = this.canvas.getContext('webgl', GetWebGLContext());
            GL.set(gl);
            this.gl = gl;
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            this.resize(this.width, this.height, this.resolution);
            this.textures.init();
        }
        resize(width, height, resolution = 1) {
            this.width = width * resolution;
            this.height = height * resolution;
            this.resolution = resolution;
            const canvas = this.canvas;
            canvas.width = this.width;
            canvas.height = this.height;
            if (this.autoResize) {
                canvas.style.width = (this.width / resolution).toString() + 'px';
                canvas.style.height = (this.height / resolution).toString() + 'px';
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
            GetRGBArray(color, this.clearColor);
            return this;
        }
        reset(framebuffer = null, width = this.width, height = this.height) {
            const gl = this.gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            gl.viewport(0, 0, width, height);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            this.flushTotal = 0;
            this.currentCamera = null;
            this.textures.update();
        }
        render(renderData) {
            if (this.contextLost) {
                return;
            }
            this.reset();
            if (this.optimizeRedraw && renderData.numDirtyFrames === 0 && renderData.numDirtyCameras === 0) {
                return;
            }
            const gl = this.gl;
            if (this.clearBeforeRender) {
                const cls = this.clearColor;
                gl.clearColor(cls[0], cls[1], cls[2], cls[3]);
                gl.clear(gl.COLOR_BUFFER_BIT);
            }
            const worlds = renderData.worldData;
            for (let i = 0; i < worlds.length; i++) {
                const { camera, renderList } = worlds[i];
                if (!this.currentCamera || !ExactEquals(camera.worldTransform, this.currentCamera.worldTransform)) {
                    this.flush();
                    this.currentCamera = camera;
                    this.shaders.rebind();
                }
                renderList.forEach(entry => {
                    if (entry.children.length) {
                        this.renderNode(entry);
                    }
                    else {
                        entry.node.renderGL(this);
                    }
                });
            }
            this.flush();
        }
        renderNode(entry) {
            entry.node.renderGL(this);
            entry.children.forEach(child => {
                if (child.children.length > 0) {
                    this.renderNode(child);
                }
                else {
                    child.node.renderGL(this);
                }
            });
            entry.node.postRenderGL(this);
        }
        flush() {
            this.shaders.flush();
        }
        destroy() {
            WebGLRendererInstance.set(undefined);
        }
    }

    function WebGLRenderer$1() {
        return () => {
            SetRenderer(WebGLRenderer);
        };
    }

    class Matrix2D {
        constructor(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
            this.set(a, b, c, d, tx, ty);
        }
        set(a = 1, b = 0, c = 0, d = 1, tx = 0, ty = 0) {
            this.a = a;
            this.b = b;
            this.c = c;
            this.d = d;
            this.tx = tx;
            this.ty = ty;
            return this;
        }
        identity() {
            return this.set();
        }
        toArray() {
            return [this.a, this.b, this.c, this.d, this.tx, this.ty];
        }
        fromArray(src) {
            return this.set(src[0], src[1], src[2], src[3], src[4], src[5]);
        }
    }

    function Contains(rect, x, y) {
        if (rect.width <= 0 || rect.height <= 0) {
            return false;
        }
        return (rect.x <= x && rect.x + rect.width >= x && rect.y <= y && rect.y + rect.height >= y);
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
        contains(x, y) {
            return Contains(this, x, y);
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
    }

    function NOOP() {
    }

    class Vec2Callback {
        constructor(callback, x = 0, y = 0, compareValue = false) {
            this.compareValue = false;
            this._x = x;
            this._y = y;
            this.callback = callback;
            this.compareValue = compareValue;
        }
        set(x = 0, y = 0) {
            this._x = x;
            this._y = y;
            this.callback(this);
            return this;
        }
        destroy() {
            this.callback = NOOP;
        }
        set x(value) {
            if (!this.compareValue || (this.compareValue && value !== this._x)) {
                this._x = value;
                this.callback(this);
            }
        }
        get x() {
            return this._x;
        }
        set y(value) {
            if (!this.compareValue || (this.compareValue && value !== this._x)) {
                this._y = value;
                this.callback(this);
            }
        }
        get y() {
            return this._y;
        }
    }

    class StaticCamera {
        constructor() {
            this.type = 'StaticCamera';
            this.dirtyRender = true;
            const game = GameInstance.get();
            this.renderer = game.renderer;
            this.matrix = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
            this.bounds = new Rectangle();
            this.worldTransform = new Matrix2D();
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
            this.world = null;
            this.worldTransform = null;
            this.renderer = null;
            this.matrix = null;
            this.bounds = null;
        }
    }

    const DestroyEvent = 'destroy';

    const PostUpdateEvent = 'postupdate';

    const UpdateEvent = 'update';

    function AddToDOM(element, parent) {
        const target = GetElement(parent);
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

    class EventEmitter {
        constructor() {
            this.events = new Map();
        }
    }

    class EventInstance {
        constructor(callback, context, once = false) {
            this.callback = callback;
            this.context = context;
            this.once = once;
        }
    }

    function Off(emitter, event, callback, context, once) {
        const events = emitter.events;
        const listeners = events.get(event);
        if (!callback) {
            events.delete(event);
        }
        else if (callback instanceof EventInstance) {
            listeners.delete(callback);
        }
        else {
            const hasContext = !context;
            const hasOnce = (once !== undefined);
            for (const listener of listeners) {
                if ((listener.callback === callback) &&
                    (hasContext && listener.context === context) &&
                    (hasOnce && listener.once === once)) {
                    listeners.delete(listener);
                }
            }
        }
        if (listeners.size === 0) {
            events.delete(event);
        }
        return emitter;
    }

    function On(emitter, event, callback, context = emitter, once = false) {
        if (typeof callback !== 'function') {
            throw new TypeError('Listener not a function');
        }
        const listener = new EventInstance(callback, context, once);
        const listeners = emitter.events.get(event);
        if (!listeners) {
            emitter.events.set(event, new Set([listener]));
        }
        else {
            listeners.add(listener);
        }
        return listener;
    }

    function Once(emitter, event, callback, context = emitter) {
        return On(emitter, event, callback, context, true);
    }

    function CreateSceneRenderData() {
        return {
            gameFrame: 0,
            numTotalFrames: 0,
            numDirtyFrames: 0,
            numDirtyCameras: 0,
            worldData: []
        };
    }

    function ResetSceneRenderData(renderData, gameFrame = 0) {
        renderData.gameFrame = gameFrame;
        renderData.numTotalFrames = 0;
        renderData.numDirtyFrames = 0;
        renderData.numDirtyCameras = 0;
        renderData.worldData.length = 0;
    }

    let instance$3;
    const SceneManagerInstance = {
        get: () => {
            return instance$3;
        },
        set: (manager) => {
            instance$3 = manager;
        }
    };

    class SceneManager {
        constructor() {
            this.scenes = new Map();
            this.sceneIndex = 0;
            this.flush = false;
            this.renderResult = CreateSceneRenderData();
            this.game = GameInstance.get();
            SceneManagerInstance.set(this);
            Once(this.game, 'boot', () => this.boot());
        }
        boot() {
            GetScenes().forEach(scene => new scene());
        }
        update(delta, time) {
            for (const scene of this.scenes.values()) {
                Emit(scene, 'update', delta, time);
            }
        }
        render(gameFrame) {
            const results = this.renderResult;
            ResetSceneRenderData(results, gameFrame);
            for (const scene of this.scenes.values()) {
                Emit(scene, 'render', results);
            }
            if (this.flush) {
                results.numDirtyFrames++;
                this.flush = false;
            }
            return results;
        }
    }

    function CreateCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas.getContext('2d');
    }

    let instance$4;
    const TextureManagerInstance = {
        get: () => {
            return instance$4;
        },
        set: (manager) => {
            instance$4 = manager;
        }
    };

    class TextureManager {
        constructor() {
            this.textures = new Map();
            this.createDefaultTextures();
            TextureManagerInstance.set(this);
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
            const textures = this.textures;
            if (textures.has(key)) {
                return textures.get(key);
            }
            else {
                return textures.get('__MISSING');
            }
        }
        has(key) {
            return this.textures.has(key);
        }
        add(key, source) {
            let texture;
            const textures = this.textures;
            if (!textures.has(key)) {
                if (source instanceof Texture) {
                    texture = source;
                }
                else {
                    texture = new Texture(source);
                }
                texture.key = key;
                textures.set(key, texture);
            }
            return texture;
        }
    }

    class Game extends EventEmitter {
        constructor(...settings) {
            super();
            this.VERSION = '4.0.0-beta1';
            this.isBooted = false;
            this.isPaused = false;
            this.willUpdate = true;
            this.willRender = true;
            this.lastTick = 0;
            this.elapsed = 0;
            this.frame = 0;
            GameInstance.set(this);
            DOMContentLoaded(() => this.boot(settings));
        }
        boot(settings) {
            settings.forEach(setting => setting());
            const renderer = GetRenderer();
            this.renderer = new renderer();
            this.textureManager = new TextureManager();
            this.sceneManager = new SceneManager();
            const parent = GetParent();
            if (parent) {
                AddToDOM(this.renderer.canvas, parent);
            }
            this.isBooted = true;
            GetBanner();
            Emit(this, 'boot');
            this.lastTick = performance.now();
            this.step(this.lastTick);
        }
        pause() {
            this.isPaused = true;
        }
        resume() {
            this.isPaused = false;
            this.lastTick = performance.now();
        }
        step(time) {
            const delta = time - this.lastTick;
            this.lastTick = time;
            this.elapsed += delta;
            if (!this.isPaused) {
                if (this.willUpdate) {
                    this.sceneManager.update(delta, time);
                    Emit(this, 'update', delta, time);
                }
                if (this.willRender) {
                    this.renderer.render(this.sceneManager.render(this.frame));
                }
            }
            this.frame++;
            GameInstance.setFrame(this.frame);
            GameInstance.setElapsed(this.elapsed);
            requestAnimationFrame(now => this.step(now));
        }
        destroy() {
        }
    }

    function BatchTexturedQuad(sprite, renderer) {
        const texture = sprite.texture;
        const shader = renderer.shaders.current;
        const buffer = shader.buffer;
        const binding = texture.binding;
        if (shader.count === buffer.batchSize) {
            renderer.flush();
        }
        const data = sprite.vertexData;
        renderer.textures.request(texture);
        const textureIndex = binding.index;
        data[4] = textureIndex;
        data[10] = textureIndex;
        data[16] = textureIndex;
        data[22] = textureIndex;
        const offset = shader.count * buffer.quadElementSize;
        buffer.vertexViewF32.set(data, offset);
        const color = sprite.vertexColor;
        const U32 = buffer.vertexViewU32;
        U32[offset + 5] = color[0];
        U32[offset + 11] = color[2];
        U32[offset + 17] = color[3];
        U32[offset + 23] = color[1];
        shader.count++;
    }

    function GetVertices(transform) {
        const { a, b, c, d, tx, ty } = transform.world;
        const { x, y, right, bottom } = transform.extent;
        const x0 = (x * a) + (y * c) + tx;
        const y0 = (x * b) + (y * d) + ty;
        const x1 = (x * a) + (bottom * c) + tx;
        const y1 = (x * b) + (bottom * d) + ty;
        const x2 = (right * a) + (bottom * c) + tx;
        const y2 = (right * b) + (bottom * d) + ty;
        const x3 = (right * a) + (y * c) + tx;
        const y3 = (right * b) + (y * d) + ty;
        return { x0, y0, x1, y1, x2, y2, x3, y3 };
    }

    class BoundsComponent {
        constructor(entity) {
            this.fixed = false;
            this.includeChildren = true;
            this.visibleOnly = true;
            this.entity = entity;
            this.area = new Rectangle();
        }
        set(x, y, width, height) {
            this.area.set(x, y, width, height);
        }
        get() {
            if (this.entity.isDirty(DIRTY_CONST.BOUNDS) && !this.fixed) {
                this.update();
            }
            return this.area;
        }
        updateLocal() {
            const { x0, y0, x1, y1, x2, y2, x3, y3 } = GetVertices(this.entity.transform);
            const x = Math.min(x0, x1, x2, x3);
            const y = Math.min(y0, y1, y2, y3);
            const right = Math.max(x0, x1, x2, x3);
            const bottom = Math.max(y0, y1, y2, y3);
            return this.area.set(x, y, right - x, bottom - y);
        }
        update() {
            const bounds = this.updateLocal();
            this.entity.clearDirty(DIRTY_CONST.BOUNDS);
            if (!this.includeChildren || !this.entity.numChildren) {
                return bounds;
            }
            const visibleOnly = this.visibleOnly;
            const children = this.entity.children;
            let x = bounds.x;
            let y = bounds.y;
            let right = bounds.right;
            let bottom = bounds.bottom;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (!child || (visibleOnly && !child.visible)) {
                    continue;
                }
                const childBounds = child.bounds.get();
                if (childBounds.x < x) {
                    x = childBounds.x;
                }
                if (childBounds.y < y) {
                    y = childBounds.y;
                }
                if (childBounds.right > right) {
                    right = childBounds.right;
                }
                if (childBounds.bottom > bottom) {
                    bottom = childBounds.bottom;
                }
            }
            return bounds.set(x, y, right - x, bottom - y);
        }
        destroy() {
            this.entity = null;
            this.area = null;
        }
    }

    class InputComponent {
        constructor(entity) {
            this.enabled = false;
            this.enabledChildren = true;
            this.entity = entity;
        }
        destroy() {
            this.entity = null;
            this.hitArea = null;
        }
    }

    class Vec2 {
        constructor(x = 0, y = 0) {
            this.set(x, y);
        }
        set(x = 0, y = 0) {
            this.x = x;
            this.y = y;
            return this;
        }
        getArray() {
            return [this.x, this.y];
        }
        fromArray(src) {
            return this.set(src[0], src[1]);
        }
        toString() {
            return `[x=${this.x}, y=${this.y}]`;
        }
    }

    function UpdateLocalTransform(transform) {
        const local = transform.local;
        const x = transform.position.x;
        const y = transform.position.y;
        const rotation = transform.rotation;
        const scaleX = transform.scale.x;
        const scaleY = transform.scale.y;
        const skewX = transform.skew.x;
        const skewY = transform.skew.y;
        local.set(Math.cos(rotation + skewY) * scaleX, Math.sin(rotation + skewY) * scaleX, -Math.sin(rotation - skewX) * scaleY, Math.cos(rotation - skewX) * scaleY, x, y);
    }

    function Copy(src, target) {
        return target.set(src.a, src.b, src.c, src.d, src.tx, src.ty);
    }

    function UpdateWorldTransform(gameObject) {
        const parent = gameObject.parent;
        const transform = gameObject.transform;
        const lt = transform.local;
        const wt = transform.world;
        if (!parent) {
            Copy(lt, wt);
        }
        else if (transform.passthru) {
            Copy(parent.transform.world, wt);
        }
        else {
            const { a, b, c, d, tx, ty } = lt;
            const { a: pa, b: pb, c: pc, d: pd, tx: ptx, ty: pty } = parent.transform.world;
            wt.set(a * pa + b * pc, a * pb + b * pd, c * pa + d * pc, c * pb + d * pd, tx * pa + ty * pc + ptx, tx * pb + ty * pd + pty);
        }
    }

    class TransformComponent {
        constructor(entity, x = 0, y = 0) {
            this.passthru = false;
            this._rotation = 0;
            this.entity = entity;
            this.local = new Matrix2D();
            this.world = new Matrix2D();
            this.position = new Vec2Callback(() => this.update(), x, y);
            this.scale = new Vec2Callback(() => this.update(), 1, 1, true);
            this.skew = new Vec2Callback(() => this.update(), 0, 0, true);
            this.origin = new Vec2Callback(() => this.updateExtent(), originX, originY);
            this.extent = new Rectangle();
        }
        update() {
            this.updateLocal();
            this.updateWorld();
        }
        updateLocal() {
            this.entity.setDirty(DIRTY_CONST.TRANSFORM, DIRTY_CONST.BOUNDS);
            UpdateLocalTransform(this);
        }
        updateWorld() {
            const entity = this.entity;
            entity.setDirty(DIRTY_CONST.TRANSFORM, DIRTY_CONST.BOUNDS);
            UpdateWorldTransform(entity);
            if (entity.numChildren) {
                this.updateChildren();
            }
        }
        updateChildren() {
            const children = this.entity.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                child.transform.updateWorld();
            }
        }
        globalToLocal(x, y, out = new Vec2()) {
            const { a, b, c, d, tx, ty } = this.world;
            const id = 1 / ((a * d) + (c * -b));
            out.x = (d * id * x) + (-c * id * y) + (((ty * c) - (tx * d)) * id);
            out.y = (a * id * y) + (-b * id * x) + (((-ty * a) + (tx * b)) * id);
            return out;
        }
        localToGlobal(x, y, out = new Vec2()) {
            const { a, b, c, d, tx, ty } = this.world;
            out.x = (a * x) + (c * y) + tx;
            out.y = (b * x) + (d * y) + ty;
            return out;
        }
        setExtent(x, y, width, height) {
            this.extent.set(x, y, width, height);
            this.entity.setDirty(DIRTY_CONST.TRANSFORM, DIRTY_CONST.BOUNDS);
        }
        updateExtent(width, height) {
            const extent = this.extent;
            const entity = this.entity;
            if (width !== undefined) {
                extent.width = width;
            }
            if (height !== undefined) {
                extent.height = height;
            }
            extent.x = -(this.origin.x) * extent.width;
            extent.y = -(this.origin.y) * extent.height;
            entity.setDirty(DIRTY_CONST.TRANSFORM, DIRTY_CONST.BOUNDS);
        }
        set rotation(value) {
            if (value !== this._rotation) {
                this._rotation = value;
                this.update();
            }
        }
        get rotation() {
            return this._rotation;
        }
        destroy() {
            this.position.destroy();
            this.scale.destroy();
            this.skew.destroy();
            this.origin.destroy();
            this.entity = null;
            this.local = null;
            this.world = null;
            this.position = null;
            this.scale = null;
            this.skew = null;
            this.origin = null;
            this.extent = null;
        }
    }

    class GameObject {
        constructor(x = 0, y = 0) {
            this.type = 'GameObject';
            this.name = '';
            this.willUpdate = true;
            this.willUpdateChildren = true;
            this.willRender = true;
            this.willRenderChildren = true;
            this.willCacheChildren = false;
            this.dirty = 0;
            this.dirtyFrame = 0;
            this.visible = true;
            this.children = [];
            this.events = new Map();
            this.transform = new TransformComponent(this, x, y);
            this.bounds = new BoundsComponent(this);
            this.input = new InputComponent(this);
            this.dirty = DIRTY_CONST.DEFAULT;
            this.transform.update();
        }
        isRenderable() {
            return (this.visible && this.willRender);
        }
        isDirty(flag) {
            return (this.dirty & flag) !== 0;
        }
        clearDirty(flag) {
            if (this.isDirty(flag)) {
                this.dirty ^= flag;
            }
            return this;
        }
        setDirty(flag, flag2) {
            if (!this.isDirty(flag)) {
                this.dirty ^= flag;
                this.dirtyFrame = GameInstance.getFrame();
            }
            if (!this.isDirty(flag2)) {
                this.dirty ^= flag2;
            }
            return this;
        }
        update(delta, time) {
            if (this.willUpdateChildren) {
                const children = this.children;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (child && child.willUpdate) {
                        child.update(delta, time);
                    }
                }
            }
            this.postUpdate(delta, time);
        }
        postUpdate(delta, time) {
        }
        renderGL(renderer) {
        }
        renderCanvas(renderer) {
        }
        postRenderGL(renderer) {
        }
        postRenderCanvas(renderer) {
        }
        get numChildren() {
            return this.children.length;
        }
        destroy(reparentChildren) {
            if (reparentChildren) {
                ReparentChildren(this, reparentChildren);
            }
            else {
                DestroyChildren(this);
            }
            Emit(this, DestroyEvent, this);
            this.transform.destroy();
            this.bounds.destroy();
            this.input.destroy();
            this.events.clear();
            this.world = null;
            this.parent = null;
            this.children = null;
        }
    }

    class Container extends GameObject {
        constructor(x = 0, y = 0) {
            super(x, y);
            this._alpha = 1;
            this.type = 'Container';
        }
        setSize(width, height = width) {
            this.transform.updateExtent(width, height);
            return this;
        }
        setPosition(x, y) {
            this.transform.position.set(x, y);
            return this;
        }
        setOrigin(x, y = x) {
            this.transform.origin.set(x, y);
            return this;
        }
        setSkew(x, y = x) {
            this.transform.skew.set(x, y);
            return this;
        }
        setScale(x, y = x) {
            this.transform.scale.set(x, y);
            return this;
        }
        setRotation(value) {
            this.transform.rotation = value;
            return this;
        }
        set width(value) {
            this.transform.updateExtent(value);
        }
        get width() {
            return this.transform.extent.width;
        }
        set height(value) {
            this.transform.updateExtent(undefined, value);
        }
        get height() {
            return this.transform.extent.height;
        }
        set x(value) {
            this.transform.position.x = value;
        }
        get x() {
            return this.transform.position.x;
        }
        set y(value) {
            this.transform.position.y = value;
        }
        get y() {
            return this.transform.position.y;
        }
        set originX(value) {
            this.transform.origin.x = value;
        }
        get originX() {
            return this.transform.origin.x;
        }
        set originY(value) {
            this.transform.origin.y = value;
        }
        get originY() {
            return this.transform.origin.y;
        }
        set skewX(value) {
            this.transform.skew.x = value;
        }
        get skewX() {
            return this.transform.skew.x;
        }
        set skewY(value) {
            this.transform.skew.y = value;
        }
        get skewY() {
            return this.transform.skew.y;
        }
        set scaleX(value) {
            this.transform.scale.x = value;
        }
        get scaleX() {
            return this.transform.scale.x;
        }
        set scaleY(value) {
            this.transform.scale.y = value;
        }
        get scaleY() {
            return this.transform.scale.y;
        }
        set rotation(value) {
            this.transform.rotation = value;
        }
        get rotation() {
            return this.transform.rotation;
        }
        get alpha() {
            return this._alpha;
        }
        set alpha(value) {
            if (value !== this._alpha) {
                this._alpha = value;
                this.setDirty(DIRTY_CONST.TRANSFORM);
            }
        }
    }

    function DrawTexturedQuad(sprite, renderer) {
        const frame = sprite.frame;
        if (!frame) {
            return;
        }
        const ctx = renderer.ctx;
        const transform = sprite.transform;
        const { a, b, c, d, tx, ty } = transform.world;
        const { x, y } = transform.extent;
        ctx.save();
        ctx.setTransform(a, b, c, d, tx, ty);
        ctx.globalAlpha = sprite.alpha;
        ctx.drawImage(frame.texture.image, frame.x, frame.y, frame.width, frame.height, x, y, frame.width, frame.height);
        ctx.restore();
    }

    function PackColor(rgb, alpha) {
        const ua = ((alpha * 255) | 0) & 0xFF;
        return ((ua << 24) | rgb) >>> 0;
    }

    function PackColors(sprite) {
        const alpha = sprite.vertexAlpha;
        const tint = sprite.vertexTint;
        const color = sprite.vertexColor;
        color[0] = PackColor(tint[0], alpha[0]);
        color[1] = PackColor(tint[1], alpha[1]);
        color[2] = PackColor(tint[2], alpha[2]);
        color[3] = PackColor(tint[3], alpha[3]);
        return sprite;
    }

    function SetFrame(texture, key, ...children) {
        const frame = texture.getFrame(key);
        const { u0, u1, v0, v1, pivot } = frame;
        children.forEach(child => {
            if (!child || frame === child.frame) {
                return;
            }
            child.frame = frame;
            if (pivot) {
                child.setOrigin(pivot.x, pivot.y);
            }
            child.frame.setExtent(child);
            child.hasTexture = true;
            const data = child.vertexData;
            data[2] = u0;
            data[3] = v0;
            data[8] = u0;
            data[9] = v1;
            data[14] = u1;
            data[15] = v1;
            data[20] = u1;
            data[21] = v0;
        });
        return children;
    }

    function SetTexture(key, frame, ...children) {
        if (!key) {
            children.forEach(child => {
                child.texture = null;
                child.frame = null;
                child.hasTexture = false;
            });
        }
        else {
            let texture;
            if (key instanceof Texture) {
                texture = key;
            }
            else {
                texture = TextureManagerInstance.get().get(key);
            }
            if (!texture) {
                console.warn(`Invalid Texture key: ${key}`);
            }
            else {
                children.forEach(child => {
                    child.texture = texture;
                });
                SetFrame(texture, frame, ...children);
            }
        }
        return children;
    }

    function UpdateVertices(sprite) {
        const data = sprite.vertexData;
        const { x0, y0, x1, y1, x2, y2, x3, y3 } = GetVertices(sprite.transform);
        data[0] = x0;
        data[1] = y0;
        data[6] = x1;
        data[7] = y1;
        data[12] = x2;
        data[13] = y2;
        data[18] = x3;
        data[19] = y3;
        return sprite;
    }

    class Sprite extends Container {
        constructor(x, y, texture, frame) {
            super(x, y);
            this.hasTexture = false;
            this._tint = 0xffffff;
            this.type = 'Sprite';
            this.vertexData = new Float32Array(24).fill(0);
            this.vertexColor = new Uint32Array(4).fill(4294967295);
            this.vertexAlpha = new Float32Array(4).fill(1);
            this.vertexTint = new Uint32Array(4).fill(0xffffff);
            this.setTexture(texture, frame);
        }
        setTexture(key, frame) {
            SetTexture(key, frame, this);
            return this;
        }
        setFrame(key) {
            SetFrame(this.texture, key, this);
            return this;
        }
        isRenderable() {
            return (this.visible && this.willRender && this.hasTexture && this.alpha > 0);
        }
        preRender() {
            if (this.isDirty(DIRTY_CONST.COLORS)) {
                PackColors(this);
                this.clearDirty(DIRTY_CONST.COLORS);
            }
            if (this.isDirty(DIRTY_CONST.TRANSFORM)) {
                UpdateVertices(this);
                this.clearDirty(DIRTY_CONST.TRANSFORM);
            }
        }
        renderGL(renderer) {
            this.preRender();
            BatchTexturedQuad(this, renderer);
        }
        renderCanvas(renderer) {
            this.preRender();
            DrawTexturedQuad(this, renderer);
        }
        get alpha() {
            return this._alpha;
        }
        set alpha(value) {
            if (value !== this._alpha) {
                this._alpha = value;
                const vertexAlpha = this.vertexAlpha;
                vertexAlpha[0] = value;
                vertexAlpha[1] = value;
                vertexAlpha[2] = value;
                vertexAlpha[3] = value;
                this.setDirty(DIRTY_CONST.ALPHA);
            }
        }
        get tint() {
            return this._tint;
        }
        set tint(value) {
            if (value !== this._tint) {
                this._tint = value;
                const vertexTint = this.vertexTint;
                vertexTint[0] = value;
                vertexTint[1] = value;
                vertexTint[2] = value;
                vertexTint[3] = value;
                this.setDirty(DIRTY_CONST.COLORS);
            }
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
    }

    function BatchSingleQuad(renderer, x, y, width, height, u0, v0, u1, v1, textureIndex = 0, packedColor = 4294967295) {
        const shader = renderer.shaders.current;
        const buffer = shader.buffer;
        const F32 = buffer.vertexViewF32;
        const U32 = buffer.vertexViewU32;
        const offset = shader.count * buffer.quadElementSize;
        F32[offset + 0] = x;
        F32[offset + 1] = y;
        F32[offset + 2] = u0;
        F32[offset + 3] = v1;
        F32[offset + 4] = textureIndex;
        U32[offset + 5] = packedColor;
        F32[offset + 6] = x;
        F32[offset + 7] = y + height;
        F32[offset + 8] = u0;
        F32[offset + 9] = v0;
        F32[offset + 10] = textureIndex;
        U32[offset + 11] = packedColor;
        F32[offset + 12] = x + width;
        F32[offset + 13] = y + height;
        F32[offset + 14] = u1;
        F32[offset + 15] = v0;
        F32[offset + 16] = textureIndex;
        U32[offset + 17] = packedColor;
        F32[offset + 18] = x + width;
        F32[offset + 19] = y;
        F32[offset + 20] = u1;
        F32[offset + 21] = v1;
        F32[offset + 22] = textureIndex;
        U32[offset + 23] = packedColor;
        shader.count++;
    }

    function DrawTexturedQuad$1(renderer, x, y, width, height, u0, v0, u1, v1, textureIndex = 0, packedColor = 4294967295) {
        renderer.shaders.setDefault(textureIndex);
        BatchSingleQuad(renderer, x, y, width, height, u0, v0, u1, v1, textureIndex, packedColor);
        renderer.shaders.popAndRebind();
    }

    class Layer extends GameObject {
        constructor() {
            super();
            this.type = 'Layer';
            this.transform.passthru = true;
            this.willRender = false;
        }
    }

    class RenderLayer extends Layer {
        constructor() {
            super();
            this.type = 'RenderLayer';
            this.willRender = true;
            this.willRenderChildren = true;
            this.willCacheChildren = true;
            this.setDirty(DIRTY_CONST.CHILD_CACHE);
            const width = GetWidth();
            const height = GetHeight();
            const resolution = GetResolution();
            const texture = new Texture(null, width * resolution, height * resolution);
            texture.binding = new GLTextureBinding(texture);
            texture.binding.framebuffer = CreateFramebuffer(texture.binding.texture);
            this.texture = texture;
            this.framebuffer = texture.binding.framebuffer;
        }
        renderGL(renderer) {
            if (this.numChildren > 0) {
                renderer.flush();
                if (this.isDirty(DIRTY_CONST.CHILD_CACHE)) {
                    renderer.fbo.add(this.framebuffer, true);
                    this.clearDirty(DIRTY_CONST.CHILD_CACHE);
                }
                else {
                    renderer.fbo.add(this.framebuffer, false);
                    this.postRenderGL(renderer);
                }
            }
        }
        postRenderGL(renderer) {
            const texture = this.texture;
            renderer.flush();
            renderer.fbo.pop();
            const { u0, v0, u1, v1 } = texture.firstFrame;
            renderer.textures.bind(texture);
            DrawTexturedQuad$1(renderer, 0, 0, texture.width, texture.height, u0, v0, u1, v1);
            renderer.textures.unbind();
            this.clearDirty(DIRTY_CONST.TRANSFORM);
        }
    }

    class EffectLayer extends RenderLayer {
        constructor() {
            super();
            this.shaders = [];
            this.type = 'EffectLayer';
        }
        postRenderGL(renderer) {
            const shaders = this.shaders;
            const texture = this.texture;
            renderer.flush();
            renderer.fbo.pop();
            if (shaders.length === 0) {
                const { u0, v0, u1, v1 } = texture.firstFrame;
                renderer.textures.bind(texture);
                DrawTexturedQuad$1(renderer, 0, 0, texture.width, texture.height, u0, v0, u1, v1);
                renderer.textures.unbind();
            }
            else {
                let prevTexture = texture;
                for (let i = 0; i < shaders.length; i++) {
                    const shader = shaders[i];
                    const { u0, v0, u1, v1 } = prevTexture.firstFrame;
                    if (renderer.shaders.set(shader, 0)) {
                        shader.renderToFBO = true;
                        renderer.textures.bind(prevTexture);
                        BatchSingleQuad(renderer, 0, 0, prevTexture.width, prevTexture.height, u0, v0, u1, v1);
                        renderer.shaders.pop();
                        renderer.textures.unbind();
                        prevTexture = shader.texture;
                    }
                }
                const { u0, v0, u1, v1 } = prevTexture.firstFrame;
                renderer.textures.bind(prevTexture);
                DrawTexturedQuad$1(renderer, 0, 0, prevTexture.width, prevTexture.height, u0, v0, u1, v1);
                renderer.textures.unbind();
            }
            this.clearDirty(DIRTY_CONST.TRANSFORM);
        }
    }

    const WorldRenderEvent = 'worldrender';

    const WorldShutdownEvent = 'worldshutdown';

    function CalculateTotalRenderable(entry, renderData) {
        renderData.numRendered++;
        renderData.numRenderable++;
        if (entry.node.dirtyFrame >= renderData.gameFrame) {
            renderData.dirtyFrame++;
        }
        entry.children.forEach(child => {
            if (child.children.length > 0) {
                CalculateTotalRenderable(child, renderData);
            }
        });
    }

    function HasDirtyChildren(parent) {
        if (parent.node.isDirty(DIRTY_CONST.CHILD_CACHE)) {
            return true;
        }
        const stack = [parent];
        while (stack.length > 0) {
            const entry = stack.pop();
            if (entry.node.isDirty(DIRTY_CONST.TRANSFORM)) {
                return true;
            }
            const numChildren = entry.children.length;
            if (numChildren > 0) {
                for (let i = 0; i < numChildren; i++) {
                    stack.push(entry.children[i]);
                }
            }
        }
        stack.length = 0;
        return false;
    }

    function UpdateCachedLayers(cachedLayers, dirtyCamera) {
        cachedLayers.forEach(layer => {
            if (dirtyCamera || HasDirtyChildren(layer)) {
                layer.node.setDirty(DIRTY_CONST.CHILD_CACHE);
            }
            else {
                layer.children.length = 0;
            }
        });
    }

    function WorldDepthFirstSearch(cachedLayers, parent, output = []) {
        for (let i = 0; i < parent.numChildren; i++) {
            const node = parent.children[i];
            if (node.isRenderable()) {
                const children = [];
                const entry = { node, children };
                output.push(entry);
                if (node.willRenderChildren && node.numChildren > 0) {
                    if (node.willCacheChildren) {
                        cachedLayers.push(entry);
                    }
                    WorldDepthFirstSearch(cachedLayers, node, children);
                }
            }
        }
        return output;
    }

    function BuildRenderList(world) {
        const cachedLayers = [];
        const stack = [];
        const entries = WorldDepthFirstSearch(cachedLayers, world, stack);
        const renderData = world.renderData;
        if (cachedLayers.length > 0) {
            UpdateCachedLayers(cachedLayers, world.camera.dirtyRender);
        }
        entries.forEach(entry => {
            if (entry.children.length) {
                CalculateTotalRenderable(entry, renderData);
            }
            else {
                renderData.numRendered++;
                renderData.numRenderable++;
                if (entry.node.dirtyFrame >= renderData.gameFrame) {
                    renderData.dirtyFrame++;
                }
            }
        });
        renderData.renderList = entries;
        if (world.forceRefresh) {
            renderData.dirtyFrame++;
            world.forceRefresh = false;
        }
    }

    function MergeRenderData(sceneRenderData, worldRenderData) {
        sceneRenderData.numDirtyFrames += worldRenderData.dirtyFrame;
        sceneRenderData.numTotalFrames += worldRenderData.numRendered;
        if (worldRenderData.camera.dirtyRender) {
            sceneRenderData.numDirtyCameras++;
        }
        sceneRenderData.worldData.push(worldRenderData);
    }

    function ResetWorldRenderData(renderData, gameFrame) {
        renderData.gameFrame = gameFrame;
        renderData.dirtyFrame = 0;
        renderData.numRendered = 0;
        renderData.numRenderable = 0;
        renderData.renderList.length = 0;
    }

    class BaseWorld extends GameObject {
        constructor(scene) {
            super();
            this.forceRefresh = false;
            this.type = 'BaseWorld';
            this.scene = scene;
            this.world = this;
            this.events = new Map();
            this._updateListener = On(scene, 'update', (delta, time) => this.update(delta, time));
            this._renderListener = On(scene, 'render', (renderData) => this.render(renderData));
            this._shutdownListener = On(scene, 'shutdown', () => this.shutdown());
            Once(scene, 'destroy', () => this.destroy());
        }
        update(delta, time) {
            if (!this.willUpdate) {
                return;
            }
            Emit(this, UpdateEvent, delta, time, this);
            super.update(delta, time);
        }
        postUpdate(delta, time) {
            Emit(this, PostUpdateEvent, delta, time, this);
        }
        render(sceneRenderData) {
            const renderData = this.renderData;
            ResetWorldRenderData(renderData, sceneRenderData.gameFrame);
            if (!this.willRender || !this.visible) {
                return;
            }
            BuildRenderList(this);
            Emit(this, WorldRenderEvent, renderData, this);
            MergeRenderData(sceneRenderData, renderData);
            if (this.camera) {
                this.camera.dirtyRender = false;
            }
        }
        shutdown() {
            const scene = this.scene;
            Off(scene, 'update', this._updateListener);
            Off(scene, 'render', this._renderListener);
            Off(scene, 'shutdown', this._shutdownListener);
            RemoveChildren(this);
            Emit(this, WorldShutdownEvent, this);
            ResetWorldRenderData(this.renderData, 0);
            if (this.camera) {
                this.camera.reset();
            }
        }
        destroy(reparentChildren) {
            super.destroy(reparentChildren);
            Emit(this, DestroyEvent, this);
            ResetWorldRenderData(this.renderData, 0);
            if (this.camera) {
                this.camera.destroy();
            }
            this.events.clear();
            this.camera = null;
            this.renderData = null;
            this.events = null;
        }
    }

    function CreateWorldRenderData(camera) {
        return {
            camera,
            gameFrame: 0,
            dirtyFrame: 0,
            numRendered: 0,
            numRenderable: 0,
            renderList: []
        };
    }

    class StaticWorld extends BaseWorld {
        constructor(scene) {
            super(scene);
            this.type = 'StaticWorld';
            this.camera = new StaticCamera();
            this.renderData = CreateWorldRenderData(this.camera);
        }
    }

    class Loader extends EventEmitter {
        constructor() {
            super();
            this.baseURL = '';
            this.path = '';
            this.crossOrigin = 'anonymous';
            this.maxParallelDownloads = -1;
            this.isLoading = false;
            this.reset();
        }
        reset() {
            this.isLoading = false;
            this.queue = new Set();
            this.inflight = new Set();
            this.completed = new Set();
            this.progress = 0;
        }
        add(...file) {
            file.forEach(entity => {
                entity.loader = this;
                this.queue.add(entity);
            });
            return this;
        }
        start() {
            if (this.isLoading) {
                return null;
            }
            return new Promise((resolve, reject) => {
                this.completed.clear();
                this.progress = 0;
                if (this.queue.size > 0) {
                    this.isLoading = true;
                    this.onComplete = resolve;
                    this.onError = reject;
                    Emit(this, 'start');
                    this.nextFile();
                }
                else {
                    this.progress = 1;
                    Emit(this, 'complete');
                    resolve();
                }
            });
        }
        nextFile() {
            let limit = this.queue.size;
            if (this.maxParallelDownloads !== -1) {
                limit = Math.min(limit, this.maxParallelDownloads) - this.inflight.size;
            }
            if (limit) {
                const iterator = this.queue.values();
                while (limit > 0) {
                    const file = iterator.next().value;
                    this.inflight.add(file);
                    this.queue.delete(file);
                    file.load()
                        .then((file) => this.fileComplete(file))
                        .catch((file) => this.fileError(file));
                    limit--;
                }
            }
            else if (this.inflight.size === 0) {
                this.stop();
            }
        }
        stop() {
            if (!this.isLoading) {
                return;
            }
            this.isLoading = false;
            Emit(this, 'complete', this.completed);
            this.onComplete();
            this.completed.clear();
        }
        updateProgress(file) {
            this.inflight.delete(file);
            this.completed.add(file);
            const totalCompleted = this.completed.size;
            const totalQueued = this.queue.size + this.inflight.size;
            if (totalCompleted > 0) {
                this.progress = totalCompleted / (totalCompleted + totalQueued);
            }
            Emit(this, 'progress', this.progress, totalCompleted, totalQueued);
            this.nextFile();
        }
        fileComplete(file) {
            Emit(this, 'filecomplete', file);
            this.updateProgress(file);
        }
        fileError(file) {
            Emit(this, 'fileerror', file);
            this.updateProgress(file);
        }
        totalFilesToLoad() {
            return this.queue.size + this.inflight.size;
        }
        setBaseURL(url = '') {
            if (url !== '' && url.substr(-1) !== '/') {
                url = url.concat('/');
            }
            this.baseURL = url;
            return this;
        }
        setPath(path = '') {
            if (path !== '' && path.substr(-1) !== '/') {
                path = path.concat('/');
            }
            this.path = path;
            return this;
        }
        setCORS(crossOrigin) {
            this.crossOrigin = crossOrigin;
            return this;
        }
        setMaxParallelDownloads(max) {
            this.maxParallelDownloads = max;
            return this;
        }
    }

    function GetConfigValue(config, property, defaultValue) {
        if (Object.prototype.hasOwnProperty.call(config, property)) {
            return config[property];
        }
        else {
            return defaultValue;
        }
    }

    function Install(scene, config = {}) {
        const sceneManager = SceneManagerInstance.get();
        const size = sceneManager.scenes.size;
        const sceneIndex = sceneManager.sceneIndex;
        const firstScene = (size === 0);
        if (typeof config === 'string') {
            scene.key = config;
        }
        else if (config || (!config && firstScene)) {
            scene.key = GetConfigValue(config, 'key', 'scene' + sceneIndex.toString());
        }
        if (sceneManager.scenes.has(scene.key)) {
            console.warn('Scene key already in use: ' + scene.key);
        }
        else {
            sceneManager.scenes.set(scene.key, scene);
            sceneManager.flush = true;
            sceneManager.sceneIndex++;
        }
    }

    class Scene {
        constructor(config) {
            this.game = GameInstance.get();
            this.events = new Map();
            Install(this, config);
        }
    }

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

    function GetURL(key, url, extension, loader) {
        if (!url) {
            url = key + extension;
        }
        if ((/^(?:blob:|data:|http:\/\/|https:\/\/|\/\/)/).exec(url)) {
            return url;
        }
        else if (loader) {
            return loader.baseURL + loader.path + url;
        }
        else {
            return url;
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
            if (file.data.complete && file.data.width && file.data.height) {
                file.data.onload = null;
                file.data.onerror = null;
                resolve(file);
            }
        });
    }

    function ImageFile(key, url) {
        const file = new File(key, url);
        file.load = () => {
            file.url = GetURL(file.key, file.url, '.png', file.loader);
            if (file.loader) {
                file.crossOrigin = file.loader.crossOrigin;
            }
            return new Promise((resolve, reject) => {
                const textureManager = TextureManagerInstance.get();
                if (textureManager.has(file.key)) {
                    resolve(file);
                }
                else {
                    ImageTagLoader(file).then(file => {
                        textureManager.add(file.key, file.data);
                        resolve(file);
                    }).catch(file => {
                        reject(file);
                    });
                }
            });
        };
        return file;
    }

    class Shader extends SingleTextureQuadShader {
        constructor(config = {}) {
            super(config);
        }
    }

    const pixelateFragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vTintColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

void main (void)
{
    vec2 pixelSize = vec2(4.0, 4.0);
    vec2 size = uResolution.xy / pixelSize;
    vec2 color = floor((vTextureCoord * size)) / size + pixelSize / uResolution.xy * 0.5;

    gl_FragColor = texture2D(uTexture, color);
}`;
    const plasmaFragmentShader = `
precision mediump float;

varying vec2 vTextureCoord;
varying float vTextureId;
varying vec4 vTintColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform vec2 uResolution;

const float PI = 3.14159265;
float ptime = uTime * 0.0001;
float alpha = 1.0;
float size = 0.03;
float redShift = 0.5;
float greenShift = 0.5;
float blueShift = 0.9;

void main (void)
{
    vec4 tcolor = texture2D(uTexture, vTextureCoord);

    float color1, color2, color;

    color1 = (sin(dot(gl_FragCoord.xy, vec2(sin(ptime * 3.0), cos(ptime * 3.0))) * 0.02 + ptime * 3.0) + 1.0) / 2.0;
    vec2 center = vec2(640.0 / 2.0, 360.0 / 2.0) + vec2(640.0 / 2.0 * sin(-ptime * 3.0), 360.0 / 2.0 * cos(-ptime * 3.0));
    color2 = (cos(length(gl_FragCoord.xy - center) * size) + 1.0) / 2.0;
    color = (color1 + color2) / 2.0;

    float red = (cos(PI * color / redShift + ptime * 3.0) + 1.0) / 2.0;
    float green = (sin(PI * color / greenShift + ptime * 3.0) + 1.0) / 2.0;
    float blue = (sin(PI * color / blueShift + ptime * 3.0) + 1.0) / 2.0;

    gl_FragColor = tcolor * vec4(red, green, blue, alpha);
}`;
    class Demo extends Scene {
        constructor() {
            super();
            const loader = new Loader();
            loader.setPath('/phaser4-examples/public/assets/');
            // loader.setPath('/examples/public/assets/');
            loader.add(ImageFile('background', 'farm-background.png'));
            loader.add(ImageFile('ayu', 'ayu.png'));
            loader.add(ImageFile('logo', 'logo.png'));
            loader.add(ImageFile('rocket', 'rocket.png'));
            loader.add(ImageFile('farm', 'farm-logo.png'));
            loader.add(ImageFile('star', 'star.png'));
            loader.add(ImageFile('bubble', 'bubble256.png'));
            loader.start().then(() => this.create());
        }
        create() {
            const plasma = new Shader({ fragmentShader: plasmaFragmentShader, batchSize: 1 });
            const pixelate = new Shader({ fragmentShader: pixelateFragmentShader, batchSize: 1 });
            const world = new StaticWorld(this);
            const layer = new EffectLayer();
            layer.shaders.push(pixelate);
            const bg = new Sprite(400, 300, 'background');
            const logo = new Sprite(200, 300, 'logo');
            const ayu = new Sprite(600, 300, 'ayu');
            const farm = new Sprite(200, 150, 'farm');
            const rocket = new Sprite(150, 500, 'rocket');
            const bubble = new Sprite(400, 450, 'bubble');
            const star = new Sprite(650, 500, 'star');
            AddChildren(layer, ayu, logo, farm, rocket, bubble);
            AddChildren(world, bg, layer);
        }
    }
    new Game(WebGLRenderer$1(), Size(800, 600), Parent('example'), BackgroundColor(0x640b50), Scenes(Demo));

}());
//# sourceMappingURL=pixelate.js.map
