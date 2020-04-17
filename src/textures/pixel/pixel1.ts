import { AddChild } from '@phaserjs/phaser/gameobjects/container';
import { Game, StaticScene } from '@phaserjs/phaser';
import { Parent, Scenes } from '@phaserjs/phaser/config';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite';
import { PixelTexture } from '@phaserjs/phaser/textures/types';
import { PICO8 } from '@phaserjs/phaser/textures/palettes';

class Demo extends StaticScene
{
    constructor ()
    {
        super();

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

        AddChild(this.world, princess);
    }
}

new Game(
    Parent('example'),
    Scenes(Demo)
);
