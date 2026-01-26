const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();

// Caching volledig uit
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Statische files uit /public
app.use(express.static(path.join(__dirname, 'public')));

// Zoekopdrachten via Ecosia
app.get('/search', (req, res) => {
  const query = req.query.q;
  if (query) {
    res.redirect(`https://www.ecosia.org/search?q=${encodeURIComponent(query)}`);
  } else {
    res.status(400).send('Bad Request: No search query provided');
  }
});

/**
 * Proxy endpoint:
 * /proxy?url=https://voorbeeld.nl/pad?x=1
 *
 * - Valideert de URL
 * - Zet req.url om naar het pad van de target
 * - Stuurt de request door met http-proxy-middleware
 */
app.use('/proxy', (req, res, next) => {
  const targetUrl = req.query.url;

  if (!targetUrl) {
    return res.status(400).send('Bad Request: No URL provided');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (err) {
    return res.status(400).send('Bad Request: Invalid URL');
  }

  return createProxyMiddleware({
    target: parsedUrl.origin,
    changeOrigin: true,
    followRedirects: true,

    // Belangrijk: laat de proxy zelf de volledige URL opbouwen
    pathRewrite: (path, req) => {
      return parsedUrl.pathname + parsedUrl.search;
    },

    onError: (err, req, res) => {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(500).send('Proxy error: ' + err.message);
      }
    }
  })(req, res, next);
});

// Hoofdpagina
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Aangepaste 404 pagina
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});

// Start de server (Render gebruikt zelf PORT variabele)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Proxy server is running on port ' + PORT);
});
