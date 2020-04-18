import AddChild from '@phaserjs/phaser/gameobjects/container/AddChild';
import { Game, StaticScene } from '@phaserjs/phaser';
import { BackgroundColor, Size, Parent, Scenes } from '@phaserjs/phaser/config';
import { Text, SetPadding, SetFont, SetBackgroundStyle } from '@phaserjs/phaser/gameobjects/text';

class Demo extends StaticScene
{
    constructor ()
    {
        super();

        const play = new Text(400, 300, 'Play', '48px Arial Black');
        const options = new Text(200, 450, 'Options');
        const credits = new Text(600, 450, 'Credits');

        SetFont('32px Arial Black', options, credits);
        SetPadding(32, 32, 16, 16, play, options, credits);
        SetBackgroundStyle('#2c47e7', 32, play, options, credits);

        AddChild(this.world, play, options, credits);
    }
}

new Game(
    Size(800, 600, 2),
    Parent('example'),
    BackgroundColor(0x640b50),
    Scenes(Demo)
);
