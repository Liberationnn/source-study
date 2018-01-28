//     纯手打内容无复制粘贴 (除下方参考内容出处外)
//     大部分为自己的理解，由于英语基础不太好所以借鉴了部分注释

//     Underscore.js 1.8.3
//     http://underscorejs.org
//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
//     Underscore may be freely distributed under the MIT license.
//     中文注释 by hanzichi @https://github.com/hanzichi
//     我的源码解读顺序（跟系列解读文章相对应）
//     Object -> Array -> Collection -> Function -> Utility


// ——————————————————————————— 假装自己是个华丽的分界线 ———————————————————————————— //
// ——————————————————————————— 假装自己是个华丽的分界线 ———————————————————————————— //
// ——————————————————————————— 假装自己是个华丽的分界线 ———————————————————————————— //

(function() {

  // ****************************** base部分源码解读 ****************************** //
  // ****************************** base部分源码解读 ****************************** //
  // ****************************** base部分源码解读 ****************************** //

  // Baseline setup

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
  let _ = function(obj) {
    // 如果 obj 已经是 '_' 函数的实例，则直接返回 obj
    // instanceof 运算符用来测试一个对象在其原型链中是否存在一个构造函数的 prototype 属性
    if (obj instanceof _) {
      return obj;
    }

    // 如果不通过 new 调用 '_'，则 this 指向的是全局环境 (客户端为 'window' ，服务端为 'exports')，即 this 不是 '_' 的实例，返回 new _(obj)
    if (!(this instanceof _)) {
      // 实际上依旧会执行下面的 this._wrapped = obj 语句
      return new _(obj);
    }

    // 通过 new 调用 '_' 时， this 指向的是 '_' 本身，即执行  _._wrapped = obj
    // 将传入的 obj 参数赋给 '_' 对象的 _wrapped 属性
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

  // 根据 this 指向 (context 参数) 以及 argCount 参数，对 func 参数二次操作返回一些回调、迭代方法
  // 返回的回调、迭代方法的 this 将被绑定到传入的 context 参数上 (如果传入了 context 参数)
  let optimizeCb = function(func, context, argCount) {
    // 如果没有指定 this 指向， 则返回原函数
    if (context === void 0) return func;

    // 根据 argCount 参数的值返回相对应的回调、迭代方法
    switch (argCount == null ? 3 : argCount) {
      case 1:
        return function(value) {
          return func.call(context, value);
        };
      case 2:
        return function(value, other) {
          return func.call(context, value, other);
        };

        // 如果有指定 this， 但没有传入argCount参数，则执行以下 case
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
    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
    if (_.isObject(value)) return _.matcher(value);
    return _.property(value);
  };

  // 用于生成迭代函数
  _.iteratee = function(value, context) {
    return cb(value, context, Infinity);
  };

  // 创建一个内部函数分配器功能
  // 有三个方法用到了这个内部函数
  // _.extend = createAssigner(_.allKeys);
  // _.extendOwn = _.assign = createAssigner(_.keys);
  // _.defaults = createAssigner(_.allKeys, true);
  let createAssigner = function(keysFunc, undefinedOnly) {
    // 返回的函数参数个数 >= 1
    // 从第二个参数对象开始，将自身的键值对赋值给第一个参数对象
    return function(obj) {
      let length = arguments.length;
      // 如果只传入了一个或没有传入参数或传入的第一个参数是 null，则直接返回传入的参数
      if (length < 2 || obj == null) return obj;

      // 枚举第一个参数以外的参数对象，即 arguments[1], arguments[2] ...
      for (let index = 1; index < length; index++) {
        let
          // source 即为参数对象
          source = arguments[index],
          // keysFunc 参数为一个方法，表示 _.keys 或者 _.allKeys
          // 使用 keysFunc() 方法提取参数对象的 keys 值，keys 值是数组，为 source 的键名集合
          keys = keysFunc(source),
          // l 值为 keys 数组中元素的数量
          l = keys.length;

        // 遍历对象的键值对
        for (let i = 0; i < l; i++) {
          // keys[i] 为 source 对象的索引为 i 的键值对的键名
          let key = keys[i];
          // _.extend 和 _.extendOwn 方法
          // 没有传入 undefinedOnly 参数，即 !undefinedOnly 为 true，即肯定会执行 obj[key] = source[key]
          // 后面对象的键值对直接覆盖 obj
          // ==========================================
          // _.defaults 方法，undefinedOnly 参数为 true
          // 即 !undefinedOnly 为 false，那么当且仅当 obj[key] 为 undefined 时才覆盖
          // 即如果有相同的 key 值，取最早出现的 value 值
          // *defaults 中有相同 key 的也是一样取首次出现的
          if (!undefinedOnly || obj[key] === void 0) {
            obj[key] = source[key];
          }
        }
      }

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
  // 包括类似 {length: 10} 这样的对象，字符串，函数等
  let isArrayLike = function(collection) {
    // 返回参数 collection 的 length 属性值
    let length = getLength(collection);
    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
  };



  // ***************************** object部分源码解读 ***************************** //
  // ***************************** object部分源码解读 ***************************** //
  // ***************************** object部分源码解读 ***************************** //

  // OBJECT FUNCTIONS

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
  // 不仅仅是 own enumerable properties 组成的数组，还包括原型链上继承的属性
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

  // 返回对象所有 own properties 的值
  _.values = function(obj) {
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

  // 将对象的所有 value 值类型为 function 的 key 值存入一个数组，并将该数组排序后返回
  _.functions = _.methods = function(obj) {
    // 返回的数组
    let names = [];

    for (let key in obj) {
      // 如果 key 对应的 value 值类型为 function，则将该 key 值存入数组
      if (_.isFunction(obj[key])) {
        names.push(key);
      }
    }

    // 返回排序后的数组
    return names.sort();
  };

  // 将传入的几个对象 (从第二个参数对象开始) 中的所有键值对扩展到目标对象 (即第一个参数对象) 上
  // 由于 key 值可能会相同，所以后面的对象的键值对可能会覆盖前面的同名键值对
  _.extend = createAssigner(_.allKeys);

  // 将传入的几个对象 (从第二个参数对象开始) 中所有的 own properties 的键值对扩展到目标对象 (即第一个参数对象) 上
  // 由于 key 值可能会相同，所以后面的对象的键值对可能会覆盖前面的同名键值对
  _.extendOwn = _.assign = createAssigner(_.keys);

  // 返回对象中第一个满足条件的键值对的 key 值
  _.findKey = function(obj, predicate, context) {
    predicate = cb(predicate, context);
    let
      keys = _.keys(obj),
      length = keys.length;
    for (let i = 0; i < length; i++) {
      key = keys[i];
      // 满足条件，则返回 key 值，结束循环
      if (predicate(obj[key], key, obj)) {
        return key;
      }
    }
  };

  // 根据一定需求 (key 值，或者通过 predicate 函数返回真假) 返回一个由满足需求的键值对组成的对象副本
  // 第二个参数可以是一个 predicate 函数，也可以是 >= 0 个 key
  _.pick = function(object, oiteratee, context) {
    let
      // result 为返回的对象副本
      result = {},
      obj = object,
      iteratee,
      keys;
    if (obj == null) return result;

    // 如果第二个参数是函数
    if (_.isFunction(oiteratee)) {
      keys = _.allKeys(obj);
      iteratee = optimizeCb(oiteratee, context);
    } else {
      // 如果第二个参数不是函数，则后面的 keys 可能是数组，也可能是连续的几个并列的参数
      // 用 flatten 将它们展开
      keys = flatten(arguments, false, false, 1);

      // 也转为 predicate 函数判断形式
      // 将指定 key 转化为 predicate 函数
      iteratee = function(value, key, obj) {
        return key in obj;
      };
      obj = Object(obj);
    }
    for (let i = 0, length = keys.length; i < length; i++) {
      let
        key = keys[i],
        value = obj[key];

      // 如果满足需求，则将该键值对添加到 result 对象中
      if (iteratee(value, key, obj)) {
        result[key] = value;
      }
    }
    return result;
  };

  // 跟 _.pick() 方法相对，返回 _.pick() 方法的补集
  // 根据一定需求 (key 值，或者通过 predicate 函数返回真假) 返回一个由不满足需求的键值对组成的对象副本
  // 第二个参数可以是一个 predicate 函数，也可以是 >= 0 个 key
  _.omit = function(object, iteratee, context) {
    if (_.isFunction(iteratee)) {
      iteratee = _.negate(iteratee);
    } else {
      let keys = _.map(flatten(arguments, false, false, 1), String);
      iteratee = function(value, key) {
        return !_.contains(keys, key);
      };
    }
    return _.pick(obj, iteratee, context);
  };

  // 用默认属性填充给定对象，如默认属性中出现了和给定对象中一样的 key 值，则不覆盖
  // 参数个数 >= 1
  _.defaults = createAssigner(_.allKeys, true);

  // 创建一个从给定原型对象继承的对象
  // 如果提供了附加属性，则将它们的 own properties 键值对添加到创建的对象中
  _.create = function(prototype, props) {
    let result = baseCreate(prototype);
    if (props) {
      _.extendOwn(result, props);
    }
    return result;
  };

  // 创建一个对象的浅复制副本，即所有嵌套的对象或者数组都会跟原对象用同一个引用
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // 主要是用在链式调用中，对中间值立即进行处理
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // 判断 object 对象中是否有 attrs 对象中的所有键值对
  // 返回布尔值
  _.isMatch = function(object, attrs) {
    // 提取 attrs 对象中的所有 keys
    let
      keys = _.keys(attrs),
      length = keys.length;

    // 如果 object 为空
    if (object == null) return !length;

    // 将 object 包装为一个对象
    let obj = Object(object);

    // 遍历 attrs 对象的键值对
    for (let i = 0; i < length; i++) {
      let key = keys[i];

      // 如果 obj 对象没有 attrs 对象的某个 key，或者对于某个 key，它们的 value 值不同，则证明 object 不拥有 attrs 的所有键值对，返回 false
      if (attrs[key] !== obj[key] || !(key in obj)) return false;
    }

    // 执行到这里说明 object 拥有 attrs 的所有键值对，返回true
    return true;
  };

  // 为了比较相等而进行内部递归比较的函数
  let eq = function(a, b, aStack, bStack) {
    // 判断 +0 和 -0 比较的情况
    // 1 / 0 === Infinity ， 1 / -0 === -Infinity
    if (a === b) return a !== 0 || 1 / a === 1 / b;

    // 判断 null 和 undefined 比较的情况
    // null !== undefined
    if (a == null || b == null) return a === b;

    // 判断 underscore 对象比较的情况
    // 如果 a 和 b 都是 '_' 的实例，则比较 _wrapped 属性值
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;

    // 比较变量类型
    // 使用 Object.prototype.toString.call() 方法获取 a 的变量类型，并赋值给变量 className
    // 并使用同样的方法获取 b 的变量类型，如果 a 和 b 的变量类型不相等，则返回 false
    let className = toString.call(a);
    if (className !== toString.call(b)) return false;

    // String，Number，RegExp，Date，Boolean 可以根据其 value 值来比较是否相等
    switch (className) {
      case '[object RegExp]':
      case '[object String]':
        // 将 RegExp 类型强制转换为 String 类型来进行比较
        return '' + a === '' + b;

      case '[object Number]':
        // 判断 a 和 b 是否是 NaN，如果均是，则相等
        if (+a !== +a) return +b !== +b;
        // 使用 + 运算符将 Number 类型值转换为基本类型值
        // 对 0 进行特殊判断，因为 +0 !== -0
        return +a === 0 ? 1 / +a === 1 / b : +a === +b;

      case '[object Date]':
      case '[object Boolean]':
        // + 运算符会强制将 Date 和 Boolean 类型转换为 Number类型，然后再进行比较
        return +a === +b;
    }

    // 判断 a 是否是数组
    let areArrays = className === '[object Array]';
    // 如果 a 不是数组
    if (!areArrays) {
      // 如果 a 不是 object 或者 b 不是 object，则返回 false
      if (typeof a != 'object' || typeof b != 'object') return false;

      // 构造函数不相等的对象是不相同的，但是它们可能来自不同的 iframes 中
      let
        aCtor = a.constructor,
        bCtor = b.constructor;

      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor && _.isFunction(bCtor) && bCtor instanceof bCtor) && ('constructor' in a && 'constructor' in b)) {
        return false;
      }
    }

    // 第一次调用 eq() 函数，没有传入 aStack 和 bStack 参数
    // 之后的递归调用都会传入这两个参数
    aStack = aStack || [];
    bStack = bStack || [];

    let length = aStack.length;
    while (length--) {
      // 线性搜索
      if (aStack[length] === a) return bStack[length] === b;
    }

    // 将第一个对象添加到遍历对象的堆栈中
    aStack.push(a);
    bStack.push(b);

    // 递归地比较对象和数组
    // 如果 a 是数组
    if (areArrays) {
      length = a.length;

      // 比较数组的长度以确定是否需要进行深度比较
      // 如果 a 和 b 的长度不一样，则返回 false
      if (length !== b.length) return false;

      // 深度比较内容，忽略非数字属性
      while (length--) {
        // 递归
        if (!eq(a[length], b[length], aStack, bStack)) return false;
      }
    } else {
      // 如果 a 不是数组，即 a 为对象
      // 开始深度比较对象
      let
        keys = _.keys(a),
        key;
      length = keys.length;

      // 在进行深度比较之前，先判断两个对象是否包含相同数量的属性，如果不相同则返回 false
      if (_.keys(b).length !== length) return false;

      while (length--) {
        key = keys[length];
        // 递归
        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
      }
    }

    // 将 a 和 b 元素出栈
    aStack.pop();
    bStack.pop();
    return true;
  };

  // 通过深度比较来检查两个对象是否相等
  _.isEqual = function(a, b) {
    return eq(a, b);
  };

  // 判断数组、字符串、类数组对象是否为空
  _.isEmpty = function(obj) {
    if (obj == null) return true;

    // 如果数组、字符串、类数组的 length 属性值为0，则为空对象
    if (_.isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;

    // 如果对象的键值对数量为 0，则为空对象
    return _.keys(obj).length === 0;
  };

  // 判断对象是否是 DOM 元素
  _.isElement = function(obj) {
    // 如果 obj 存在且 obj 的节点类型为 1 (即 Element)，则为 DOM 元素
    return !!(obj && obj.nodeType === 1);
  };

  // 判断是否是数组
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) === '[object Array]';
  };

  // 判断是否是对象
  _.isObject = function(obj) {
    let type = typeof obj;
    // 将 function 和 object 判断为对象，null 不是对象
    return type === 'function' || type === 'object' && !!obj;
  };

  // 添加一些判断类型的方法
  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) === '[object ' + name + ']';
    };
  });

  // 兼容 IE < 9 下的 _.isArguments() 方法
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      // 通过判断 obj 参数对象中是否含有 callee 属性来做兼容
      return _.has(obj, 'callee');
    };
  }

  // 优化 _.isFunction()功能
  // 使其能在 old v8、IE 11、Safari 8 工作
  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
    _.isFunction = function(obj) {
      return typeof obj == 'function' || false;
    };
  }

  // 判断给定对象是否是有限的 (比全局 isFinite() 更健壮)
  _.isFinite = function(obj) {
    return isFinite(obj) && !isNaN(parseFloat(obj));
  };

  // 判断是否为 NaN
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj !== +obj;
  };

  // 判断是否是布尔值
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
  };

  // 判断是否是 null
  _.isNull = function(obj) {
    return obj === null;
  };

  // 判断是否是 undefined
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // 判断给定对象的 own properties 中是否含有给定属性
  _.has = function(obj, key) {
    return obj != null && hasOwnProperty.call(obj, key);
  };



  // ***************************** array部分源码解读 ****************************** //
  // ***************************** array部分源码解读 ****************************** //
  // ***************************** array部分源码解读 ****************************** //

  // ARRAY FUNCTIONS

  // 返回 array 的第一个元素
  // 如果传递了 n 参数，则返回由数组中的前 n 个元素组成的数组
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[0];
    return _.initial(array, array.length - n);
  };

  // 返回 array 中除了最后一个元素外的其他全部元素组成的数组
  // 如果传递了 n 参数，则返回由排除了数组后面的 n 个元素后的其他全部元素组成的数组
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
  };

  // 返回 array 中的最后一个元素
  // 如果传递了 n 参数，则返回由数组中的后面 n 个元素组成的数组
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if (n == null || guard) return array[array.length - 1];
    return _.rest(array, Math.max(0, array.length - n));
  };

  // 返回 array 中由除了第一个元素外的其他全部元素组成的数组
  // 如果传递了 n 参数，则返回由从 n 开始的剩余所有元素组成的数组
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, n == null || guard ? 1 : n);
  };

  // 返回一个除去了所有 false 值的 array 副本
  _.compact = function(array) {
    return _.filter(array, _.identity);
  };

  // 数组扁平化的内部实现
  // shallow 表示是否只展开一层
  // strict 表示不保存 || 保存 非数组元素
  // startIndex 表示从 input 的第几项开始展开
  let flatten = function(input, shallow, strict, startIndex) {
    let
      // 函数返回的结果
      output = [],
      // output 的下标
      idx = 0;
    for (let i = startIndex || 0, length = getLength(input); i < length; i++) {
      let value = input[i];

      // 如果 value 是类数组，并且是 Array 或 Arguments类型
      if (isArrayLike(vale) && (_.isArray(value) || _.isArguments(value))) {

        // 如果不是只展开一层，则继续调用 flatten()
        if (!shallow) value = flatten(value, shallow, strict);

        // 如果只展开一层，则将 value 数组的元素添加到 output 数组中
        let j = 0,
          len = value.length;
        output.length += len;
        while (j < len) {
          output[idx++] = value[j++];
        }
      } else if (!strict) {
        // 如果 value 是基本类型值，则将 value 添加到 output 数组中
        output[idx++] = value;
      }
    }
    return output;
  }；

  // 将一个嵌套多层的 array 数组转换为只有一层的数组
  // 如果传递给 shallow 参数的值为 true，数组将只减少一维的嵌套
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, false);
  };

  // 返回一个删除所有 values 值后的 array 副本
  _.without = function(array) {
    // 将 arguments 转换为数组，同时去掉第一个元素
    return _.difference(array, slice.call(arguments, 1));
  };

  // 数组去重
  // 如果确定 array 已经排序, 那么给 isSorted 参数传递 true 值, 此函数将运行更快的算法
  // 如果要处理对象元素, 则传递 iteratee 函数来获取要对比的属性
  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
    // 如果传入的 isSorted 参数不是布尔值，则为参数重新赋值
    if (!_.isBoolean(isSorted)) {
      context = iteratee;
      iteratee = isSorted;
      isSorted = false;
    }

    if (iteratee != null) iteratee = cb(iteratee, context);

    // result 是返回的结果，seen 是已经出现过的元素
    let
      result = [],
      seen = [];

    for (let i = 0, length = getLength(array); i < length; i++) {
      let
        value = array[i],
        // computed 为当前需要进行比较的值
        // 如果指定了 iteratee 函数，则将迭代后的值赋给 computed，否则将 value 值赋给 computed
        computed = iteratee ? iteratee(value, i, array) : value;

      if (isSorted) {
        // 对应 array 已经排序了的情况
        // 如果 value 不是 array 的第一个元素 或者 上一个元素与当前元素不相等，则将 value 添加到 result 数组中
        if (!i || seen !== computed) result.push(value);
        seen = computed;
      } else if (iteratee) {
        if (!_.contains(seen, computed)) {
          // 对应 array 没有排序但是传入了 iteratee 函数的情况
          seen.push(computed);
          result.push(value);
        }
      } else if (!_.contains(result, value)) {
        // 对应 array 没有排序并且也没有传入 iteratee 函数的情况
        result.push(value);
      }
    }
    return result;
  };

  // 
}.call(this));
