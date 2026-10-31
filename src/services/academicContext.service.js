const { Op } = require('sequelize');
const { Jurusan, TahunAjaran } = require('../models');
const ApiError = require('../utils/ApiError');
const { formatTahunAjaran } = require('../utils/tahunAjaran');

/**
 * Konteks akademik sesi staff: tahun akademik acuan (dipilih di setiap login, bisa diganti untuk
 * melihat data tahun lalu) dan — khusus modul Prodi — prodi yang sedang dibuka.
 *
 * Prodi diwakili kode prodi karena tabel jurusan punya beberapa baris per prodi (per golongan
 * kelas). Akun ber-role PRODI terkunci ke prodinya (users.kode_prodi); role pimpinan/admin di
 * PRODI_ALL_ROLES boleh memilih prodi mana pun atau "Semua Prodi".
 */
const PRODI_ALL_ROLES = ['SUPERADMIN', 'ADMIN', 'DIREKTUR', 'WADIR', 'PT'];

const isProdiScoped = (user) => user.role?.code === 'PRODI';

const listTahunAkademik = async () => {
  const rows = await TahunAjaran.findAll({
    attributes: ['id', 'nama', 'jenisSemester', 'isActive'],
    order: [
      ['tahunMulai', 'DESC'],
      ['jenisSemester', 'DESC'],
    ],
  });
  return rows.map((t) => ({
    id: t.id,
    nama: t.nama,
    jenisSemester: t.jenisSemester,
    isActive: t.isActive,
    label: formatTahunAjaran(t),
  }));
};

/** Prodi unik per kode prodi, beserta semua id jurusan yang termasuk prodi tsb. */
const listProdi = async () => {
  const rows = await Jurusan.findAll({
    attributes: ['id', 'namaJurusan', 'kodeProdi'],
    where: { kodeProdi: { [Op.ne]: null } },
    order: [['id', 'ASC']],
  });
  const byKode = new Map();
  rows.forEach((j) => {
    const entry = byKode.get(j.kodeProdi) ?? { kodeProdi: j.kodeProdi, nama: j.namaJurusan, jurusanIds: [] };
    entry.jurusanIds.push(j.id);
    byKode.set(j.kodeProdi, entry);
  });
  return [...byKode.values()].sort((a, b) => a.nama.localeCompare(b.nama));
};

const findProdi = async (kodeProdi) => (await listProdi()).find((p) => p.kodeProdi === kodeProdi) ?? null;

/**
 * Validasi pilihan di form login. `module` = modul yang dipilih di halaman login; pilihan prodi
 * hanya berlaku untuk modul 'prodi'. `kodeProdi` kosong = "Semua Prodi".
 */
const resolveLoginContext = async (user, { tahunAjaranId, module, kodeProdi }) => {
  let tahunAkademik = null;
  if (tahunAjaranId) {
    tahunAkademik = (await listTahunAkademik()).find((t) => t.id === Number(tahunAjaranId)) ?? null;
    if (!tahunAkademik) throw new ApiError(400, 'Tahun akademik tidak ditemukan');
  }

  let prodi = null;
  if (module === 'prodi') {
    if (isProdiScoped(user)) {
      if (!user.kodeProdi) throw new ApiError(403, 'Akun ini belum ditetapkan ke prodi mana pun. Hubungi admin.');
      if (!kodeProdi) throw new ApiError(400, 'Pilih prodi');
      if (kodeProdi !== user.kodeProdi) {
        const own = await findProdi(user.kodeProdi);
        throw new ApiError(403, `Akun ini hanya bisa membuka prodi ${own?.nama ?? user.kodeProdi}`);
      }
    } else if (!PRODI_ALL_ROLES.includes(user.role?.code)) {
      throw new ApiError(403, 'Akun ini tidak memiliki akses ke modul Prodi');
    }
    if (kodeProdi) {
      prodi = await findProdi(kodeProdi);
      if (!prodi) throw new ApiError(400, 'Prodi tidak ditemukan');
    }
  }

  return { tahunAkademik, prodi };
};

/** Id jurusan yang boleh/sedang dilihat pada request modul Prodi; null = tanpa batasan prodi. */
const resolveProdiJurusanIds = async (user, headerKodeProdi) => {
  if (isProdiScoped(user)) {
    const own = user.kodeProdi ? await findProdi(user.kodeProdi) : null;
    return own?.jurusanIds ?? [0];
  }
  if (headerKodeProdi) {
    const chosen = await findProdi(headerKodeProdi);
    return chosen?.jurusanIds ?? null;
  }
  return null;
};

module.exports = {
  PRODI_ALL_ROLES,
  isProdiScoped,
  listTahunAkademik,
  listProdi,
  resolveLoginContext,
  resolveProdiJurusanIds,
};
