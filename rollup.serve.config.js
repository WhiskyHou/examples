import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import filesize from 'rollup-plugin-filesize';
import image from '@rollup/plugin-image';
import serve from 'rollup-plugin-serve'

const extensions = [
    '.js', '.jsx', '.ts', '.tsx'
];

//  --input src/sprite1/sprite1.ts
const filenameTS = process.argv[process.argv.length - 1];
const filenamePUBLIC = filenameTS.replace('src/', 'public/');
const filenameJS = filenamePUBLIC.replace('.ts', '.js');
const filenameHTTP = filenameJS.replace('public/', '');

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
                filesize()
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
            tsconfig: './tsconfig.json'
        }),

        serve({
            open: true,
            openPage: '/index.html?f=' + filenameHTTP,
            contentBase: 'public',
            host: 'localhost',
            port: 8080,
            headers: {
                'Access-Control-Allow-Origin': '*'
              }
        })

    ]

};