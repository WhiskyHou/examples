(function () {
    'use strict';

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

    let bgColor = 0;
    function GetBackgroundColor() {
        return bgColor;
    }

    let instance;
    let frame = 0;
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
        }
    };

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

    let _contextAttributes = {
        alpha: false,
        desynchronized: false
    };
    function GetCanvasContext() {
        return _contextAttributes;
    }

    let _width = 800;
    let _height = 600;
    let _resolution = 1;
    function GetWidth() {
        return _width;
    }
    function GetHeight() {
        return _height;
    }
    function GetResolution() {
        return _resolution;
    }

    function RenderCanvas(sprite, ctx) {
        const frame = sprite.frame;
        const { a, b, c, d, tx, ty } = sprite.transform.world;
        ctx.save();
        ctx.setTransform(a, b, c, d, tx, ty);
        ctx.globalAlpha = sprite.alpha;
        ctx.drawImage(frame.texture.image, frame.x, frame.y, frame.width, frame.height, 0, 0, frame.width, frame.height);
        ctx.restore();
    }

    class CanvasRenderer {
        constructor() {
            this.clearBeforeRender = true;
            this.optimizeRedraw = true;
            this.autoResize = true;
            this.width = GetWidth();
            this.height = GetHeight();
            this.resolution = GetResolution();
            this.setBackgroundColor(GetBackgroundColor());
            const canvas = document.createElement('canvas');
            this.canvas = canvas;
            this.initContext();
        }
        initContext() {
            const ctx = this.canvas.getContext('2d', GetCanvasContext());
            this.ctx = ctx;
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
        }
        setBackgroundColor(color) {
            const r = color >> 16 & 0xFF;
            const g = color >> 8 & 0xFF;
            const b = color & 0xFF;
            const a = (color > 16777215) ? color >>> 24 : 255;
            this.clearColor = `rgba(${r}, ${g}, ${b}, ${a})`;
            return this;
        }
        reset() {
            const ctx = this.ctx;
            ctx.globalAlpha = 1;
            ctx.globalCompositeOperation = 'source-over';
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
        render(renderData) {
            const ctx = this.ctx;
            if (this.optimizeRedraw && renderData.numDirtyFrames === 0 && renderData.numDirtyCameras === 0) {
                return;
            }
            this.reset();
            if (this.clearBeforeRender) {
                ctx.clearRect(0, 0, this.width, this.height);
                ctx.fillStyle = this.clearColor;
                ctx.fillRect(0, 0, this.width, this.height);
            }
            const worlds = renderData.worldData;
            for (let i = 0; i < worlds.length; i++) {
                const { camera, renderList, numRendered } = worlds[i];
                const { a, b, c, d, tx, ty } = camera.worldTransform;
                ctx.setTransform(a, b, c, d, tx, ty);
                for (let s = 0; s < numRendered; s++) {
                    RenderCanvas(renderList[s], ctx);
                }
            }
        }
    }

    let instance$1;
    function SetRenderer(renderer) {
        instance$1 = renderer;
    }
    function GetRenderer() {
        return instance$1;
    }

    function CanvasRenderer$1() {
        return () => {
            SetRenderer(CanvasRenderer);
        };
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

    let gl;
    const GL = {
        get: () => {
            return gl;
        },
        set: (context) => {
            gl = context;
        }
    };

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

    function Emit(emitter, event, ...args) {
        if (!emitter.events.has(event)) {
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
        return emitter;
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

    let instance$2;
    const SceneManagerInstance = {
        get: () => {
            return instance$2;
        },
        set: (manager) => {
            instance$2 = manager;
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

    function IsSizePowerOfTwo(width, height) {
        if (width < 1 || height < 1) {
            return false;
        }
        return ((width & (width - 1)) === 0) && ((height & (height - 1)) === 0);
    }

    function CreateGLTexture(source, width, height, potClamp = true, linear = true) {
        const gl = GL.get();
        if (!gl) {
            return;
        }
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
        const pot = (source && IsSizePowerOfTwo(width, height));
        const wrap = (pot && potClamp) ? gl.REPEAT : gl.CLAMP_TO_EDGE;
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
        if (pot) {
            gl.generateMipmap(gl.TEXTURE_2D);
        }
        return glTexture;
    }

    function DeleteFramebuffer(framebuffer) {
        const gl = GL.get();
        if (gl.isFramebuffer(framebuffer)) {
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
            const frame = new Frame(this, key, x, y, width, height);
            this.frames.set(key, frame);
            if (!this.firstFrame || this.firstFrame.key === '__BASE') {
                this.firstFrame = frame;
            }
            return frame;
        }
        get(key) {
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

    let instance$3;
    const TextureManagerInstance = {
        get: () => {
            return instance$3;
        },
        set: (manager) => {
            instance$3 = manager;
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
                if (!texture.glTexture) {
                    texture.createGL();
                }
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
            if (!this.isPaused) {
                if (this.willUpdate) {
                    this.sceneManager.update(delta, time);
                }
                if (this.willRender) {
                    this.renderer.render(this.sceneManager.render(this.frame));
                }
            }
            this.frame++;
            GameInstance.setFrame(this.frame);
            requestAnimationFrame(now => this.step(now));
        }
        destroy() {
        }
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

    function GetChildIndex(parent, child) {
        return parent.children.indexOf(child);
    }

    function RemoveChild(parent, child) {
        const children = parent.children;
        const currentIndex = GetChildIndex(parent, child);
        if (currentIndex > -1) {
            children.splice(currentIndex, 1);
            child.parent = null;
        }
        return child;
    }

    function SetParent(parent, ...child) {
        child.forEach(entity => {
            if (entity.parent) {
                RemoveChild(entity.parent, entity);
            }
            entity.world = parent.world;
            entity.parent = parent;
        });
    }

    function Copy(src, target) {
        return target.set(src.a, src.b, src.c, src.d, src.tx, src.ty);
    }

    function UpdateWorldTransform(gameObject) {
        gameObject.dirty.setRender();
        const parent = gameObject.parent;
        const transform = gameObject.transform;
        const lt = transform.local;
        const wt = transform.world;
        lt.tx = transform.x;
        lt.ty = transform.y;
        if (!parent) {
            Copy(lt, wt);
            return;
        }
        const { a, b, c, d, tx, ty } = lt;
        const { a: pa, b: pb, c: pc, d: pd, tx: ptx, ty: pty } = parent.transform.world;
        wt.set(a * pa + b * pc, a * pb + b * pd, c * pa + d * pc, c * pb + d * pd, tx * pa + ty * pc + ptx, tx * pb + ty * pd + pty);
    }

    function AddChild(parent, child) {
        SetParent(parent, child);
        parent.children.push(child);
        UpdateWorldTransform(child);
        return child;
    }

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

    class BoundsComponent {
        constructor(parent) {
            this.fixed = false;
            this.parent = parent;
            this.area = new Rectangle();
        }
        setArea(x, y, width, height) {
            this.area.set(x, y, width, height);
        }
        destroy() {
            this.parent = null;
            this.area = null;
        }
    }

    class DirtyComponent {
        constructor(parent) {
            this.render = true;
            this.update = true;
            this.frame = 0;
            this.parent = parent;
        }
        setRender() {
            this.render = true;
            this.frame = GameInstance.getFrame();
        }
        setUpdate() {
            this.update = true;
        }
        destroy() {
            this.parent = null;
        }
    }

    class InputComponent {
        constructor(parent) {
            this.enabled = false;
            this.enabledChildren = true;
            this.parent = parent;
        }
        destroy() {
            this.parent = null;
            this.hitArea = null;
        }
    }

    function UpdateLocalTransform(gameObject) {
        const transformComponent = gameObject.transform;
        const local = transformComponent.local;
        const { rotation, skewX, skewY, scaleX, scaleY, x, y } = transformComponent;
        local.set(Math.cos(rotation + skewY) * scaleX, Math.sin(rotation + skewY) * scaleX, -Math.sin(rotation - skewX) * scaleY, Math.cos(rotation - skewX) * scaleY, x, y);
        UpdateWorldTransform(gameObject);
    }

    class TransformComponent {
        constructor(parent, x = 0, y = 0) {
            this.x = 0;
            this.y = 0;
            this.rotation = 0;
            this.scaleX = 1;
            this.scaleY = 1;
            this.skewX = 0;
            this.skewY = 0;
            this.originX = 0.5;
            this.originY = 0.5;
            this.width = 0;
            this.height = 0;
            this.parent = parent;
            this.local = new Matrix2D();
            this.world = new Matrix2D();
            this.x = x;
            this.y = y;
        }
        setSize(width, height) {
            this.width = width;
            this.height = height;
        }
        setWidth(value) {
            this.width = value;
        }
        setHeight(value) {
            this.height = value;
        }
        setPosition(x, y) {
            this.x = x;
            this.y = y;
            UpdateWorldTransform(this.parent);
        }
        setX(value) {
            this.x = value;
            UpdateWorldTransform(this.parent);
        }
        setY(value) {
            this.y = value;
            UpdateWorldTransform(this.parent);
        }
        setOrigin(x, y) {
            this.originX = x;
            this.originY = y;
        }
        setOriginX(value) {
            this.originX = value;
        }
        setOriginY(value) {
            this.originX = value;
        }
        setSkew(x, y) {
            this.skewX = x;
            this.skewY = y;
            UpdateLocalTransform(this.parent);
        }
        setSkewX(value) {
            if (value !== this.skewX) {
                this.skewX = value;
                UpdateLocalTransform(this.parent);
            }
        }
        setSkewY(value) {
            if (value !== this.skewY) {
                this.skewY = value;
                UpdateLocalTransform(this.parent);
            }
        }
        setScale(x, y) {
            this.scaleX = x;
            this.scaleY = y;
            UpdateLocalTransform(this.parent);
        }
        setScaleX(value) {
            if (value !== this.scaleX) {
                this.scaleX = value;
                UpdateLocalTransform(this.parent);
            }
        }
        setScaleY(value) {
            if (value !== this.scaleY) {
                this.scaleY = value;
                UpdateLocalTransform(this.parent);
            }
        }
        setRotation(value) {
            if (value !== this.rotation) {
                this.rotation = value;
                UpdateLocalTransform(this.parent);
            }
        }
        destroy() {
            this.parent = null;
            this.local = null;
            this.world = null;
        }
    }

    function ReparentChildren(parent, newParent, beginIndex = 0, endIndex) {
        const moved = RemoveChildrenBetween(parent, beginIndex, endIndex);
        moved.forEach(child => {
            SetParent(newParent, child);
        });
        return moved;
    }

    class GameObject {
        constructor(x = 0, y = 0) {
            this.name = '';
            this.type = 'GameObject';
            this.willRender = true;
            this.willUpdate = true;
            this.visible = true;
            this.children = [];
            this.dirty = new DirtyComponent(this);
            this.transform = new TransformComponent(this, x, y);
            this.bounds = new BoundsComponent(this);
            this.input = new InputComponent(this);
        }
        isRenderable() {
            return (this.visible && this.willRender);
        }
        update(delta, time) {
            if (this.willUpdate) {
                const children = this.children;
                for (let i = 0; i < children.length; i++) {
                    const child = children[i];
                    if (child && child.willUpdate) {
                        child.update(delta, time);
                    }
                }
            }
        }
        get numChildren() {
            return this.children.length;
        }
        set width(value) {
            this.transform.setWidth(value);
        }
        get width() {
            return this.transform.width;
        }
        set height(value) {
            this.transform.setHeight(value);
        }
        get height() {
            return this.transform.height;
        }
        set x(value) {
            this.transform.setX(value);
        }
        get x() {
            return this.transform.x;
        }
        set y(value) {
            this.transform.setY(value);
        }
        get y() {
            return this.transform.y;
        }
        set originX(value) {
            this.transform.setOriginX(value);
        }
        get originX() {
            return this.transform.originX;
        }
        set originY(value) {
            this.transform.setOriginY(value);
        }
        get originY() {
            return this.transform.originY;
        }
        set skewX(value) {
            this.transform.setSkewX(value);
        }
        get skewX() {
            return this.transform.skewX;
        }
        set skewY(value) {
            this.transform.setSkewY(value);
        }
        get skewY() {
            return this.transform.skewY;
        }
        set scaleX(value) {
            this.transform.setScaleX(value);
        }
        get scaleX() {
            return this.transform.scaleX;
        }
        set scaleY(value) {
            this.transform.setScaleY(value);
        }
        get scaleY() {
            return this.transform.scaleY;
        }
        set rotation(value) {
            this.transform.setRotation(value);
        }
        get rotation() {
            return this.transform.rotation;
        }
        destroy(reparentChildren) {
            if (reparentChildren) {
                ReparentChildren(this, reparentChildren);
            }
            else {
                DestroyChildren(this);
            }
            this.transform.destroy();
            this.dirty.destroy();
            this.bounds.destroy();
            this.input.destroy();
            this.world = null;
            this.parent = null;
            this.children = null;
        }
    }

    function RemoveChildren(parent, ...children) {
        children.forEach(child => {
            RemoveChild(parent, child);
        });
    }

    class Container extends GameObject {
        constructor(x = 0, y = 0) {
            super(x, y);
            this._alpha = 1;
            this.type = 'Container';
        }
        get alpha() {
            return this._alpha;
        }
        set alpha(value) {
            if (value !== this._alpha) {
                this._alpha = value;
            }
        }
    }

    function SetFrame(texture, key, ...sprite) {
        const frame = texture.get(key);
        sprite.forEach(entity => {
            if (frame === entity.frame) {
                return;
            }
            entity.frame = frame;
            entity.transform.setSize(frame.sourceSizeWidth, frame.sourceSizeHeight);
            entity.bounds.setArea(entity.x, entity.y, entity.width, entity.height);
            const pivot = frame.pivot;
            if (pivot) {
                entity.transform.setOrigin(pivot.x, pivot.y);
            }
            const data = entity.vertexData;
            data[2] = frame.u0;
            data[3] = frame.v0;
            data[8] = frame.u0;
            data[9] = frame.v1;
            data[14] = frame.u1;
            data[15] = frame.v1;
            data[20] = frame.u1;
            data[21] = frame.v0;
            entity.dirty.setRender();
            entity.hasTexture = true;
        });
    }

    function SetTexture(key, frame, ...sprite) {
        if (!key) {
            return;
        }
        let texture;
        if (key instanceof Texture) {
            texture = key;
        }
        else {
            texture = TextureManagerInstance.get().get(key);
        }
        if (!texture) {
            console.warn('Invalid Texture key: ' + key);
            return;
        }
        else {
            if (!texture.glTexture) {
                texture.createGL();
            }
            sprite.forEach(entity => {
                entity.texture = texture;
                SetFrame(texture, frame, entity);
            });
        }
    }

    class Sprite extends Container {
        constructor(x, y, texture, frame) {
            super(x, y);
            this.hasTexture = false;
            this.prevTextureID = -1;
            this._tint = 0xffffff;
            this.vertexData = new Float32Array(24).fill(0);
            this.vertexColor = new Uint32Array(4).fill(4294967295);
            this.vertexAlpha = new Float32Array(4).fill(1);
            this.vertexTint = new Uint32Array(4).fill(0xffffff);
            this.type = 'Sprite';
            this.setTexture(texture, frame);
            this.bounds.setArea(x, y, this.width, this.height);
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
        updateVertices() {
            const data = this.vertexData;
            this.dirty.render = false;
            const frame = this.frame;
            const originX = this.originX;
            const originY = this.originY;
            let w0;
            let w1;
            let h0;
            let h1;
            const { a, b, c, d, tx, ty } = this.transform.world;
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
            data[0] = x0;
            data[1] = y0;
            data[6] = x1;
            data[7] = y1;
            data[12] = x2;
            data[13] = y2;
            data[18] = x3;
            data[19] = y3;
            const boundsX = Math.min(x0, x1, x2, x3);
            const boundsY = Math.min(y0, y1, y2, y3);
            const boundsRight = Math.max(x0, x1, x2, x3);
            const boundsBottom = Math.max(y0, y1, y2, y3);
            this.bounds.setArea(boundsX, boundsY, boundsRight, boundsBottom);
        }
        get tint() {
            return this._tint;
        }
        set tint(value) {
            this._tint = value;
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

    const Arne16 = [
        '#000',
        '#9D9D9D',
        '#FFF',
        '#BE2633',
        '#E06F8B',
        '#493C2B',
        '#A46422',
        '#EB8931',
        '#F7E26B',
        '#2F484E',
        '#44891A',
        '#A3CE27',
        '#1B2632',
        '#005784',
        '#31A2F2',
        '#B2DCEF'
    ];

    const PICO8 = [
        '#000',
        '#1D2B53',
        '#7E2553',
        '#008751',
        '#AB5236',
        '#5F574F',
        '#C2C3C7',
        '#FFF1E8',
        '#FF004D',
        '#FFA300',
        '#FFEC27',
        '#00E436',
        '#29ADFF',
        '#83769C',
        '#FF77A8',
        '#FFCCAA'
    ];

    function PixelTexture(config) {
        const { data = [], palette = Arne16, pixelWidth = 1, pixelHeight = pixelWidth, preRender = null, postRender = null } = config;
        let { canvas = null, resizeCanvas = true, clearCanvas = true } = config;
        const width = Math.floor(Math.abs(data[0].length * pixelWidth));
        const height = Math.floor(Math.abs(data.length * pixelHeight));
        if (!canvas) {
            canvas = CreateCanvas(width, height).canvas;
            resizeCanvas = false;
            clearCanvas = false;
        }
        if (resizeCanvas) {
            canvas.width = width;
            canvas.height = height;
        }
        const ctx = canvas.getContext('2d');
        if (clearCanvas) {
            ctx.clearRect(0, 0, width, height);
        }
        if (preRender) {
            preRender(canvas, ctx);
        }
        for (let y = 0; y < data.length; y++) {
            const row = data[y];
            for (let x = 0; x < row.length; x++) {
                const d = row[x];
                if (d !== '.' && d !== ' ') {
                    ctx.fillStyle = palette[parseInt('0x' + d.toUpperCase())];
                    ctx.fillRect(x * pixelWidth, y * pixelHeight, pixelWidth, pixelHeight);
                }
            }
        }
        if (postRender) {
            postRender(canvas, ctx);
        }
        return new Texture(canvas);
    }

    class Clock {
        constructor(world) {
            this.world = world;
            this.timeScale = 1;
            this.events = new Set();
        }
        update(delta, time) {
            this.now = time;
            delta *= this.timeScale;
            this.events.forEach(timer => {
                if (timer.update(delta)) {
                    this.events.delete(timer);
                }
            });
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
            scene.key = GetConfigValue(config, 'key', 'scene' + sceneIndex);
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
            this.renderer = null;
            this.matrix = null;
            this.bounds = null;
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

    class StaticWorld extends GameObject {
        constructor(scene) {
            super();
            this.camera = new StaticCamera();
            this.forceRefresh = false;
            this.world = this;
            this.scene = scene;
            this.clock = new Clock(this);
            this.renderData = CreateWorldRenderData(this.camera);
            On(scene, 'update', (delta, time) => this.update(delta, time));
            On(scene, 'render', (renderData) => this.render(renderData));
            On(scene, 'shutdown', () => this.shutdown());
            Once(scene, 'destroy', () => this.destroy());
        }
        scanChildren(root, renderData) {
            const children = root.children;
            for (let i = 0; i < children.length; i++) {
                this.buildRenderList(children[i], renderData);
            }
        }
        buildRenderList(root, renderData) {
            if (root.isRenderable()) {
                renderData.numRendered++;
                renderData.numRenderable++;
                renderData.renderList.push(root);
                if (root.dirty.frame >= renderData.gameFrame) {
                    renderData.dirtyFrame++;
                }
            }
            if (root.visible && root.numChildren) {
                this.scanChildren(root, renderData);
            }
        }
        update(delta, time) {
            if (!this.willUpdate) {
                return;
            }
            this.clock.update(delta, time);
            super.update(delta, time);
        }
        render(sceneRenderData) {
            const renderData = this.renderData;
            ResetWorldRenderData(renderData, sceneRenderData.gameFrame);
            if (!this.willRender) {
                return;
            }
            this.scanChildren(this, renderData);
            if (this.forceRefresh) {
                renderData.dirtyFrame++;
                this.forceRefresh = false;
            }
            MergeRenderData(sceneRenderData, renderData);
            this.camera.dirtyRender = false;
        }
        shutdown() {
            RemoveChildren(this);
            this.renderData.renderList.length = 0;
            this.camera.reset();
        }
        destroy() {
            super.destroy();
            this.camera.destroy();
            this.renderData.renderList.length = 0;
            this.camera = null;
            this.renderData = null;
        }
    }

    class Demo extends Scene {
        constructor() {
            super();
            const world = new StaticWorld(this);
            const texture = PixelTexture({
                data: [
                    '..9..9..',
                    '..9999..',
                    '.AAAAAA.',
                    '.A1F1FA.',
                    '.AFFFFA.',
                    '.FEEEEAA',
                    '.EEEEEEA',
                    '..E..E..'
                ],
                pixelWidth: 32,
                pixelHeight: 32,
                palette: PICO8
            });
            const princess = new Sprite(400, 300, texture);
            AddChild(world, princess);
        }
    }
    new Game(CanvasRenderer$1(), Parent('example'), Scenes(Demo));

}());
//# sourceMappingURL=pixel1.js.map
