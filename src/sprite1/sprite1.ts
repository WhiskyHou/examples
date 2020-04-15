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

new Game({
    width: 800,
    height: 600,
    backgroundColor: 0x330033,
    parent: 'gameParent',
    scene: Demo
});
