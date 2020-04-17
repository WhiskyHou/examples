import { Game, StaticScene } from '@phaserjs/phaser';
import { Size, Parent, Scenes } from '@phaserjs/phaser/config';
import { SolidColorTexture } from '@phaserjs/phaser/textures/types';
import { Container, AddChild } from '@phaserjs/phaser/gameobjects/container';
import { Sprite } from '@phaserjs/phaser/gameobjects/sprite';

class Demo extends StaticScene
{
    constructor ()
    {
        super();

        const redBlock = SolidColorTexture('#f00', 64, 64);

        const block1 = new Sprite(100, 200, redBlock);
        const block2 = new Sprite(200, 200, redBlock);
        const block3 = new Sprite(300, 200, redBlock);

        const parent = new Container();

        AddChild(parent, block1, block2, block3);
    }
}

export default () => {

    new Game(
        Size(800, 600),
        Parent('example'),
        Scenes(Demo)
    );

}
