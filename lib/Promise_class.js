/* 
自定义Promise函数模块: IIFE
*/
(function (window) {

    const PENDDING = 'pendding'
    const RESOLVED = 'resolved'
    const REJECTED = 'rejected'

    class Promise {
        /* 
        Promise构造函数
        executor：执行器函数（同步执行）
        */
        constructor(executor) {

            // 将当前promise对象保存起来
            const _this = this
            this.status = 'pendding'    // 给promise对象指定status属性，初始值pendding
            this.data = undefined   // 给promise对象指定一个用于存储结果数据的属性
            this.callbacks = [] // 每个元素的结构：{onResolved(){}, onRejected(){}}

            function resolve(value) {
                // 如果当前状态不是pendding， 直接结束
                if (_this.status !== 'pendding') {
                    return
                }

                // 将状态改为resolved
                _this.status = 'resolved'

                // 保存value数据
                _this.data = value

                // 如果有待执行callback函数，立即异步执行回调onResolved
                if (_this.callbacks.length > 0) {
                    setTimeout(() => {  // 放入队列中执行所有成功的回调
                        _this.callbacks.forEach(callbacksObj => {
                            callbacksObj.onResolved(value)
                        });
                    });

                }
            }
            function reject(reason) {
                // 如果当前状态不是pendding， 直接结束
                if (_this.status !== 'pendding') {
                    return
                }
                // 将状态改为rejectd
                _this.status = 'rejected'

                // 保存reason数据
                _this.data = reason

                // 如果有待执行callback函数，立即异步执行回调onRejected
                if (_this.callbacks.length > 0) {
                    setTimeout(() => {  // 放入队列中执行所有成功的回调
                        _this.callbacks.forEach(callbacksObj => {
                            callbacksObj.onRejected(reason)
                        });
                    });

                }
            }

            // 立即同步执行executor
            try {
                executor(resolve, reject)
            } catch (error) {   // 如果执行器抛出异常，promise对象变为rejected状态
                reject(error)
            }

        }
        /* 
        Promise原型对象的then()
        指定成功和失败的回调函数
        返回一个新的promise对象
        返回的promise的结果由onResolved/onRejected执行结果决定
        */
        then(onResolved, onRejected) {
            onResolved = typeof onResolved === 'function' ? onResolved : value => value // 向后传递成功的value

            // 指定默然的失败的回调（实现错误/异常传透的关键点）
            onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason } // 向后传递失败的reason

            const _this = this; // 当前promise对象

            // 返回一個新的promise对象
            return new Promise((resolve, reject) => {
                /* 
                调用指定的回调函数处理，
                根据执行结果，改变return的promise的状态/数据
                */
                function handle(callback) {
                    /* 
                    1. 如果抛出异常，return的promise就会失败，reason就是error
                    2. 如果回调函数返回不是promise，return的promise就会成功，value就是返回的值
                    3. 如果回调函数返回时promise，return的promise结果就是这个promise的结果
                    */
                    try {
                        const result = callback(_this.data)
                        if (result instanceof Promise) {
                            // 返回的是promise
                            result.then(
                                value => resolve(value), // 当result成功时，让return的promise也成功
                                reason => reject(reason) // 当result失败是，让return的promise也失败
                            )
                            // result.then(resolve, reject) // 简洁版
                        } else {
                            // 返回的不是promise
                            resolve(result)
                        }
                    } catch (error) {
                        // 抛出异常
                        reject(error)
                    }
                }

                // 当前状态是pendding状态，将回调函数保存起来
                if (_this.status === PENDDING) {
                    _this.callbacks.push({
                        onResolved(value) {
                            handle(onResolved)
                        }, onRejected(reason) {
                            handle(onRejected)
                        }
                    })
                } else if (_this.status === RESOLVED) { // 如果当前是resolved状态，异步只想onResolved并改变return的promise状态
                    setTimeout(() => {
                        handle(onResolved)
                    });
                } else {  // 'rejected'
                    setTimeout(() => {  // 如果当前是rejected状态，异步执行onRejected并改变return的promise状态
                        /* 
                        1. 如果抛出异常，return的promise就会失败，reason就是error
                        2. 如果回调函数返回不是promise，return的promise就会成功，value就是返回的值
                        3. 如果回调函数返回时promise，return的promise结果就是这个promise的结果
                        */
                        handle(onRejected)
                        // try {
                        //     const result = onRejected(_this.data)
                        //     if (result instanceof Promise) {
                        //         // 返回的是promise
                        //         result.then(
                        //             value => resolve(value), // 当result成功时，让return的promise也成功
                        //             reason => reject(reason) // 当result失败是，让return的promise也失败
                        //         )
                        //         // result.then(resolve, reject) // 简洁版
                        //     } else {
                        //         // 返回的不是promise
                        //         resolve(result)
                        //     }
                        // } catch (error) {
                        //     // 抛出异常
                        //     reject(error)
                        // }
                    });
                }

            })

        }

        /* 
        Promise原型对象的catch()
        指定失败的回调函数
        返回一个新的promise对象
        */
        catch(onRejected) {
            return this.then(undefined, onRejected)
        }

        /* 
        Promise函数对象的resolve()
        返回一个指定结果的成功的promise
        */
        static resolve = function (value) {
            return new Promise((resolve, reject) => {
                // value是promise
                if (value instanceof Promise) {   // 使用value的结果作为promise的结果
                    value.then(resolve, reject);
                } else { // value不是promise => promise变为成功，数据是value
                    resolve(value)
                }
            })
        }

        /* 
        Promise函数对象的reject()
        返回一个指定reason的失败的promise
        */
        static reject = function (reason) {
            return new Promise((resolve, reject) => {
                reject(reason)
            })
        }

        /* 
        Promise函数对象的all()
        返回一个promise，只有当所有promise都成功时才成功，否则只要有一个失败的就失败
        */
        static all = function (promises) {
            let values = new Array(promises.length) // 用来保存所有成功value的数组 指定长度
            let resolvedCount = 0;  // 用来保存成功promise的数量
            return new Promise((resolve, reject) => {
                // 遍历promises获取每个promise的结果
                promises.forEach((p, index) => {
                    Promise.resolve(p).then(
                        value => {  // p成功，将成功的value保存到values
                            resolvedCount++
                            values[index] = value

                            // 如果全部成功了，将return的promise改变成功
                            if (resolvedCount == promises.length) {
                                resolve(values)
                            }
                        },
                        reason => {  //只要有一个失败了，return的promise就失败
                            reject(reason)
                        }
                    )

                })
            })
        }

        /* 
        Promise函数对象的race方法
        返回一个promise，其结果由第一个完成的promise决定
        */
        static race = function (promises) {
            return new Promise((resolve, reject) => {
                // 遍历promises获取每个promise的结果
                promises.forEach((p, index) => {
                    Promise.resolve(p).then(
                        value => {  // 一旦有成功的，将return变为成功
                            resolve(value)
                        },
                        reason => {  // 一旦有失败的，将return变为失败
                            reject(reason)
                        }
                    )
                })
            })
        }

        /* 
        返回一个promise对象，它在指定的时间后才确定结果
        */
        static resolveDelay = function (value, time) {
            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    // value是promise
                    if (value instanceof Promise) {   // 使用value的结果作为promise的结果
                        value.then(resolve, reject);
                    } else { // value不是promise => promise变为成功，数据是value
                        resolve(value)
                    }
                }, time);
            })
        }
        /* 
        返回一个promise对象，它在指定的时间后才失败
        */
        static rejectDelay = function (value, time) {

            return new Promise((resolve, reject) => {
                setTimeout(() => {
                    reject(reason)
                }, time);
            })

        }
    }


    // 向外暴露Promise函数
    window.Promise = Promise


})(window)