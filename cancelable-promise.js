// class CancelablePromise {
export default class CancelablePromise {
    #statuses = {
        PENDING: "pending",
        FULFILLED: "fulfilled",
        REJECTED: "rejected"
    }

    constructor(executor) {
        this.state = this.#statuses.PENDING;

        this.fulfilledCbs = [];
        this.rejectedCbs = [];

        this.isCanceled = false;
        this.executor = executor;
        executor(this.onResolve.bind(this), this.onReject.bind(this));
    }

    onResolve(value) {
        if (this.isCanceled) return;

        this.fulfilledCbs.pop()?.(value);
        this.value = value;
        this.state = this.#statuses.FULFILLED;

    }

    onReject(value) {
        if (this.isCanceled) return;

        this.rejectedCbs.pop()?.(value)
        this.value = value;
        this.state = this.#statuses.REJECTED;

    }

    then(onfulfilled, onrejected) {
        const isValidArgs = ["function", "undefined"].includes(typeof onfulfilled) && ["function", "undefined"].includes(typeof onrejected);

        if (!isValidArgs) {
            throw "invalid args"
        }


        this.fulfilledCbs[0] = (onfulfilled || (v => v))


        if (onrejected) {
            this.fulfilledCbs.push(onrejected)
        }

        const newPromise = new CancelablePromise(this.executor)

        if (this.isCanceled) {
            newPromise.cancel()
        }

        return newPromise;
    }

    catch(onrejected) {
        return this.then(undefined, onrejected)
    }

    cancel() {
        this.isCanceled = true;
    }
}


// const STATE = {
//     FULFILLED: "fulfilled",
//     REJECTED: "rejected",
//     PENDING: "pending",
// }
//
// export default class CancelablePromise {
//     #thenCbs = []
//     #catchCbs = []
//     #state = STATE.PENDING
//     #value
//     #onSuccessBind = this.#onSuccess.bind(this)
//     #onFailBind = this.#onFail.bind(this)
//
//     constructor(cb) {
//         try {
//             cb(this.#onSuccessBind, this.#onFailBind)
//         } catch (e) {
//             this.#onFail(e)
//         }
//     }
//
//     #runCallbacks() {
//         if (this.#state === STATE.FULFILLED) {
//             this.#thenCbs.forEach(callback => {
//                 callback(this.#value)
//             })
//
//             this.#thenCbs = []
//         }
//
//         if (this.#state === STATE.REJECTED) {
//             this.#catchCbs.forEach(callback => {
//                 callback(this.#value)
//             })
//
//             this.#catchCbs = []
//         }
//     }
//
//     #onSuccess(value) {
//         queueMicrotask(() => {
//             if (this.#state !== STATE.PENDING) return
//
//             if (value instanceof CancelablePromise) {
//                 value.then(this.#onSuccessBind, this.#onFailBind)
//                 return
//             }
//
//             this.#value = value
//             this.#state = STATE.FULFILLED
//             this.#runCallbacks()
//         })
//     }
//
//     #onFail(value) {
//         queueMicrotask(() => {
//             if (this.#state !== STATE.PENDING) return
//
//             if (value instanceof CancelablePromise) {
//                 value.then(this.#onSuccessBind, this.#onFailBind)
//                 return
//             }
//
//             if (this.#catchCbs.length === 0) {
//                 throw new UncaughtPromiseError(value)
//             }
//
//             this.#value = value
//             this.#state = STATE.REJECTED
//             this.#runCallbacks()
//         })
//     }
//
//     then(thenCb, catchCb) {
//         return new CancelablePromise((resolve, reject) => {
//             this.#thenCbs.push(result => {
//                 if (thenCb == null) {
//                     resolve(result)
//                     return
//                 }
//
//                 try {
//                     resolve(thenCb(result))
//                 } catch (error) {
//                     reject(error)
//                 }
//             })
//
//             this.#catchCbs.push(result => {
//                 if (catchCb == null) {
//                     reject(result)
//                     return
//                 }
//
//                 try {
//                     resolve(catchCb(result))
//                 } catch (error) {
//                     reject(error)
//                 }
//             })
//
//             this.#runCallbacks()
//         })
//     }
//
//     catch(cb) {
//         return this.then(undefined, cb)
//     }
// }
//
// class UncaughtPromiseError extends Error {
//     constructor(error) {
//         super(error)
//
//         this.stack = `(in promise) ${error.stack}`
//     }
// }