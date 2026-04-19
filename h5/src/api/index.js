/**
 * API 统一导出
 * 
 * 使用方式：
 * import { auth, post, order, user, payment } from '@/api'
 * 
 * 或单独引入：
 * import { loginPhone, getPosts } from '@/api'
 */

// 认证相关
export * from './auth';
export { default as auth } from './auth';

// 帖子相关
export * from './post';
export { default as post } from './post';

// 订单相关
export * from './order';
export { default as order } from './order';

// 用户相关
export * from './user';
export { default as user } from './user';

// 积分/支付相关
export * from './payment';
export { default as payment } from './payment';

// 积分商城相关
export * from './shop';
export { default as shop } from './shop';
