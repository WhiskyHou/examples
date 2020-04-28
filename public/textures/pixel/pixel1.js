(function (config, AddChild, PICO8, PixelTexture, Sprite, StaticWorld) {
    'use strict';

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

    let gl;
    const GL = {
        get: () => {
            return gl;
        },
        set: (context) => {
            gl = context;
        }
    };

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

    let instance$1;
    const TextureManagerInstance = {
        get: () => {
            return instance$1;
        },
        set: (manager) => {
            instance$1 = manager;
        }
    };

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

    let instance$2;
    function GetRenderer() {
        return instance$2;
    }

    let _scenes = [];
    function GetScenes() {
        return _scenes;
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

    class Demo extends Scene {
        constructor() {
            super();
            const world = new StaticWorld.StaticWorld(this);
            const texture = PixelTexture.PixelTexture({
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
                palette: PICO8.PICO8
            });
            const princess = new Sprite.Sprite(400, 300, texture);
            AddChild.AddChild(world, princess);
        }
    }
    new Game(config.Parent('example'), config.Scenes(Demo));

}(config, AddChild, PICO8, PixelTexture, Sprite, StaticWorld));
//# sourceMappingURL=pixel1.js.map
