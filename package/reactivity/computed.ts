import { effect } from "./effect";
import { obj } from "./reactive";
type ComputedGetter<T> = (...args: any[]) => T
export function computed(fn: ComputedGetter<obj>) {
    // 创建 dirty 变量，如果为真表示需要重新计算值 
    let dirty = true,value:obj;
    const effectFn = effect(fn, {
        lazy: true, scheduler() {// 添加调度器，在调度器中将 dirty 重置为 true
            dirty = true
        }
    })
    const obj = {
        get value() {
            if(dirty){// 只有 dirty 为真时才计算，并将得到的值缓存到 value 中
                value = effectFn() as obj;
                // 将 dirty 值设置为 false， 下次访问直接使用缓存中的值
                dirty = false;
            }
            return value
        }
    }
    return obj
}