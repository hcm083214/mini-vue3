import nodeResolve from "@rollup/plugin-node-resolve";
import ts from "rollup-plugin-typescript2";
import path from 'path';
import commonjs from "@rollup/plugin-commonjs";

const extensions = [
    '.ts',
    '.tsx',
    '.js'
];
export default {
    input: 'package/vue/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'iife',//amd cjs esm iife umd
        name: 'MVue',//可以在 window 上直接访问 MVue
        sourceMap: true,//生成映射文件
    },
    plugins: [
        nodeResolve(),
        ts({
            tsconfig: path.resolve(__dirname, 'tsconfig.json'),
            extensions
        }),
        commonjs()
    ]
}