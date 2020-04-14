import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import image from '@rollup/plugin-image';
// import { terser } from 'rollup-plugin-terser';
// import filesize from 'rollup-plugin-filesize';

const extensions = [
    '.js', '.jsx', '.ts', '.tsx'
];

export default {

    input: './examples/index.ts',

    output: [
        {
            file: './examples/index.js',
            format: 'iife',
            name: 'Phaser4NanoExample',
            sourcemap: true,
            plugins: [
                // terser(),
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
            tsconfig: './examples.tsconfig.json'
        })

    ]

};