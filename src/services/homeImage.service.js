const { HomeImage } = require('../models');

const getHomeImages = async () => HomeImage.findOne({ order: [['id', 'ASC']] });

const updateHomeImages = async (payload, actorId) => {
  const homeImage = await HomeImage.findOne({ order: [['id', 'ASC']] });

  if (!homeImage) {
    return HomeImage.create({ ...payload, createdBy: actorId, updatedBy: actorId });
  }

  await homeImage.update({ ...payload, updatedBy: actorId });
  return homeImage;
};

module.exports = { getHomeImages, updateHomeImages };
