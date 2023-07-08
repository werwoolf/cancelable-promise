// class CancelablePromise {
export default class CancelablePromise {
    #statuses = {
        PENDING: "pending",
        FULFILLED: "fulfilled",
        REJECTED: "rejected"
    }

    constructor(executor, name) {
        // console.log("created: ", name)
        this.state = this.#statuses.PENDING;
        this.name = name
        this.fulfilledCb = null;
        this.rejectedCb = null;

        this.isCanceled = false;

        this.childrens = [];

        executor(this.onResolve.bind(this), this.onReject.bind(this));
    }

    onResolve(value) {
        // console.log(`onResolve: ${this.name}`, {value})
        this.state = this.#statuses.FULFILLED;
        this.value = value;
        if (this.isCanceled || !this.fulfilledCb) {
            // console.log("skip execution: ", this)
            return
        }

        const cbResult = this.fulfilledCb?.(value);

        if (cbResult instanceof Promise) {
            // console.log("trigger children PROMISE resolve", this.name)
            cbResult.then(res => this.childrens?.forEach(children => children.onResolve(res)))
        } else {
            // console.log("trigger children SYNC resolve", this.name)
            this.childrens.forEach(children => children.onResolve(cbResult))
        }
    }

    onReject(value) {
        if (this.isCanceled) return;

        if (this.childrens.length) {
            this.childrens?.forEach(child => child.onReject(value))
        } else {
            this.rejectedCb?.(value)
        }

        this.state = this.#statuses.REJECTED;
    }

    then(onfulfilled, onrejected) {

        const isValidArgs = ["function", "undefined"].includes(typeof onfulfilled) && ["function", "undefined"].includes(typeof onrejected);
        if (!isValidArgs) {
            throw "invalid args"
        }

        const newPromise = new CancelablePromise((res, rej) => {
        }, this.name + 1)

        this.childrens.push(newPromise);

        if (onfulfilled) {
            // newPromise.fulfilledCbs.push()
            this.fulfilledCb = (onfulfilled || (v => v))
        }

        if (onrejected) {
            newPromise.rejectedCb = onrejected;
            this.rejectedCb = onrejected;
        }

        if (this.isCanceled) {
            newPromise.cancel()
        }

        if (this.state === this.#statuses.FULFILLED) {
            this.onResolve(this.value)
        }

        return newPromise;
    }

    // catch(onrejected) {
    //     const isValidArgs = ["function", "undefined"].includes(typeof onrejected);
    //
    //     if (!isValidArgs) {
    //         throw "invalid args"
    //     }
    //
    //     if (onrejected) {
    //         this.rejectedCbs.push(onrejected)
    //     }
    // }

    cancel() {
        this.isCanceled = true;
    }
}

const initValue = 10
const multiplier = 2
const onFulfilled = value => value * multiplier

const cp = new CancelablePromise(resolve => resolve(initValue), 1);

const cp2 = cp.then(v => {
    return new Promise(resolve => setTimeout(() => resolve(onFulfilled(v))))
});

const cp3 = cp.then(console.log);

const cp4 = cp2.then(console.log);


// console.log({
//     cp, cp2, cp3, cp4
// })