const { RoleMenuPermission, Menu, Role, sequelize } = require('../models');
const ApiError = require('../utils/ApiError');

const getPermissionsByRole = async (roleId) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new ApiError(404, 'Role not found');

  return RoleMenuPermission.findAll({
    where: { roleId },
    include: [{ model: Menu, as: 'menu' }],
  });
};

const assignPermissions = async (roleId, permissions, actorId) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw new ApiError(404, 'Role not found');

  return sequelize.transaction(async (t) => {
    const results = [];
    for (const item of permissions) {
      const [record] = await RoleMenuPermission.findOrCreate({
        where: { roleId, menuId: item.menuId },
        defaults: { roleId, menuId: item.menuId, createdBy: actorId, updatedBy: actorId },
        transaction: t,
      });
      await record.update(
        {
          canCreate: !!item.canCreate,
          canRead: !!item.canRead,
          canUpdate: !!item.canUpdate,
          canDelete: !!item.canDelete,
          updatedBy: actorId,
        },
        { transaction: t }
      );
      results.push(record);
    }
    return results;
  });
};

module.exports = { getPermissionsByRole, assignPermissions };
