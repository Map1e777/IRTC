import { terser } from 'rollup-plugin-terser';
import webWorkerLoader from 'rollup-plugin-web-worker-loader';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';

export default [
  // TODO rollup拆分点1
  {
    input: 'src/index.js',
    output: {
      file: '../../public/js/WRTC.js',
      format: 'umd',
      name: 'WRTC',
    },
    plugins: [
      // 添加 @rollup/plugin-commonjs 插件
      commonjs(),
      terser({
        compress: {
          drop_console: false,
        },
      }),
      webWorkerLoader(),
      nodeResolve(),
    ],
  },
  // {
  //   input: 'src/index.js',
  //   output: {
  //     file: 'es/WRTC.js',
  //     format: 'es',
  //   },
  //   plugins: [
  //     terser({
  //       compress: {
  //         drop_console: true,
  //       },
  //     }),
  //     webWorkerLoader(),
  //     nodeResolve(),
  //   ],
  // },
  // {
  //   input: 'src/index.js',
  //   output: {
  //     file: 'cjs/WRTC.js',
  //     format: 'cjs',
  //     exports: 'default',
  //   },
  //   plugins: [
  //     terser({
  //       compress: {
  //         drop_console: true,
  //       },
  //     }),
  //     webWorkerLoader(),
  //     nodeResolve(),
  //   ],
  // },
];
