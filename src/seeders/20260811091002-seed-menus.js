'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.bulkInsert('menus', [
      {
        name: 'Dashboard',
        code: 'DASHBOARD',
        path: '/dashboard',
        icon: 'home',
        order_number: 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'User Management',
        code: 'USER_MANAGEMENT',
        path: '/users',
        icon: 'users',
        order_number: 2,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Role Management',
        code: 'ROLE_MANAGEMENT',
        path: '/roles',
        icon: 'shield',
        order_number: 3,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        name: 'Menu Management',
        code: 'MENU_MANAGEMENT',
        path: '/menus',
        icon: 'list',
        order_number: 4,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },
  down: async (queryInterface) => {
    await queryInterface.bulkDelete('menus', {
      code: ['DASHBOARD', 'USER_MANAGEMENT', 'ROLE_MANAGEMENT', 'MENU_MANAGEMENT'],
    });
  },
};
