(function() {

  // ****************************** base部分源码解读 ****************************** //
  // ****************************** base部分源码解读 ****************************** //
  // ****************************** base部分源码解读 ****************************** //

  // 基本设置、配置
  // 将this赋值给局部变量 root
  // root 的值，客户端为 'window' ，服务端 (node) 为 'exports'
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
  // '_' 将传入的参数 (实际要操作的数据) 赋值给 this._wrapped 属性
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

    // 如果被赋值对象不是 '_' 函数的实例，则调用 new 运算符返回实例化的对象
    if (!(this instanceof _)) {
      return new _(obj);
    }

    // 如果被赋值对象是 '_' 函数的实例，并且 obj 不是 '_' 的实例，则不覆盖原有的被赋值对象，而是将 obj 赋值给该对象的 _wrapped 属性，即 this._wrapped 属性
    this._wrapped = obj;
  };

  // 将上面定义的 '_' 局部变量赋值给全局对象中  '_' 属性，即客户端中的 window._ = _ ，服务端 (node) 中的 exports._ = _
  // 同时在服务端向后兼容老的 require() API
  // 这样暴露给全局后便可以在全局环境中使用 '_' 变量 (方法)
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = '_';
    }
    exports._ = _;
  } else {
    // 此处的 root 在前面已声明过，为客户端或服务端的全局环境中的 this 值，也即是将 '_' 暴露给全局
    root._ = _;
  }

  // 当前 underscore版本号
  _.VERSION = '1.8.3';

  // underscore 内部方法
  // 根据 this 指向 (context 参数) 以及 argCount 参数
  // 二次操作返回一些回调、迭代方法
  let optimizeCb = function(func, context, argCount) {
    // 如果没有指定 this 指向， 则返回原函数
    if (context === void 0) return func;

    switch (argCount == null ? 3 : argCount) {
      case 1:
        return function(value) {
          return func.call(context, value);
        };
      case 2:
        return function(value, other) {
          return func.call(context, value, other);
        };

        // 如果有指定 this， 但没有传入argCount参数
        // 则执行以下 case
        // _.each、 _.map
      case 3:
        return function(value, index, collection) {
          return func.call(context, value, index, collection);
        };

        // ._reduce、 _.reduceRight
      case 4:
        return function(accumlator, value, index, collection) {
          return func.call(context, accumlator, value, index, collection);
        };
    }

    // 其实不用上面的 switch-case 语句，直接执行下面的 return 函数就行了，不这样做的原因是 call 比 apply 快很多
    // .apply在运行前要对作为参数的数组进行一系列检验和深拷贝， .call 则没有这些步骤
    return function() {
      return func.apply(context, arguments);
    };
  };

  // 根据 value 的类型生成不同回调函数的内部函数
  let cb = function(value, context, argCount) {
    if (value == null) return _.identity;
    if (_.isFunction(value)) return optimizeCb(value, context, argCOunt);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };

  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // 有三个方法用到了这个内部函数
  // _.extend & _.extendOwn & _.defaults
  // _.extend = createAssigner(_.allKeys);
  // _.extendOwn = _.assign = createAssigner(_.keys);
  // _.defaults = createAssigner(_.allKeys, true);
  // 创建一个内部函数分配器功能
  let createAssigner = function(keysFunc, undefinedOnly) {
    // 返回函数
    // 经典闭包 (undefinedOnly 参数在返回的函数中被引用)
    // 返回的函数参数个数 >= 1
    // 将第二个开始的对象参数的键值对 "继承" 给第一个参数
    return function(obj) {
      let length = arguments.length;
      // 如果只传入了一个或没有传入参数或传入的第一个参数是 null
      // 则直接返回传入的参数
      if (length < 2 || obj == null) return obj;

      // 枚举第一个参数以外的对象参数
      // 即 arguments[1], arguments[2] ...
      for (let index = 1; index < length; index++) {
        let
          // source 即为对象参数
          source = arguments[index],
          // 提取对象参数的 keys 值，keys 值是数组，为 source 的键名集合
          // keysFunc 参数表示 _.keys 或者 _.allKeys
          keys = keysFunc(source),
          // l 值为 keys 数组中元素的数量
          l = keys.length;

        // 遍历对象的键值对
        for (let i = 0; i < l; i++) {
          // keys[i] 为 source 对象的索引为 i 的键值对的键名
          let key = keys[i];
          // _.extend 和 _.extendOwn 方法
          // 没有传入 undefinedOnly 参数，即 !undefinedOnly 为 true
          // 即肯定会执行 obj[key] = source[key]
          // 后面对象的键值对直接覆盖 obj
          // ==========================================
          // _.defaults 方法，undefinedOnly 参数为 true
          // 即 !undefinedOnly 为 false
          // 那么当且仅当 obj[key] 为 undefined 时才覆盖
          // 即如果有相同的 key 值，取最早出现的 value 值
          // *defaults 中有相同 key 的也是一样取首次出现的
          if (!undefinedOnly || obj[key] === void 0) {
            obj[key] = source[key];
          }
        }
      }

      // 返回已经继承后面对象参数属性的第一个参数对象
      return obj;
    };
  };

  // 用于创建从另一个对象继承的新对象的内部函数
  // 在 _.create 中用到
  let baseCreate = function(prototype) {
    // 如果 prototype 参数不是对象
    if (!_.isObject(prototype)) return {};

    // 如果浏览器支持 ES5 的 Object.create() 方法
    if (nativeCreate) return nativeCreate(prototype);

    // Ctor 函数的作用是替代原型交换
    // 返回一个继承了 prototype 参数的新对象
    Ctor.prototype = prototype;
    let result = new Ctor;
    Ctor.prototype = null;
    return result;
  };

  // 闭包
  let property = function(key) {
    return function(obj) {
      return obj == null ? void 0 : obj[key];
    };
  };

  // Math.pow(2, 53) - 1 是 Javascript 中能精确标识的最大数字
  let MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;

  // 获取元素内 length 属性的方法
  let getLength = property('length');

  // 判断是否是类数组，即拥有 length 属性并且 length 属性值为 Number 类型的元素
  // 包括数组、arguments、HTML Collection 以及 NodeList 等等
  // 包括类似 {length: 10} 这样的对象
  // 包括字符串、函数等
  let isArrayLike = function(collection) {
    // 返回参数 collection 的 length 属性值
    let length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };



  // ****************************** object部分源码解读 ****************************** //
  // ****************************** object部分源码解读 ****************************** //
  // ****************************** object部分源码解读 ****************************** //

  // OBJECT FUNCTIONS
  // 对象的扩展方法，一共有 38 个

  // IE < 9 下不能用 'for in' 的方法来枚举对象的某些 key
  // 比如重写了对象的 'toString' 方法，这个 key 值就不能在 IE < 9 下用 'for in' 枚举到
  // IE < 9，{toString: null}.propertyIsEnumerable('toString') 返回 false
  // IE < 9，重写的 'toString' 属性被认为是不可枚举的
  // 据此可以判断是否在 IE < 9 的浏览器环境中
  let hasEnumBug = !{
    toString: null
  }.propertyIsEnumerable('toString');

  // IE < 9 下不能用 'for in' 来枚举的 key 值集合
  // 其实还有个 'constructor' 属性
  let nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString', 'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

  // 将 IE < 9 下的不能用 'for in' 枚举的对象属性补充到 keys 中
  // obj 为需要遍历键值对的对象
  // keys 为键数组
  // 利用 JavaScript 按值传递的特点
  // 传入数组作为参数，能直接改变数组的值
  function collectNonEnumProps(obj, keys) {
    let
      nonEnumIdx = nonEnumerableProps.length,
      constructor = obj.constructor;

    // 获取对象的原型
    // 如果 obj 的 constructor 没有被重写，则 proto 变量为 obj.constructor.prototype
    // 如果被重写，则为 Object.prototype
    let proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

    // constructor 属性需要特殊处理
    // 如果 obj 中有 constructor 这个 key，并且这个 key 没有在 keys 数组中，则将其存入 keys 数组内
    let prop = 'constructor';
    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

    // 遍历 nonEnumerableProps 数组中的 keys
    while (nonEnumIdx--) {
      prop = nonEnumerableProps[nonEnumIdx];
      // prop in obj 应该肯定返回 true 吧？是否有判断必要？
      // obj[prop] !== proto[prop] 判断该 key 是否来自于原型链
      // 即是否重写了原型链上的属性
      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
        keys.push(prop);
      }
    }
  }

  // 返回对象的 keys 组成的数组
  // 仅返回 own enumerable properties 组成的数组
  _.keys = function(obj) {
    // 如果传入的参数不是对象，则返回空数组
    if (!_.isObject(obj)) return [];

    // 如果浏览器支持 ES5 的 Object.keys() 方法
    if (nativeKeys) return nativeKeys(obj);

    let keys = [];

    // 遍历 obj 对象的属性
    for (let key in obj) {
      // 如果 key 是 obj 对象自身的属性，则将 key 添加到 keys 数组中
      if (_.has(obj, key)) keys.push(key);
    }

    // 如果浏览器版本为 IE < 9 下，则 hasEnumBug 的值为 true，即某些 key 值不能用 'for in' 来枚举
    // 调用 collectNonEnumProps() 方法将上述不可枚举的 key 值添加到 keys 数组中
    if (hasEnumBug) collectNonEnumProps(obj, keys);

    return keys;
  };

  // 返回对象的所有 keys 组成的数组
  // 不仅仅是 own enumerable properties 组成的数组
  // 还包括原型链上继承的属性
  _.allKeys = function(obj) {
    // 如果传入的参数不是对象，则返回空数组
    if (!_.isObject(obj)) return [];

    let keys = [];
    for (let key in obj) {
      // 将所有 key 都添加到 keys 数组中
      keys.push(key);
    }

    // IE < 9 下的 bug，同 _.keys 处理方法
    if (hasEnumBug) collectNonEnumProps(obj, keys);

    return keys;
  };

  // 返回对象所有属性的值
  _.values = function(obj) {
    // 仅包括 own properties
    let
      keys = _.keys(obj),
      length = keys.length,
      values = [];
    for (let i = 0; i < length; i++) {
      values[i] = obj[keys[i]];
    }
    return values;
  };

  // 迭代函数改变对象的 values 值并返回对象副本
  _.mapObject = function(obj, iteratee, context) {
    // 通过 cb() 方法生成迭代函数
    iteratee = cb(iteratee, context);

    let
      keys = _.keys(obj),
      length = keys.length,
      // 对象副本，该方法返回的对象
      results = {},
      currentKey;

    for (let index = 0; i < length; index++) {
      // 将 keys 数组中索引为 index 的项的键名赋给 currentKey 变量
      currentKey = keys[index];

      // 对 obj 的每一项用迭代函数进行迭代
      // 将返回的值作为键值、将 currentKey 的值作为键名
      // 将由上组成的键值对添加到 results 对象中
      results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
    }
    return results;
  };

  // 将对象转换为 [key，value] 形式的数组
  _.pairs = function(obj) {
    let
      keys = _.keys(obj),
      length = keys.length,
      pairs = [];
    for (let i = 0; i < length; i++) {
      pairs[i] = [keys[i], obj[keys[i]]];
    }
    return pairs;
  };

  // 将对象的 key 和 value 值颠倒，即 {key: value} 变为 {value: key}
  // value 的值必须为可序列化的
  _.invert = function(obj) {
    let
      result = {},
      keys = _.keys(obj),
      length = keys.length;
    for (let i = 0; i < length; i++) {
      result[obj[keys[i]]] = keys[i];
    }
    return result;
  }
}.call(this));
