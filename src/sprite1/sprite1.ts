import Game from '@phaserjs/phaser/Game';
import StaticScene from '@phaserjs/phaser/scenes/StaticScene';
import Sprite from '@phaserjs/phaser/gameobjects/sprite/Sprite';
import ImageFile from '@phaserjs/phaser/loader/files/ImageFile';
import AddChild from '@phaserjs/phaser/gameobjects/container/AddChild';

class Demo extends StaticScene
{
    logo: Sprite;

    constructor ()
    {
        super({ willUpdate: false });

        ImageFile('logo', 'assets/logo.png').load().then(() => {

            this.logo = new Sprite(400, 300, 'logo');

            AddChild(this.world, this.logo);

            this.willUpdate = true;
    
        });
    }

    update ()
    {
        this.logo.rotation += 0.01;
    }
}

export default function ()
{
    new Game({
        width: 800,
        height: 600,
        backgroundColor: 0x330033,
        parent: 'gameParent',
        scene: Demo
    });
}
