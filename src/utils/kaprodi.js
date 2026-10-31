const { Op } = require('sequelize');
const { Dosen, Jurusan, User, Role } = require('../models');

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

/** "D3 Farmasi" -> "DIII Farmasi" (baris tanda tangan dokumen). */
const namaProdiTtd = (namaJurusan) =>
  String(namaJurusan ?? '').replace(/^D(\d)\s+/i, (m, n) => `D${ROMAN[Number(n)] ?? n} `);

/**
 * Kaprodi suatu prodi = akun role PRODI yang aktif untuk kode prodi tsb (akun pertama). Belum ada
 * tabel pejabat tersendiri; NUPTK diambil dari data dosen yang cocok (NIDN = username, atau nama).
 */
const loadKaprodi = async (kodeProdi) => {
  if (!kodeProdi) return null;
  const user = await User.findOne({
    where: { kodeProdi, isActive: true },
    include: [{ model: Role, as: 'role', where: { code: 'PRODI' }, required: true }],
    order: [['id', 'ASC']],
  });
  if (!user) return null;
  const dosen =
    (await Dosen.findOne({ where: { nidn: user.username } })) ??
    (await Dosen.findAll({ where: { nuptk: { [Op.ne]: null } } })).find((d) =>
      user.name.toLowerCase().includes(d.namaLengkap.toLowerCase())
    );
  return { nama: user.name, nuptk: dosen?.nuptk ?? null };
};

/** Penanda tangan dokumen prodi: { namaProdi: 'DIII Farmasi', kaprodi: { nama, nuptk } | null }. */
const loadPenandatanganProdi = async (kodeProdi) => {
  if (!kodeProdi) return { namaProdi: null, kaprodi: null };
  const [jurusan, kaprodi] = await Promise.all([
    Jurusan.findOne({ where: { kodeProdi }, attributes: ['namaJurusan'], order: [['id', 'ASC']] }),
    loadKaprodi(kodeProdi),
  ]);
  return { namaProdi: jurusan ? namaProdiTtd(jurusan.namaJurusan) : null, kaprodi };
};

module.exports = { namaProdiTtd, loadKaprodi, loadPenandatanganProdi };
