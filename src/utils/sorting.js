/**
 * Resolves a Sequelize `order` array from `?sortBy=&sortDir=` query params.
 * `sortableColumns` maps a public sort key to either a plain column path (`['namaKelas']`)
 * or a nested-association path (`[{ model, as }, 'namaKelas']`). Falls back to `defaultOrder`
 * when `sortBy` is missing or not in the map (prevents sorting by arbitrary/unindexed columns).
 */
const resolveOrder = (query, sortableColumns, defaultOrder = [['id', 'DESC']]) => {
  const columnPath = sortableColumns[query.sortBy];
  if (!columnPath) return defaultOrder;
  const sortDir = query.sortDir === 'asc' ? 'ASC' : 'DESC';
  return [[...columnPath, sortDir]];
};

module.exports = { resolveOrder };
