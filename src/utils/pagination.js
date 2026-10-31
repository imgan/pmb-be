const getPagination = (query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  // Maks. 1000: dropdown pilihan (mis. semua mahasiswa) memuat seluruh data sekaligus untuk dicari di sisi klien.
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 1000);
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getPagingMeta = (count, page, limit) => ({
  total: count,
  page,
  limit,
  totalPages: Math.ceil(count / limit) || 1,
});

module.exports = { getPagination, getPagingMeta };
