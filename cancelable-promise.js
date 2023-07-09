export default class CancelablePromise {
// class CancelablePromise {
    #statuses = {
        PENDING: "pending",
        FULFILLED: "fulfilled",
        REJECTED: "rejected"
    }

    constructor(executor, name = 1) {
        // console.log("created: ", name)
        this.state = this.#statuses.PENDING;
        this.name = name;
        this.fulfilledCb = null;
        this.rejectedCb = null;

        this.isCanceled = false;

        this.childrens = [];
        this.parent = null;
        this.resolvesByPromise = false;
        executor(this.onResolve.bind(this), this.onReject.bind(this));
    }

    onResolve(value, cause) {

        this.state = this.#statuses.FULFILLED;
        this.value = value;

        if (this.isCanceled) return;

        const cbResult = this.fulfilledCb?.(value);

        if (cbResult instanceof Promise) {
            this.childrens.forEach(child => child.resolvesByPromise = true)
            cbResult
                .then(res => this.childrens?.forEach(children => children.onResolve(res, "in promise")))
                .catch((reason) => {

                    const cbResult = this.rejectedCb(reason)

                    this.childrens?.forEach(children => children.onResolve(cbResult, "in promise"))
                })
        } else {
            // console.log("trigger children SYNC resolve", this.name)
            this.childrens
                .filter(({resolvesByPromise}) => !resolvesByPromise)
                .forEach(children => children.onResolve(cbResult, "sync"))
        }
    }

    onReject(value, isParent) {
        this.state = this.#statuses.REJECTED;


        if (this.rejectedCb){
            this.rejectedCb(value)
            // return
        }

        if (this.childrens.length) {
            for (let child of this.childrens) {
                if (child.fulfilledCb) {
                    child.onResolve(value)
                    break
                }
            }
        }

    }

    then(onfulfilled, onrejected) {
        // console.log(this.name)
        const isValidArgs = ["function", "undefined"].includes(typeof onfulfilled) && ["function", "undefined"].includes(typeof onrejected);
        if (!isValidArgs) {
            throw "invalid args"
        }

        const newPromise = new CancelablePromise((res, rej) => {
        }, this.name + 1)

        newPromise.parent = this;

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
            this.onResolve(this.value)
        }

        return newPromise;
    }

    catch(onrejected) {
        const isValidArgs = ["function", "undefined"].includes(typeof onrejected);

        if (!isValidArgs) {
            throw "invalid args"
        }

        return this.then(undefined, onrejected)
    }

    cancel() {
        this.parent?.cancel()
        this.isCanceled = true;
    }
}
