import { BackgroundColor, Parent, Scenes, Size, WebGLRenderer } from '@phaserjs/phaser/config';
import { Game, Scene } from '@phaserjs/phaser';

import { AddChild } from '@phaserjs/phaser/display/';
import { ImageFile } from '@phaserjs/phaser/loader/files/ImageFile';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import { StaticWorld } from '@phaserjs/phaser/world';

class Demo extends Scene
{
    constructor ()
    {
        super();

        ImageFile('logo', 'assets/logo.png').load().then(() => {

            const world = new StaticWorld(this);

            const logo = new Sprite(400, 300, 'logo');

            AddChild(world, logo);
    
        });
    }
}

new Game(
    WebGLRenderer(),
    Size(800, 600),
    Parent('example'),
    BackgroundColor(0x640b50),
    Scenes(Demo)
);
