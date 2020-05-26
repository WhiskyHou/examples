import { AddChild, AddChildren } from '@phaserjs/phaser/display/';
import { BackgroundColor, Parent, Scenes, Size, WebGLRenderer } from '@phaserjs/phaser/config';
import { Between, FloatBetween } from '@phaserjs/phaser/math';
import { Game, Loader, Scene } from '@phaserjs/phaser';

import { EffectLayer } from '@phaserjs/phaser/gameobjects';
import { ImageFile } from '@phaserjs/phaser/loader/files/ImageFile';
import { Shader } from '@phaserjs/phaser/renderer/webgl1/shaders/Shader';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import { StaticWorld } from '@phaserjs/phaser/world';

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

class Demo extends Scene
{
    constructor ()
    {
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

    create ()
    {
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

new Game(
    WebGLRenderer(),
    Size(800, 600),
    Parent('example'),
    BackgroundColor(0x640b50),
    Scenes(Demo)
);
