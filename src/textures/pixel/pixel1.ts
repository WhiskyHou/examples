import { Game, Scene } from '@phaserjs/phaser';
import { Parent, Scenes } from '@phaserjs/phaser/config';

import { AddChild } from '@phaserjs/phaser/gameobjects/AddChild';
import { PICO8 } from '@phaserjs/phaser/textures/palettes/PICO8';
import { PixelTexture } from '@phaserjs/phaser/textures/types/PixelTexture';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import { StaticWorld } from '@phaserjs/phaser/world/StaticWorld';

class Demo extends Scene
{
    constructor ()
    {
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

new Game(
    Parent('example'),
    Scenes(Demo)
);
