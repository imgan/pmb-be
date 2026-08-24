const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { Menu, RoleMenuPermission } = require('../models');

const ACTION_FIELD = { create: 'canCreate', read: 'canRead', update: 'canUpdate', delete: 'canDelete' };

/**
 * `menuCodes` may be a single code or an array of codes (e.g. the same underlying
 * endpoint is exposed under both the Admin and BAAK consoles via two different menu
 * entries). Access is granted if the user has the action permission on any one of them.
 */
const authorize = (menuCodes, action) =>
  catchAsync(async (req, res, next) => {
    if (!req.user) throw new ApiError(401, 'Authentication required');

    const codes = Array.isArray(menuCodes) ? menuCodes : [menuCodes];
    const menus = await Menu.findAll({ where: { code: codes } });
    if (menus.length === 0) throw new ApiError(500, `Menu with code ${codes.join(', ')} is not registered`);

    const field = ACTION_FIELD[action];
    const permissions = await RoleMenuPermission.findAll({
      where: { roleId: req.user.roleId, menuId: menus.map((menu) => menu.id) },
    });

    const hasAccess = permissions.some((permission) => permission[field]);
    if (!hasAccess) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }

    next();
  });

module.exports = authorize;
