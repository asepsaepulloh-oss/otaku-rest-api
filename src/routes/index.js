const express = require('express');
const router = express.Router();
const AnimeController = require('../controllers/animeController');
const { rateLimiter } = require('../middlewares/rateLimiter');

router.get('/', (req, res) => {
  res.json({
    name: 'Otakudesu REST API',
    version: '1.0.0',
    description: 'Anime streaming API with Otakudesu scraper',
    endpoints: {
      home: '/api/home',
      ongoing: '/api/ongoing?page=1&limit=20',
      complete: '/api/complete?page=1&limit=20',
      genres: '/api/genres',
      genre: '/api/genre/:slug?page=1',
      schedule: '/api/schedule',
      search: '/api/search?q=query',
      detail: '/api/anime/:slug',
      episode: '/api/episode/:slug',
      batch: '/api/batch/:slug',
      watch: '/api/watch/:slug'
    },
    documentation: 'https://github.com/username/otakudesu-rest-api',
    author: 'Otakudesu REST API',
    license: 'MIT'
  });
});

router.use('/api', rateLimiter);

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

router.get('/api/home', AnimeController.home);
router.get('/api/ongoing', AnimeController.ongoing);
router.get('/api/complete', AnimeController.complete);
router.get('/api/genres', AnimeController.genres);
router.get('/api/genre/:slug', AnimeController.genreBySlug);
router.get('/api/schedule', AnimeController.schedule);
router.get('/api/search', AnimeController.search);
router.get('/api/anime/:slug', AnimeController.detail);
router.get('/api/episode/:slug', AnimeController.episode);
router.get('/api/batch/:slug', AnimeController.batch);
router.get('/api/watch/:slug', AnimeController.watch);

module.exports = router;