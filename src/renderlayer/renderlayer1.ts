import * as Sine from '@phaserjs/phaser/math/easing/sine/';

import { AddChild, AddChildren } from '@phaserjs/phaser/display/';
import { BackgroundColor, Parent, Scenes, Size, WebGLRenderer } from '@phaserjs/phaser/config';
import { Between, FloatBetween } from '@phaserjs/phaser/math';
import { Game, Loader, Scene } from '@phaserjs/phaser';

import { AddTween } from '@phaserjs/phaser/motion/tween/nano';
import { ImageFile } from '@phaserjs/phaser/loader/files/ImageFile';
import { RenderLayer } from '@phaserjs/phaser/gameobjects';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import { StaticWorld } from '@phaserjs/phaser/world';

class Demo extends Scene
{
    constructor ()
    {
        super();

        const loader = new Loader();

        loader.setPath('/phaser4-examples/public/assets/');
        // loader.setPath('/examples/public/assets/');

        loader.add(ImageFile('logo', 'logo.png'));
        loader.add(ImageFile('rocket', 'rocket.png'));
        loader.add(ImageFile('star', 'star.png'));
        loader.add(ImageFile('bubble', 'bubble256.png'));
        loader.add(ImageFile('skull', 'skull.png'));

        loader.start().then(() => this.create());
    }

    create ()
    {
        const world = new StaticWorld(this);

        const layer = new RenderLayer();

        for (let i = 0; i < 500; i++)
        {
            let x = Between(0, 800);
            let y = Between(0, 600);
            let s = FloatBetween(0.2, 0.5);

            let star = new Sprite(x, y, 'star').setScale(s);

            AddChild(layer, star);
        }

        const logo = new Sprite(400, 100, 'logo');

        AddTween(logo).to(2000, { y: 500 }).repeat(1000).yoyo().easing(Sine.InOut);

        AddChildren(world, layer, logo);
    }
}

new Game(
    WebGLRenderer(),
    Size(800, 600),
    Parent('example'),
    BackgroundColor(0x640b50),
    Scenes(Demo)
);
