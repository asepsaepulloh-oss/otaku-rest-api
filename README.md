```markdown
# Otakudesu REST API

A REST API that scrapes anime data from Otakudesu. Built with Node.js, Express, Axios, and Cheerio.

## Features

- Latest episodes
- Ongoing anime with pagination
- Complete anime with pagination
- Anime search
- Genre filtering
- Release schedule
- Anime details with synopsis
- Episode streaming links
- Download links
- Batch downloads
- Rate limiting
- CORS enabled
- Production ready

## Installation

```bash
git clone https://github.com/username/otakudesu-rest-api.git
cd otakudesu-rest-api
npm install
cp .env.example .env
npm start
```

API Endpoints

Method Endpoint Description
GET / API info
GET /health Health check
GET /api/home Latest episodes
GET /api/ongoing?page=1&limit=20 Ongoing anime
GET /api/complete?page=1&limit=20 Complete anime
GET /api/genres All genres
GET /api/genre/:slug?page=1 Anime by genre
GET /api/schedule Release schedule
GET /api/search?q=query Search anime
GET /api/anime/:slug Anime detail
GET /api/episode/:slug Episode streams
GET /api/batch/:slug Batch downloads
GET /api/watch/:slug Watch page

Response Format

Success

```json
{
  "success": true,
  "status": 200,
  "message": "Success",
  "data": {},
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Error

```json
{
  "success": false,
  "status": 400,
  "message": "Error message",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

Environment Variables

```env
PORT=3000
BASE_URL=https://otakudesu.blog
NODE_ENV=production
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

Deployment

Vercel

```bash
vercel --prod
```

Heroku

```bash
heroku create otakudesu-api
git push heroku main
```

Tech Stack

· Node.js
· Express.js
· Axios
· Cheerio
· Helmet
· CORS
· express-rate-limit
· dotenv

License

MIT

Disclaimer

For educational purposes only. All content belongs to Otakudesu.

Author

Otakudesu REST API Team

```

---