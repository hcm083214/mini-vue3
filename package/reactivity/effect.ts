type activeEffectType = null | (() => void);
// 创建一个全局变量，用来保存被注册的副作用函数
export let activeEffect: activeEffectType;
// 创建变量 effectStack 用来保存 activeEffect
const effectStack: activeEffectType[] = [];
// effect 函数用来注册副作用函数，而非副作用函数本身
export function effect(fn: () => void) {
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
