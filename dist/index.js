var MVue = (function () {
    'use strict';

    // 创建一个全局变量，用来保存被注册的副作用函数
    let activeEffect;
    // 创建变量 effectStack 用来保存 activeEffect
    const effectStack = [];
    // effect 函数用来注册副作用函数，而非副作用函数本身
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

    const Vue = {
        createApp() { },
        reactive,
        effect,
        computed
    };

    return Vue;

})();
