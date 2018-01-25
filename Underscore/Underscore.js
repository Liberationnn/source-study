(function() {
  // 基本设置、配置
  // 将this赋值给局部变量 root
  // root 的值，客户端为'window'，服务端(node)为'exports'
  let root = this;

  // 将原来全局环境中的变量'_'赋值给变量 previousUnderscore 进行缓存，在后面的 noConflict 方法中有用到
  let previousUnderscore = root._;

  // 缓存变量，便于将代码压缩到 min.js 版本
  let
    ArrayProto = Array.prototype,
    ObjProto = Object.prototype,
    FuncProto = Function.prototype;

  // 缓存核心方法，便于提高效率
  let
    push = ArrayProto.push,
    slice = ArrayProto.slice,
    toString = ObjProto.toString,
    hasOwnProperty = ObjProto.hasOwnProperty;

  // 声明希望使用的 ES5 原生方法
  let
    nativeIsArray = Array.isArray,
    nativeKeys = Object.keys,
    nativeBind = FuncProto.bind,
    nativeCreate = Object.create;

  // 裸露一个函数引用便于替代原型交换
  let Ctor = function() {};

  // 为 '_' 构造函数创建一个安全引用
  // '_' 是核心函数同时也是一个支持无 new 调用的构造函数
  // '_' 将传入的参数 (实际要操作的数据) 赋值给 this._wrapper 属性
  // 面向对象调用时， '_' 相当于一个构造函数
  // each 等方法都在该构造函数的原型链上
  // _([1, 2, 3]).each(alert)
  // _([1, 2, 3]) 相当于无 new 构造了一个新的对象
  // 调用了该对象的 each 方法，该方法在该构造函数的原型链上
  let _ = function(obj) {
    // 如果 obj 已经是 '_' 函数的实例，则直接返回 obj
    // instanceof 运算符用来测试一个对象在其原型链中是否存在一个构造函数的 prototype 属性
    if (obj instanceof _) {
      return obj;
    }

    // 如果 obj 不是 '_' 函数的实例，则调用 new 运算符返回实例化的对象
    if (!(this instanceof _)) {
      return new _(obj);
    }

    // 将 obj 赋值给 this._wrapped 属性
    this._wrapped = obj;
  };
})
