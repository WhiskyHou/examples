# Phaser 4 Examples

To build an example you must provide the full path to the TypeScript filename as the input parameter:

```js
npm run build --input src/sprite1/sprite1.ts
```
If the filename has spaces, or other special characters in, quote it:

```js
npm run build --input "src/container/add child.ts"
```

To bundle a minified dist version of an example:

```js
npm run dist --input src/sprite1/sprite1.ts
```

To run a watch on an example:

```js
npm run watch --input src/sprite1/sprite1.ts
```
To run a watch and an http-server on an example:

```js
npm run serve --input src/sprite1/sprite1.ts
```
