var MVue = (function () {
    'use strict';

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
        // setActiveEffectNull();
    }
    function trigger(target, key) {
        const depsMap = bucket.get(target);
        if (!depsMap)
            return;
        const deps = depsMap.get(key);
        //新增变量 effectToRun 保存需要执行的副作用函数,避免无线递归循环
        const effectToRun = new Set();
        deps && deps.forEach(effect => {
            if (effect !== activeEffect) {
                effectToRun.add(effect);
            }
        });
        effectToRun.forEach(effect => effect());
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

    const Vue = {
        createApp() { },
        reactive,
        effect
    };

    return Vue;

})();
