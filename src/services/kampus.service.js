const { Kampus } = require('../models');

const getKampus = async () => Kampus.findOne({ order: [['id', 'ASC']] });

const updateKampus = async (payload, actorId) => {
  const kampus = await Kampus.findOne({ order: [['id', 'ASC']] });

  if (!kampus) {
    return Kampus.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  }

  await kampus.update({ ...payload, updatedBy: actorId });
  return kampus;
};

module.exports = { getKampus, updateKampus };
