const fs = require('fs-extra');
const { dirname, join } = require('path');
const { nodeFileTrace } = require('@vercel/nft');

async function main() {
  // Start fresh
  fs.removeSync('.vercel/output');

  // Copy static files
  fs.mkdirpSync('.vercel/output/static');
  fs.copySync('public/build', '.vercel/output/static/build');

  // Create `render` function
  const funcDir = '.vercel/output/functions/render.func';
  fs.mkdirpSync(funcDir);
  fs.copySync('build', join(funcDir, 'build'));
  fs.writeFileSync(join(funcDir, 'index.js'), `const {
    createRequestHandler,
  } = require("@remix-run/vercel");
  module.exports = createRequestHandler({
    build: require("./build"),
  });`);

  const trace = await nodeFileTrace([join(funcDir, 'index.js')]);
  for (const file of trace.fileList) {
    if (file.startsWith(funcDir)) continue;
    fs.mkdirpSync(join(funcDir, dirname(file)));
    fs.copySync(file, join(funcDir, file));
  }

  const config = {
    version: 3,
    routes: [
      {
        src: '^/build/(.*)$',
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        continue: true,
      },
      {
        handle: 'filesystem',
      },
      {
        src: '/(.*)',
        dest: '/render',
      },
    ]
  };
  fs.writeJSONSync('.vercel/output/config.json', config, { spaces: 2 });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
