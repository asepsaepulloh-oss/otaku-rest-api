const OtakudesuScraper = require('../services/scraper');
const ApiResponse = require('../utils/response');

const scraper = new OtakudesuScraper();

class AnimeController {
  static async home(req, res, next) {
    try {
      const data = await scraper.home();
      ApiResponse.success(res, data, 'Latest episodes fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async ongoing(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const data = await scraper.ongoing(page);
      
      const items = data.items.slice(0, limit);
      ApiResponse.paginated(res, items, data.pagination, `Ongoing anime page ${page} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async complete(req, res, next) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const data = await scraper.complete(page);
      
      const items = data.items.slice(0, limit);
      ApiResponse.paginated(res, items, data.pagination, `Complete anime page ${page} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async genres(req, res, next) {
    try {
      const data = await scraper.genreList();
      ApiResponse.success(res, data, 'Genres fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async genreBySlug(req, res, next) {
    try {
      const { slug } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const data = await scraper.genre(slug, page);
      
      const items = data.items.slice(0, limit);
      ApiResponse.paginated(res, items, data.pagination, `Anime in genre ${slug} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async schedule(req, res, next) {
    try {
      const data = await scraper.jadwalRilis();
      ApiResponse.success(res, data, 'Schedule fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  static async search(req, res, next) {
    try {
      const query = req.query.q;
      if (!query) {
        return ApiResponse.error(res, 'Query parameter "q" is required', 400);
      }
      
      const data = await scraper.search(query);
      ApiResponse.success(res, data, `Search results for "${query}" fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async detail(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await scraper.detail(slug);
      ApiResponse.success(res, data, `Anime ${slug} detail fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async episode(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await scraper.episode(slug);
      ApiResponse.success(res, data, `Episode ${slug} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async batch(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await scraper.batch(slug);
      ApiResponse.success(res, data, `Batch ${slug} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }

  static async watch(req, res, next) {
    try {
      const { slug } = req.params;
      const data = await scraper.watch(slug);
      ApiResponse.success(res, data, `Watch ${slug} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnimeController;