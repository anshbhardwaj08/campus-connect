/**
 * Normalizes page/limit query params into a Mongoose skip/limit pair.
 */
const paginate = (query = {}, defaultPage = 1, defaultLimit = 20) => {
  const page = Math.max(parseInt(query.page, 10) || defaultPage, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || defaultLimit, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const buildPagination = (page, limit, total) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

module.exports = { paginate, buildPagination };
