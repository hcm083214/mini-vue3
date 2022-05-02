# vue 生成文件格式说明

vue 是通过 rollup 进行打包的，rollup 可以通过配置 output 的 format 值打包成不同格式的文件

```js
// rollup.config.js  
export default {
    input: 'package/vue/index.ts',
    output: {
        file: 'dist/index.js',
        format: 'amd',//amd cjs esm iife umd
        name: 'Vue',
    }
}
// package/vue/index.ts
const Vue={
    createApp(){}
};
export default Vue;
```

`amd` : 异步模块定义，用于像RequireJS这样的模块加载器

`cjs` : CommonJS，适用于 Node 和 Browserify/Webpack

`esm` : 将软件包保存为 ES 模块文件，在现代浏览器中可以通过   `<script type=module>` 标签引入

`iife` : 一个立即执行函数的功能，适合作为`<script>`标签

`umd` – 通用模块定义，以`amd`，`cjs` 和 `iife` 为一体

```js
// dist/index.js

// cjs 格式
'use strict';
const Vue={
    createApp(){}
};
module.exports = Vue;

// esm 格式
const Vue={
    createApp(){}
};
export { Vue as default };

// amd 格式
define((function () { 'use strict';
    const Vue={
        createApp(){}
    };
    return Vue;
}));

// iife 格式
var Vue = (function () {
    'use strict';
    const Vue={
        createApp(){}
    };
    return Vue;
})();

// umd 格式
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.Vue = factory());
})(this, (function () { 'use strict';
    const Vue={
        createApp(){}
    };
    return Vue;
}));
```

# vue 的设计思路

## 声明式框架

对于视图（UI）框架来说，从范式的角度看，通常分为命令式框架和声明式框架。命令式框架关注的是过程，声明式框架关注的是结果。

例如，要实现如下如下功能：

1. 获取 id 为 #app 的 div 标签
2. 设置文本内容是 'hello world'
3. 绑定点击事件，点击打印 'OK'

用声明式的方式翻译成代码

```js
const div = document.querySelector('#app');
div.innerText = 'hello world';
div.addEventListener('click',()=>{console.log('ok')})
```

声明式方式只在乎结果，只需要通过如下一行代码就完成上述功能，但是功能怎么实现的，这个是框架需要考虑的事情。

```html
<div @click="console.log('ok')" >hello world</div>
```

上面的代码就是 vue 的模板，vue 就是典型的声明式框架，除了 vue 外，react angular 都是声明式的框架。

## 编译器

在说明声明式框架时提到过 vue 的模板 `<div @click="console.log('ok')" >hello world</div>` 。可以看出它和 HTML 的书写方式基本一致，但仅是看上去不一样。对于 vue 的编译器来说，**模板就是一个普通的字符串**。

编译器的功能就是把模板里的字符串转变为**渲染函数**，渲染函数执行后会得到一个JavaScript 对象，该对象也就是**虚拟DOM**。

下面用一个 `.vue` 文件简单说明下编译器的工作原理

```vue
<template>
    <div @click="handler">
        <span>{{name}}</span>
    </div>
</template>
<script>
	export default{
        data(){
            return {
                name:'a'
            }
        },
        methods:{
            handler(){}
        }
    }
</script>
```

通过编译器的编译，模板将会编译成渲染函数并添加到 `<script>` 标签快的组件对象上，最终在浏览器运行的代码如下：

```js
export default{
    data(){
        return {
            name:'a'
        }
    },
    methods:{
        handler(){}
    },
    render(h){
        return h('div',{onClick:handler},[h('span',this.name)])//返回的就是虚拟 DOM
    }
}
```

将 h 函数的结果打印出来可以得到虚拟DOM，在Vue2中对象包含的属性如下：

```js
VNode {tag: 'div', data: {…}, children: Array(1), text: undefined, elm: undefined, …}

// children: Array(1) 的结果如下
VNode {tag: 'span', data: undefined, children: Array(1), text: undefined, elm: span, …}
```

顺便说一点，通过 `.vue` 文件打包后得到的代码就是 render 函数，因此打包后的文件是不带渲染器的。

## 渲染器

当了解了虚拟 DOM 其实就是描述真实 DOM 的对象后，那 vue 又是怎么把虚拟 DOM 变成真实 DOM 渲染到页面上的呢？答案是渲染器，那么渲染器是如何工作的，下面通过一个简单的例子来说明。

假设有如下虚拟 DOM:

```JS
const VNode = {
    tag: 'div',
    props: {
        onClick: () => {
            console.log('ok')
        }
    },
    text: undefined,
    children: [{
        tag: 'span',
        text: undefined,
        children: [{
            tag: undefined,
            text: 1,
            children: undefined,
        }]
    }]
};
```

编写一个渲染器函数 renderer

```js
function renderer(VNode, container) {
    let el;
    // 创建元素
    VNode.tag && (el = document.createElement(VNode.tag));
    // 为元素条件属性和事件
    VNode.props && Object.keys(VNode.props).forEach(keys => {
        if (/^on/s.test(keys)) {
            const eventType = keys.slice(2).toLowerCase();
            el.addEventListener(eventType, () => {
                VNode.props[keys].call(VNode);
            })
        }
    });
	// 处理 children
    if (Array.isArray(VNode.children)) {
        VNode.children.forEach(child => {
            renderer(child, el)
        })
    }
    // 元素/文本挂载
    if (VNode.text) {
        container.innerText = VNode.text;
    } else {
        container.appendChild(el)
    }
}
renderer(VNode,document.body);
```

在浏览器中运行这段代码，点击 div 标签会打印出 ok。可以看出渲染器其实就是操作 DOM API来完成渲染工作。当然 vue 的渲染器不仅仅是创建 DOM 节点这么简单，其精髓是在节点更新阶段的 patch 算法。

## 组件的本质

初步了解了编译器，虚拟 DOM 和渲染器后，我们知道了 DOM 元素会先经编译器转化为 render 函数，render 函数执行得到虚拟 DOM，虚拟 DOM 经渲染器创建成真实的 DOM。

在 vue 的使用过程中，最常用的是组件，组件在模板中也是通过标签的形式展示的。但在本质上 **组件其实就是一组 DOM 元素的封装**。

```js
const myComponent1 =function(){
    return {
        tag: 'div',
        props: {
            onClick: () => {
                console.log('ok')
            }
        },
        text: undefined,
        children: [{
            tag: 'span',
            text: undefined,
            children: [{
                tag: undefined,
                text: 1,
                children: undefined,
            }]
        }]
	}
}
const VNode={
    tag:myComponent1
}
```

上面的例子中，组件是通过一个函数来表示的，函数执行后得到的是虚拟DOM，虚拟DOM描述的就是一组 DOM 元素。当然除了函数外通过对象也是可以用来描述组件的。下面看下如何用对象描述组件：

```js
const myComponent = {
    render(){
       return {
            tag: 'div',
            props: {
                onClick: () => {
                    console.log('ok')
                }
            },
            text: undefined,
            children: [{
                tag: 'span',
                text: undefined,
                children: [{
                    tag: undefined,
                    text: 1,
                    children: undefined,
                }]
            }]
        }
    }
}
const VNode={
    tag:myComponent2
}
```

为了兼容组件的渲染，渲染器 renderer 函数需要做如下修改：

```js
function renderer(VNode, container) {
    // 判断是组件还是普通元素
    if (typeof VNode.tag === 'function') {
        mountComponent(VNode,container);
    } else if (typeof VNode.tag === "object") {
        mountComponent(VNode,container);
    }else if(typeof VNode.tag === 'string'){
        mountElement(VNode, container)
    }
}
function mountComponent(VNode,container){
    if(typeof VNode.tag === 'function'){
        const VNodes = VNode.tag();
        mountElement(VNodes, container);
    }else{
        const VNodes = VNode.tag.render();
        mountElement(VNodes, container);
    }
}
function mountElement(VNode, container) {
    let el;
    // 创建元素
    VNode.tag && (el = document.createElement(VNode.tag));
    // 为元素条件属性和事件
    VNode.props && Object.keys(VNode.props).forEach(keys => {
        if (/^on/s.test(keys)) {
            const eventType = keys.slice(2).toLowerCase();
            el.addEventListener(eventType, () => {
                VNode.props[keys].call(VNode);
            })
        }
    });
    // 处理 children
    if (Array.isArray(VNode.children)) {
        VNode.children.forEach(child => {
            mountElement(child, el)
        })
    }
    // 元素/文本挂载
    if (VNode.text) {
        container.innerText = VNode.text;
    } else {
        container.appendChild(el)
    }

}
renderer(VNode, document.querySelector('#app1'));
renderer(VNode1, document.querySelector('#app2'));
renderer(VNode2, document.querySelector('#app3'));
```

## 响应式系统

响应式系统可以说是 vue 的驱动器，初始化时读取模板中的数据触发 getter，此时收集渲染函数；模板中的数据被修改触发 setter，此时执行收集到的渲染函数。关于响应式系统接下来会通过手写一个响应式系统加深理解。

# 响应式系统

响应式系统可以说 vue 的驱动器，当读取模板中的数据时触发 getter，此时收集渲染函数；模板中的数据被修改触发 setter，此时执行收集到的渲染函数。vue 响应式的实现的核心思想是数据劫持，在 vue2 中是通过 Object.defineProperty 实现，vue3 是通过 proxy 实现。这些都是一些基本知识点，对于响应式系统除了数据劫持外还做了什么。

## 副作用函数和简单的响应式系统

在说明响应式系统的功能时，有提到两个关键的名词：模板中的数据和渲染函数。其中渲染函数就是副作用函数，因为该函数有访问函数外部的变量。副作用函数执行导致外部变量的改变，直接或者间接的影响到使用该外部变量的其他函数。模板中的数据的读取或修改都会和副作用函数产生关系，下面通过代码来完成一个简单的响应式系统

```js
const data = {
    str: 'hello world',
}
// 定义副作用函数 effect
function effect() {
    document.body.innerText = proxy.str;
}
let fn;
// 进行数据劫持
const proxy = new Proxy(data, {
    get(target, key) {
        fn = effect;
        return target[key]
    },
    set(target, key, newVal) {
        target[key] = newVal;
        fn();
        return true;
    }
})
effect();
setTimeout(()=>{
    proxy.str='111'
},1000)
```

虽然完成了一个简单的响应式系统，但是考虑以下几种情况，代码该如何修改增加功能呢

- 情况一：如果副作用函数是一个匿名函数

  ```js
  function effect() {
      document.body.innerText = proxy.str;
  }
  // 副作用函数是一个匿名函数
  function fn(()=>{
      document.body.innerText = proxy.str;
  }) 
  ```

- 情况二：data 中有多个属性，每个属性都存在与之相对的副作用函数

  ```js
  data ={
      key1:value1,
      key2:value2,
      key3:value3,
  }
  function effect1(){data.key1}
  function effect2(){data.key2}
  function effect3(){data.key3}
  ```

- 情况三：data 中的同一个属性被多个副作用函数使用

  ```js
  data ={
      key1:value1,
  }
  function effect1(){data.key1}
  function effect2(){data.key1}
  function effect3(){data.key1}
  ```

- 情况四：data 中有多个属性，每个属性都被同一个副作用函数使用

  ```js
  data ={
      key1:value1,
      key2:value2,
      key3:value3,
  }
  function effect1(){data.key1;data.key2;data.key3;}
  ```

- 情况五：访问了 data 中不存在的属性

  ```js
  data ={
      key1:value1,
  }
  function effect1(){data.key2}
  ```

- 情况六：存在多个 data

  ```js
  data1 ={
      key1:value1,
  }
  data2 ={
      key1:value2,
  }
  function effect1(){data1.key1}
  function effect2(){data2.key1}
  ```

## 完善响应式系统

针对以上提到的问题，逐一完成要求的功能

### 副作用函数是一个匿名函数

对于情况一：副作用函数是匿名函数，可以封装一个 effect 函数，提供一个参数 fn 用来接收并注册副作用函数。同时创建一个全局变量用来保存副作用函数。

```js
// 创建一个全局变量，用来保存被注册的副作用函数
export let activeEffect:()=>void;
// effect 函数用来注册副作用函数，而非副作用函数本身
export function effect<T>(fn:()=>T){
    activeEffect = fn;
    fn();
}
```

### data 中有多个属性

上面说的情况二/三/四/五其实是实现方式都是一样的，需要做的是副作用函数和目标属性建立明确联系：用到同一个属性的所有的 effect 函数保存在同一个 Set 对象内。创建一个 Map 对象，保存对象属性和 set 对象的映射。

```js
data ={
    key:value,
}
function effect(){data.key}
// 下面表示的是 key/effect 和 Set/Map 之间的关系
// Set 对象保存所有的 effect 函数
Set: effect
// Map 对象保存属性 key 和 Set 对象的映射
Map: key → Set
```

按照上方所述的原理，代码如下：

```js
// 创建一个全局变量，用来保存被注册的副作用函数
let activeEffect;
// effect 函数用来注册副作用函数，而非副作用函数本身
function effect(fn) {
    activeEffect = fn;
    fn();
}

// 创建一个全局的 bucket 变量，用来保存属性和 Set 对象的映射关系
const bucket = new Map();
// get 拦截函数中调用 track 记录各属性对应的副作用函数
function track(target, key) {
    if (!activeEffect)
        return;
    let depsMap = bucket.get(key);
    !depsMap && bucket.set(key, (depsMap = new Set()));
    depsMap.add(activeEffect);
    // 记录完副作用函数后置空
    activeEffect = null;
}
function trigger(target, key) {
    let depsMap = bucket.get(key);
    depsMap && depsMap.forEach(cb => cb());
}
// 封装一个 reactive 函数，实现对对象的拦截
function reactive(obj) {
    return new Proxy(obj, {
        get(target, key) {
            track(target, key);
            return target[key];
        },
        set(target, key, newVal) {
            target[key] = newVal;
            trigger(target, key);
            return true;
        }
    });
}
```

测试代码：

```html
<div id="person1">
    <h1 class="effect1"></h1>
    <h1 class="effect2"></h1>
    <h1 class="effect22"></h1>
    <h1 class="effect23"></h1>
    <h1 class="effect3"></h1>
    <h1 class="effect4"></h1>
</div>
<script>
    const person1 = reactive({
        name: 'tom',
        age: 11,
        sex: 'man'
    });
    const person2 = {
        name: 'mary',
        age: 10,
        sex: 'women'
    }

    effect(() => {
        document.querySelector('#person1 .effect1').innerText = person1.name;
    });
    effect(() => {
        document.querySelector('#person1 .effect2').innerText = person1.age;
    });
    effect(() => {
        document.querySelector('#person1 .effect22').innerText = person1.age + 100;
    });
    effect(() => {
        document.querySelector('#person1 .effect23').innerText = person1.age + 200;
    });
    effect(() => {
        document.querySelector('#person1 .effect3').innerText = person1.sex;
    });
    effect(() => {
        document.querySelector('#person1 .effect4').innerText = person1.a
    });
    setTimeout(() => {
        Object.assign(person1, person2);
    }, 2000);
    setTimeout(() => {
        person1.a = 'hello world';
    }, 3000);
</script>
```

### 存在多个 data

对于情况六存在多个 data 的情况，实现思想和上面类似。只需要新增一组 WeakMap 对象，表示 data 和 Map 的映射关系。

```js
data1 ={
    key1:value1,
}
data2 ={
    key1:value2,
}
function effect1(){data1.key1}
function effect2(){data2.key1}
// 下面表示的是 key/effect 和 Set/Map 之间的关系
// Set 对象保存所有的 effect 函数
Set: effect
// Map 对象保存属性 key 和 Set 对象的映射
Map: key → Set
// WeakMap 对象保存 data 和 Map 对象的映射关系
WeakMap: data → Map
```

代码修改如下：

```js
// 创建一个全局变量，用来保存被注册的副作用函数
let activeEffect;
// effect 函数用来注册副作用函数，而非副作用函数本身
function effect(fn) {
    activeEffect = fn;
    fn();
}
function setActiveEffectNull() {
    activeEffect = null;
}

// 创建一个全局的 bucket 变量，用来保存 data 和 Map 对象的映射关系
const bucket = new WeakMap();
// get 拦截函数中调用 track 记录各属性对应的副作用函数
function track(target, key) {
    if (!activeEffect)
        return;
    // 创建一个 depsMap 变量，用来保存属性和 Set 对象的映射关系
    let depsMap = bucket.get(target);
    // 如果 data 不存在，则新建一个以 data 为 key，value 为 Map 的映射
    !depsMap && bucket.set(target, (depsMap = new Map()));
    // 创建一个 dep 变量，用来保存所有的 effect 函数
    let deps = depsMap.get(key);
    !deps && depsMap.set(key, deps = new Set());
    deps.add(activeEffect);
    // 记录完副作用函数后 activeEffect 置空
    setActiveEffectNull();
}
function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    deps && deps.forEach(cb => cb());
}
// 封装一个 reactive 函数，实现对对象的拦截
function reactive(obj) {
    return new Proxy(obj, {
        get(target, key) {
            track(target, key);
            return target[key];
        },
        set(target, key, newVal) {
            target[key] = newVal;
            trigger(target, key);
            return true;
        }
    });
}
```

响应式数据和副作用函数之间的关系

```js
const person3 = reactive({
    name: 'Andy',
    age: 5,
});
effect(() => {
    document.querySelector('#person3 .effectOuter').innerText = person3.name;
})
effect(() => {
    document.querySelector('#person3 .effectInner').innerText = person3.age + 2;
})
effect(() => {
    document.querySelector('#person3 .effectInner').innerText = person3.age + 3;
})

// WeakMap
WeakMap {{…} => Map(2)}
	0: {Object => Map(2)}
		key: {name: 'Tom', age: 100}
		value: Map(2)
			0: {"name" => Set(1)}
			1: {"age" => Set(2)}
```

图示：

![image-20220405144145739](.\images\1.png)

### 副作用函数嵌套的处理

在副作用函数 effect 函数中嵌套使用 effect，对应到 vue 的使用情形是在一个组件中使用了另一个组件。看如下情况，出现了副作用函数未被正确的属性收集的问题：

```html
<div id="person3">
    <h1 class="effectOuter"></h1>
    <h1 class="effectInner"></h1>
</div>
<script>
    const person3 = reactive({
        name: 'Andy',
        age: 5,
    });
    effect(() => {
        console.log('effectOuter')
        effect(() => {
            console.log('effectInner');
            document.querySelector('#person3 .effectInner').innerText = person3.age + 1;
        })
        document.querySelector('#person3 .effectOuter').innerText = person3.name;
    })

    setTimeout(() => {
        person3.name = 'Tom';
    }, 3000)
    // effectOuter
    // effectInner
    // effectInner
    /*
    	符合预期的结果，同时页面上的 name 改为 Tom
    	// effectOuter
    	// effectInner
    	// effectOuter
    	// effectInner
    */
</script>
```

出现以上问题的原因在于副作用函数收集出了问题：activeEffect 变量在执行嵌套 effect 函数时发生了改变。执行到内部的 effect 函数时 activeEffect 被覆盖为内部的 effect 函数并且不再改变，再之后执行外部的代码触发 track 函数此时保存的是内部的 effect 函数。知道原因后，我们可以添加 effectStack 变量，用来记录 activeEffect。 修改后的代码如下：

```js
// 创建一个全局变量，用来保存被注册的副作用函数
let activeEffect;
// 创建变量 effectStack 用来保存 activeEffect
const effectStack = [];
// effect 函数用来注册副作用函数，而非副作用函数本身
function effect(fn) {
    activeEffect = fn;
    // activeEffect 入栈，当存在 effect 嵌套时保存所有的 activeEffect（副作用函数）
    effectStack.push(activeEffect);
    // 副作用函数执行，若存在 effect 嵌套，则会重新调用 effect，将 activeEffect 入栈
    fn();
    // 将已执行的副作用函数出栈
    effectStack.pop();
    // 还原副作用函数为之前的值
    activeEffect = effectStack[effectStack.length - 1];
}
```

### 避免无限递归循环

考虑如下情况，当属性自加时，会直接报错 `Uncaught RangeError: Maximum call stack size exceeded`：

```js
const person = reactive({
    name: 'Andy',
    age: 5,
});
effect(() => {
    console.log('effect');
    document.querySelector('#person3 .effectInner').innerText = person.age++;
})
```

原因发生在 `person.age++` 上，当进行自增操作时其实会分成两步：读取 `person.age` 的值，加 1 后再修改 `person.age` 值。既触发了 get 执行 track 函数收集副作用函数，又触发 set 执行 trigger 函数执行副作用函数。解决方式很简单：在 trigger 函数中增加判断，如果trigger 函数中执行的副作用函数与需要收集的副作用函数相同，则不执行副作用函数，代码修改如下：

```js
function trigger(target: obj, key: string) {
    const depsMap = bucket.get(target);
    if (!depsMap) return
    const deps = depsMap.get(key);
    //新增变量 effectToRun 保存需要执行的副作用函数,避免无线递归循环
    const effectToRun = new Set<fn>();
    deps && deps.forEach(effect => {
        if (effect !== activeEffect) {
            effectToRun.add(effect)
        }
    });
    effectToRun.forEach(effect => effect())
}
```

# 实现一个 computed

## 用法

先看看 computed 的用法

```js
const data = reactive({
    num:0,
});
const doubleData = computed(()=>data.num * 2); 
document.querySelector('.data .cp').innerText = doubleData.value;
```

这里我们给 `computed` 函数传递了第一个参数，它是一个类似 getter 的回调函数，输出的是一个*只读*的**响应式引用**。为了访问新创建的计算变量的 **value**，我们需要像 `ref` 一样使用 `.value` property。

知道功能及用法后，接下来看看源码里是如何实现的。

## 源码思路剖析

### computed 响应式思路

对于 computed 来说，需要实现的功能包括2部分：

1. `computed` 函数传递了第一个参数，输出的是一个*只读*的**响应式引用**。
2. 响应式引用需要使用 `.value` property 来访问

伪代码形式如下：

```js
function computed(fn){
    let effectFn;
    // 实现响应式，响应式引用读取时才触发 fn 的执行，触发 getter 
    effectFn = effect(fn);
    // 返回一个响应式的引用，需要使用 .value 来访问
    return {
        get value(){
            return effectFn()
        }
    }
}
```

这段伪代码实现的难点在于只有当读取响应式引用的值时，才触发 fn 执行实现响应式。在 vue3 源码该功能的实现是通过在 effect 函数中添加 lazy 选项来实现的。

### computed 实现

```js
function computed(fn) {
    const effectFn = effect(fn, { lazy: true });
    const obj = {
        get value() {
            return effectFn();
        }
    };
    return obj;
}

function effect(fn, options) {
    const effectFn = function () {
        activeEffect = fn;
        // activeEffect 入栈，当存在 effect 嵌套时保存所有的 activeEffect（副作用函数）
        effectStack.push(activeEffect);
        // 副作用函数执行，若存在 effect 嵌套，则会重新调用 effect，将 activeEffect 入栈
        const res = fn();
        // 将已执行的副作用函数出栈
        effectStack.pop();
        // 还原副作用函数为之前的值
        activeEffect = effectStack[effectStack.length - 1];
        return res;
    };
    if (!options || !options.lazy) {
        effectFn();
    }
    return effectFn;
}
```

通过添加 lazy 属性，computed 不会立即执行。当计算属性被使用时，触发 getter 执行 effect 函数收集使用过计算属性的函数。

computed 还有缓存的特性，下面看下 vue3 是怎么实现的：

```js
function effect(fn, options) {
    const effectFn = function () {
        activeEffect = effectFn;
        // activeEffect 入栈，当存在 effect 嵌套时保存所有的 activeEffect（副作用函数）
        effectStack.push(activeEffect);
        // 副作用函数执行，若存在 effect 嵌套，则会重新调用 effect，将 activeEffect 入栈
        const res = fn();
        // 将已执行的副作用函数出栈
        effectStack.pop();
        // 还原副作用函数为之前的值
        activeEffect = effectStack[effectStack.length - 1];
        return res;
    };
    // 是否为懒加载
    if (!options || !options.lazy) {
        effectFn();
    }
    // 将 options 属性挂载到 effectFn 上
    effectFn.options = options;
    return effectFn;
}

function trigger(target, key) {
    const depsMap = bucket.get(target);
    if (!depsMap)
        return;
    const deps = depsMap.get(key);
    //新增变量 effectToRun 保存需要执行的副作用函数,避免无线递归循环
    const effectToRun = new Set();
    deps && deps.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectToRun.add(effectFn);
        }
    });
    effectToRun.forEach(effectFn => {
        // 如果副函数的 options 上存在调度器 scheduler，则将 副函数传递给调度器执行
        if (effectFn.options && effectFn.options.scheduler) {
            effectFn.options.scheduler(effectFn);
        }
        else {
            effectFn();
        }
    });
}

function computed(fn) {
    // 创建 dirty 变量，如果为真表示需要重新计算值 
    let dirty = true, value;
    const effectFn = effect(fn, {
        lazy: true, scheduler() {
            dirty = true;
        }
    });
    const obj = {
        get value() {
            if (dirty) { // 只有 dirty 为真时才计算，并将得到的值缓存到 value 中
                value = effectFn();
                // 将 dirty 值设置为 false， 下次访问直接使用缓存中的值
                dirty = false;
            }
            return value;
        }
    };
    return obj;
}
```





