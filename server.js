// Zaza Woods configurator server:
//  - serves the static site (index.html, ar-generator.html, *.glb)
//  - accepts AR model uploads and serves them back at a real https URL,
//    so Android Scene Viewer / iOS Quick Look can fetch them for native AR.
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory store of uploaded AR models. Each lives for a while, then is GC'd.
const store = new Map(); // "<id>.<ext>" -> { buf, type, exp }
const TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

// ---- AR upload: POST raw binary, get back a fetchable URL ----
app.post('/ar-upload/:ext', express.raw({ type: '*/*', limit: '60mb' }), (req, res) => {
  const ext = req.params.ext === 'usdz' ? 'usdz' : 'glb';
  if (!req.body || !req.body.length) return res.status(400).json({ error: 'empty' });
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const file = id + '.' + ext;
  const type = ext === 'usdz' ? 'model/vnd.usdz+zip' : 'model/gltf-binary';
  store.set(file, { buf: req.body, type, exp: Date.now() + TTL_MS });
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({ url: '/ar/' + file });
});

// ---- AR fetch: native AR apps download the model from here ----
app.get('/ar/:file', (req, res) => {
  const item = store.get(req.params.file);
  if (!item) return res.status(404).send('not found');
  res.setHeader('Content-Type', item.type);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(item.buf);
});

// ---- Static site ----
app.use(express.static(path.join(__dirname), {
  extensions: false,
  setHeaders: (res, p) => { if (p.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache'); }
}));

// Periodic cleanup of expired uploads
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.exp < now) store.delete(k);
}, 10 * 60 * 1000);

app.listen(PORT, () => console.log('Zaza Woods server on :' + PORT));
