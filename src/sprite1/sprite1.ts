import AddChild from '@phaserjs/phaser/gameobjects/container/AddChild';
import { Game, StaticScene } from '@phaserjs/phaser';
import { BackgroundColor, Size, Parent, Scenes } from '@phaserjs/phaser/config';
import Sprite from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import ImageFile from '@phaserjs/phaser/loader/files/ImageFile';

class Demo extends StaticScene
{
    logo: Sprite;

    constructor ()
    {
        super({ willUpdate: false });

        ImageFile('logo', 'assets/logo.png').load().then(() => {

            this.logo = new Sprite(400, 300, 'logo');

            const logo2 = new Sprite(400, 400, 'logo').setScale(0.5);

            AddChild(this.world, this.logo, logo2);

            this.willUpdate = true;
    
        });
    }

    update ()
    {
        this.logo.rotation += 0.01;
    }
}

new Game(
    Size(800, 600),
    Parent('example'),
    BackgroundColor(0x640b50),
    Scenes(Demo)
);
