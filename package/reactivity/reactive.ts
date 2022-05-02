import { activeEffect, effectOptions } from "./effect";

export interface obj {
    [key: string]: any
}
interface fn {
    (): void,
    options?:effectOptions
}
type fnSetType = Set<fn>;
// 创建一个全局的 bucket 变量，用来保存 data 和 Map 对象的映射关系
const bucket: WeakMap<obj, Map<string, fnSetType>> = new WeakMap();
// get 拦截函数中调用 track 记录各属性对应的副作用函数
function track(target: obj, key: string) {
    if (!activeEffect) return;
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

function trigger(target: obj, key: string) {
    const depsMap = bucket.get(target);
    if (!depsMap) return
    const deps = depsMap.get(key);
    //新增变量 effectToRun 保存需要执行的副作用函数,避免无线递归循环
    const effectToRun = new Set<fn>();
    deps && deps.forEach(effectFn => {
        if (effectFn !== activeEffect) {
            effectToRun.add(effectFn)
        }
    });
    effectToRun.forEach(effectFn =>{
        // 如果副函数的 options 上存在调度器 scheduler，则将 副函数传递给调度器执行
        if(effectFn.options && effectFn.options.scheduler){
            effectFn.options.scheduler(effectFn)
        }else{
            effectFn()
        }
    } )
}

// 封装一个 reactive 函数，实现对对象的拦截
export function reactive(obj: object) {
    return new Proxy(obj, {
        get(target: obj, key: string) {
            track(target, key);
            return target[key];
        },
        set(target: obj, key: string, newVal: any) {
            target[key] = newVal;
            trigger(target, key)
            return true
        }
    })
}
