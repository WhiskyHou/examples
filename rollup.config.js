import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import filesize from 'rollup-plugin-filesize';
import image from '@rollup/plugin-image';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx'
];

//  To build:
//  npm run build --input src/sprite1/sprite1.ts

//  For files with special characters in, quote them:
//  npm run build --input "src/container/add child.ts"

const filenameTS = process.argv[process.argv.length - 1];
const filenamePUBLIC = filenameTS.replace('src/', 'public/');
const filenameJS = filenamePUBLIC.replace('.ts', '.js');

export default {

    //  no 'input' because you have to pass it on the command-line:
    //  npm run build --input src/sprite1/sprite1.ts

    output: [
        {
            file: filenameJS,
            format: 'iife',
            name: 'Phaser4Example',
            sourcemap: true,
            plugins: [
                // filesize()
            ]
        }
    ],

    onwarn: (warning, next) =>
    {
        if (warning.code === 'DEPRECATED_FEATURE')
        {
            return;
        }
        else
        {
            next(warning);
        }
    },

    plugins: [

        image({
            //  If true, instructs the plugin to generate an ES Module which exports a DOM Image
            //  If false, plugin generates base64 data
            dom: true
        }),

        resolve({
            extensions
        }),

        typescript({
            include: filenameTS,
            tsconfig: './tsconfig.json'
        })

    ]

};