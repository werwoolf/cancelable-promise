export default class CancelablePromise {
    #statuses = {
        PENDING: "pending",
        FULFILLED: "fulfilled",
        REJECTED: "rejected"
    }

    constructor(executor, name = 1) {
        // console.log("created: ", name)
        this.state = this.#statuses.PENDING;
        this.name = name
        this.fulfilledCb = null;
        this.rejectedCb = null;

        this.isCanceled = false;

        this.childrens = [];
        this.resolvesByPromise = false;
        executor(this.onResolve.bind(this), this.onReject.bind(this));
    }

    onResolve(value, cause) {
        // console.log("onResolve", this.name)
        this.state = this.#statuses.FULFILLED;
        this.value = value;

        if (this.isCanceled) return;

        // console.log("call callback", this.name, " ", cause)
        const cbResult = this.fulfilledCb?.(value);

        if (cbResult instanceof Promise) {
            // console.log("trigger children PROMISE resolve", this.name)
            this.childrens.forEach(child => {
                child.resolvesByPromise = true;
            })
            cbResult.then(res => this.childrens?.forEach(children => children.onResolve(res, "in promise")))
        } else {
            // console.log("trigger children SYNC resolve", this.name)
            this.childrens.filter(({resolvesByPromise}) => !resolvesByPromise).forEach(children => children.onResolve(cbResult, "sync"))
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
        // console.log(this.name)
        const isValidArgs = ["function", "undefined"].includes(typeof onfulfilled) && ["function", "undefined"].includes(typeof onrejected);
        if (!isValidArgs) {
            throw "invalid args"
        }

        const newPromise = new CancelablePromise((res, rej) => {
        }, this.name + 1)

        this.childrens.push(newPromise);

        this.fulfilledCb = (onfulfilled || (v => v))

        if (onrejected) {
            newPromise.rejectedCb = onrejected;
            this.rejectedCb = onrejected;
        }

        if (this.isCanceled) {
            newPromise.cancel()
        }

        if (this.state === this.#statuses.FULFILLED) {
            // console.log("resol")
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

