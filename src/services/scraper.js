const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const config = require('../config');

class CookieJar {
  constructor() {
    this.cookies = {};
  }

  update(headers) {
    const setCookie = headers['set-cookie'];
    if (!setCookie) return;
    
    const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const cookieStr of cookies) {
      const parts = cookieStr.split(';')[0].split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        this.cookies[key] = value;
      }
    }
  }

  getString() {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  clear() {
    this.cookies = {};
  }
}

class RequestHandler {
  constructor() {
    this.uaIndex = 0;
    this.cookieJar = new CookieJar();
  }

  delay(min = config.delayMin, max = config.delayMax) {
    return new Promise(resolve => {
      const ms = Math.floor(Math.random() * (max - min + 1)) + min;
      setTimeout(resolve, ms);
    });
  }

  getHeaders(ref = config.baseUrl, cookie = '') {
    const ua = config.userAgents[this.uaIndex % config.userAgents.length];
    this.uaIndex++;
    
    const isMobile = ua.includes('Mobile') || ua.includes('iPhone') || ua.includes('Android');
    const platform = ua.includes('Windows') ? 'Windows' : 
                     ua.includes('Mac') ? 'macOS' : 'Linux';

    const headers = {
      'User-Agent': ua,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
      'Accept-Encoding': 'gzip, deflate, br',
      'Referer': ref || config.baseUrl,
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      'DNT': '1',
      'Sec-Ch-Ua': `"${ua.includes('Chrome') ? 'Google Chrome' : 'Chromium'}"`,
      'Sec-Ch-Ua-Mobile': isMobile ? '?1' : '?0',
      'Sec-Ch-Ua-Platform': `"${platform}"`,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'same-origin',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
      'Connection': 'keep-alive'
    };

    if (cookie) {
      headers['Cookie'] = cookie;
    }

    return headers;
  }

  async request(method, url, data = null, headers = {}, retries = config.retries) {
    let lastError = null;

    for (let i = 0; i < retries; i++) {
      try {
        await this.delay();

        const requestConfig = {
          method,
          url,
          headers,
          timeout: config.timeout,
          httpsAgent: new https.Agent({ 
            rejectUnauthorized: false, 
            keepAlive: true 
          }),
          maxRedirects: 5,
          decompress: true,
          validateStatus: status => status >= 200 && status < 400
        };

        if (data && (method === 'POST' || method === 'PUT')) {
          requestConfig.data = data;
        }

        const response = await axios(requestConfig);
        this.cookieJar.update(response.headers);
        return response;
      } catch (error) {
        lastError = error;
        if (i < retries - 1) {
          await this.delay(1500, 4000);
        }
      }
    }

    throw lastError;
  }

  async fetchHTML(url, retries = config.retries) {
    const headers = this.getHeaders(url, this.cookieJar.getString());
    const response = await this.request('GET', url, null, headers, retries);
    return response.data;
  }

  async postAjax(payload, retries = config.retries) {
    const params = new URLSearchParams(payload);
    const url = `${config.baseUrl}/wp-admin/admin-ajax.php`;
    const headers = {
      ...this.getHeaders(config.baseUrl, this.cookieJar.getString()),
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    const response = await this.request('POST', url, params.toString(), headers, retries);
    return response.data;
  }
}

class OtakudesuScraper {
  constructor() {
    this.base = config.baseUrl;
    this.requestHandler = new RequestHandler();
  }

  clean(obj) {
    if (obj === null || obj === undefined) return undefined;
    if (Array.isArray(obj)) return obj.map(item => this.clean(item));
    if (typeof obj === 'object') {
      const result = {};
      for (const key of Object.keys(obj)) {
        const value = this.clean(obj[key]);
        if (value !== undefined) result[key] = value;
      }
      return Object.keys(result).length ? result : undefined;
    }
    return obj;
  }

  parsePagination($) {
    const result = {
      current: 1,
      next: null,
      hasNext: false,
      total: null
    };

    const pageLinks = [];
    const selectors = '.pagination a, .pagination span, .page-numbers, .pagenavix a, .pagenavix span';
    
    $(selectors).each((i, el) => {
      const href = $(el).attr('href');
      const text = $(el).text().trim();
      if (href) pageLinks.push({ text, href });
    });

    const numbers = pageLinks
      .filter(link => /^\d+$/.test(link.text))
      .map(link => parseInt(link.text));

    if (numbers.length) {
      result.total = Math.max(...numbers);
    }

    const current = $('.pagination .page-numbers.current, .pagenavix .page-numbers.current').first();
    if (current.length) {
      const text = current.text().trim();
      if (/^\d+$/.test(text)) {
        result.current = parseInt(text);
      }
    }

    if (result.total && result.current < result.total) {
      result.hasNext = true;
      const nextLink = pageLinks.find(link => 
        link.text === 'Next' || 
        link.text === '»' || 
        link.text.toLowerCase().includes('next')
      );
      
      if (nextLink && nextLink.href) {
        result.next = nextLink.href.startsWith('http') ? 
          nextLink.href : 
          this.base + nextLink.href;
      }
    }

    return result;
  }

  parseCardDetpost($, element) {
    const $el = $(element);
    const link = $el.find('.thumb a').attr('href');
    const title = $el.find('.jdlflm').text().trim();
    const poster = $el.find('.thumbz img').attr('src') || null;
    const episode = $el.find('.epz').text().trim() || null;
    const day = $el.find('.epztipe').text().trim() || null;
    const date = $el.find('.newnime').text().trim() || null;

    if (!link || !title) return null;

    return {
      title,
      url: link.startsWith('http') ? link : this.base + link,
      poster,
      episode,
      day,
      date
    };
  }

  parseCardColAnime($, element) {
    const $el = $(element);
    const link = $el.find('.col-anime-title a').attr('href');
    const title = $el.find('.col-anime-title a').text().trim();
    const studio = $el.find('.col-anime-studio').text().trim() || null;
    const episodes = $el.find('.col-anime-eps').text().trim() || null;
    const rating = $el.find('.col-anime-rating').text().trim() || null;
    const genres = $el.find('.col-anime-genre a').map((_, a) => $(a).text()).get() || [];
    const poster = $el.find('.col-anime-cover img').attr('src') || null;
    const synopsis = $el.find('.col-synopsis p').text().trim() || null;
    const season = $el.find('.col-anime-date').text().trim() || null;

    if (!link || !title) return null;

    return {
      title,
      url: link.startsWith('http') ? link : this.base + link,
      studio,
      episodes,
      rating,
      genres,
      poster,
      synopsis,
      season
    };
  }

  parseGenreList($) {
    const genres = [];
    $('.genres li a').each((i, el) => {
      const $el = $(el);
      const name = $el.text().trim();
      const link = $el.attr('href');
      
      if (name && link) {
        const slug = link.replace(/\/genres\/([^\/]+)\/?/, '$1');
        genres.push({
          name,
          slug,
          url: link.startsWith('http') ? link : this.base + link
        });
      }
    });
    return genres;
  }

  parseSchedule($) {
    const schedule = {};
    
    $('.kglist321').each((i, el) => {
      const $el = $(el);
      const day = $el.find('h2').text().trim();
      const items = [];
      
      $el.find('ul li a').each((j, a) => {
        const $a = $(a);
        items.push({
          title: $a.text().trim(),
          url: $a.attr('href').startsWith('http') ? 
            $a.attr('href') : 
            this.base + $a.attr('href')
        });
      });
      
      if (day && items.length) {
        schedule[day] = items;
      }
    });
    
    return schedule;
  }

  parseEpisodeList($) {
    const episodes = [];
    
    $('.episodelist ul li').each((i, el) => {
      const $el = $(el);
      const $a = $el.find('a');
      const title = $a.text().trim();
      const href = $a.attr('href');
      const date = $el.find('.zeebr').text().trim() || null;
      
      if (href && title) {
        const match = href.match(/\/episode\/([^\/]+)\/?$/);
        episodes.push({
          title,
          episodeId: match ? match[1] : null,
          url: href.startsWith('http') ? href : this.base + href,
          releaseDate: date
        });
      }
    });
    
    return episodes;
  }

  extractPostId($) {
    const ids = new Set();

    $('[data-content]').each((i, el) => {
      const content = $(el).attr('data-content');
      if (content) {
        try {
          const decoded = Buffer.from(content, 'base64').toString('utf-8');
          const parsed = JSON.parse(decoded);
          if (parsed.id) ids.add(parsed.id);
        } catch (error) {
          // Ignore
        }
      }
    });

    $('[id^="post-"]').each((i, el) => {
      const id = $(el).attr('id');
      const match = id.match(/post-(\d+)/);
      if (match) ids.add(parseInt(match[1]));
    });

    const html = $.html();
    const scriptMatches = html.match(/post[_\s]*id[_\s]*[:=]\s*["']?(\d+)["']?/gi);
    if (scriptMatches) {
      scriptMatches.forEach(match => {
        const num = match.match(/\d+/);
        if (num) ids.add(parseInt(num[0]));
      });
    }

    return ids.size > 0 ? [...ids][0] : null;
  }

  async getNonce() {
    try {
      const response = await this.requestHandler.postAjax({ 
        action: 'aa1208d27f29ca340c92c66d1926f13f' 
      });
      return response?.data || null;
    } catch (error) {
      return null;
    }
  }

  async getStreamUrl(postId, index, quality, nonce) {
    const payload = {
      action: '2a3505c93b0035d3f455df82bf976b84',
      id: postId,
      i: index,
      q: quality,
      nonce
    };

    try {
      const response = await this.requestHandler.postAjax(payload);
      if (!response || !response.data) return null;
      
      const html = Buffer.from(response.data, 'base64').toString('utf-8');
      const $ = cheerio.load(html);
      return $('iframe').attr('src') || null;
    } catch (error) {
      return null;
    }
  }

  async extractStreams(html) {
    const $ = cheerio.load(html);
    const postId = this.extractPostId($);
    
    if (!postId) return {};
    
    const nonce = await this.getNonce();
    if (!nonce) return {};

    const streams = {};
    
    $('.mirrorstream ul').each((i, ul) => {
      const $ul = $(ul);
      $ul.find('a').each((j, a) => {
        const $a = $(a);
        const dataContent = $a.attr('data-content');
        
        if (dataContent) {
          try {
            const decoded = Buffer.from(dataContent, 'base64').toString('utf-8');
            const parsed = JSON.parse(decoded);
            
            if (parsed.id === postId) {
              const key = `${parsed.q}_${$a.text().trim()}`;
              streams[key] = {
                postId,
                i: parsed.i,
                q: parsed.q,
                nonce
              };
            }
          } catch (error) {
            // Ignore
          }
        }
      });
    });

    const result = {};
    for (const [key, params] of Object.entries(streams)) {
      const url = await this.getStreamUrl(
        params.postId, 
        params.i, 
        params.q, 
        params.nonce
      );
      if (url) result[key] = url;
    }

    return result;
  }

  // PUBLIC METHODS

  async home() {
    const url = this.base + '/';
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const items = [];
    $('.detpost:has(.epz:contains("Episode"))').each((i, el) => {
      const card = this.parseCardDetpost($, el);
      if (card) items.push(card);
    });
    
    return { items };
  }

  async ongoing(page = 1) {
    const url = page === 1 ? 
      this.base + '/ongoing-anime/' : 
      this.base + `/ongoing-anime/page/${page}/`;
    
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const items = [];
    $('.detpost').each((i, el) => {
      const card = this.parseCardDetpost($, el);
      if (card) items.push(card);
    });
    
    const pagination = this.parsePagination($);
    return { items, pagination };
  }

  async complete(page = 1) {
    const url = page === 1 ? 
      this.base + '/complete-anime/' : 
      this.base + `/complete-anime/page/${page}/`;
    
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const items = [];
    $('.detpost').each((i, el) => {
      const card = this.parseCardDetpost($, el);
      if (card) items.push(card);
    });
    
    const pagination = this.parsePagination($);
    return { items, pagination };
  }

  async genreList() {
    const url = this.base + '/genre-list/';
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const genres = this.parseGenreList($);
    return { genres };
  }

  async genre(slug, page = 1) {
    const url = page === 1 ? 
      this.base + `/genres/${slug}/` : 
      this.base + `/genres/${slug}/page/${page}/`;
    
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const items = [];
    $('.col-anime-con').each((i, el) => {
      const card = this.parseCardColAnime($, el);
      if (card) items.push(card);
    });
    
    const pagination = this.parsePagination($);
    return { slug, items, pagination };
  }

  async jadwalRilis() {
    const url = this.base + '/jadwal-rilis/';
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const schedule = this.parseSchedule($);
    return { schedule };
  }

  async search(query) {
    const url = `${this.base}/?s=${encodeURIComponent(query)}&post_type=anime`;
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const items = [];
    $('.chivsrc li').each((i, el) => {
      const $el = $(el);
      const link = $el.find('h2 a').attr('href');
      const title = $el.find('h2 a').text().trim();
      const poster = $el.find('img').attr('src') || null;
      const genres = $el.find('.set:first-child a').map((_, a) => $(a).text()).get() || [];
      const status = $el.find('.set:nth-child(2)').text().replace('Status :', '').trim() || null;
      const ratingEl = $el.find('.set:contains("Rating")');
      const rating = ratingEl.length ? ratingEl.text().replace('Rating :', '').trim() : null;
      
      if (link && title) {
        items.push({
          title,
          url: link.startsWith('http') ? link : this.base + link,
          poster,
          genres,
          status,
          rating
        });
      }
    });
    
    return { query, items };
  }

  async detail(slug) {
    const url = this.base + `/anime/${slug}/`;
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const title = $('.jdlrx h1').text().trim() || $('title').text().trim();
    const poster = $('.fotoanime img').attr('src') || null;
    const sinopsis = $('.sinopc p').text().trim() || null;
    
    const info = {};
    $('.infozin .infozingle p').each((i, el) => {
      const $el = $(el);
      const text = $el.text().trim();
      
      if (text.includes('Genre')) {
        const genreLinks = $el.find('a').map((_, a) => $(a).text()).get();
        info.genre = genreLinks.length ? genreLinks.join(', ') : null;
        return;
      }
      
      const parts = text.split(':');
      if (parts.length >= 2) {
        const key = parts[0].replace(/\s/g, '_').toLowerCase();
        const value = parts.slice(1).join(':').trim();
        if (key) info[key] = value;
      }
    });
    
    const episodes = this.parseEpisodeList($);
    
    const recommendations = [];
    $('.isi-recommend-anime-series .isi-konten').each((i, el) => {
      const $el = $(el);
      const link = $el.find('.judul-anime a').attr('href');
      const titleRec = $el.find('.judul-anime a').text().trim();
      const posterRec = $el.find('.gambar-konten img').attr('src') || null;
      
      if (link && titleRec) {
        recommendations.push({
          title: titleRec,
          url: link.startsWith('http') ? link : this.base + link,
          poster: posterRec
        });
      }
    });
    
    return {
      title,
      poster,
      sinopsis,
      info,
      episodes,
      recommendations
    };
  }

  async episode(slug) {
    const url = this.base + `/episode/${slug}/`;
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const title = $('h1.posttl').text().trim() || $('title').text().trim();
    const streams = await this.extractStreams(html);
    
    const downloads = [];
    $('.download ul').each((i, ul) => {
      const $ul = $(ul);
      const group = $ul.prev('h4').text().trim() || 
                   $ul.prev('strong').text().trim() || 
                   'Download';
      const items = [];
      
      $ul.find('li').each((j, li) => {
        const $li = $(li);
        const resolution = $li.find('strong').text().trim() || null;
        const size = $li.find('i').text().trim() || null;
        const links = [];
        
        $li.find('a').each((k, a) => {
          const $a = $(a);
          links.push({
            host: $a.text().trim(),
            url: $a.attr('href')
          });
        });
        
        if (links.length) {
          items.push({ resolution, size, links });
        }
      });
      
      if (items.length) {
        downloads.push({ group, items });
      }
    });
    
    const nav = {
      prev: $('.prevnext .flir a:first-child').attr('href') || null,
      all: $('.prevnext .flir a:contains("See All")').attr('href') || null,
      next: $('.prevnext .flir a:last-child').attr('href') || null
    };
    
    const otherEpisodes = this.parseEpisodeList($);
    
    const data = { 
      title, 
      streams, 
      downloads, 
      nav 
    };
    
    if (otherEpisodes.length) {
      data.otherEpisodes = otherEpisodes;
    }
    
    return data;
  }

  async batch(slug) {
    const url = this.base + `/lengkap/${slug}/`;
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const title = $('.jdlrx h1').text().trim() || $('title').text().trim();
    
    const downloads = [];
    $('.download ul').each((i, ul) => {
      const $ul = $(ul);
      const group = $ul.prev('h4').text().trim() || 
                   $ul.prev('strong').text().trim() || 
                   'Batch';
      const items = [];
      
      $ul.find('li').each((j, li) => {
        const $li = $(li);
        const resolution = $li.find('strong').text().trim() || null;
        const size = $li.find('i').text().trim() || null;
        const links = [];
        
        $li.find('a').each((k, a) => {
          const $a = $(a);
          links.push({
            host: $a.text().trim(),
            url: $a.attr('href')
          });
        });
        
        if (links.length) {
          items.push({ resolution, size, links });
        }
      });
      
      if (items.length) {
        downloads.push({ group, items });
      }
    });
    
    return { title, downloads };
  }

  async watch(slug) {
    const url = this.base + `/episode/${slug}/`;
    const html = await this.requestHandler.fetchHTML(url);
    const $ = cheerio.load(html);
    
    const title = $('h1.posttl').text().trim() || $('title').text().trim();
    const streams = await this.extractStreams(html);
    
    const nav = {
      prev: $('.prevnext .flir a:first-child').attr('href') || null,
      all: $('.prevnext .flir a:contains("See All")').attr('href') || null,
      next: $('.prevnext .flir a:last-child').attr('href') || null
    };
    
    return { title, streams, nav };
  }

  resetCookie() {
    this.requestHandler.cookieJar.clear();
  }
}

module.exports = OtakudesuScraper;