export default class CancelablePromise {
    #statuses = {
        PENDING: "pending",
        FULFILLED: "fulfilled",
        REJECTED: "rejected"
    }

    constructor(executor) {
        this.state = this.#statuses.PENDING;
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

        if (this.isCanceled) {
            this.onReject({ isCanceled: true })
            return
        }

        const cbResult = this.fulfilledCb?.(value);

        if (cbResult instanceof Promise) {
            this.childrens.forEach(child => child.resolvesByPromise = true)
            cbResult
                .then(res => this.childrens?.forEach(children => children.onResolve(res, "in promise")))
                .catch((reason) => {
                    this.childrens.forEach(children => children.onResolve(children.rejectedCb(reason), "in promise"))
                })
        } else {
            this.childrens
                .filter(({resolvesByPromise}) => !resolvesByPromise)
                .forEach(children => children.onResolve(cbResult, "sync"))
        }
    }

    onReject(value, isParent) {
        this.state = this.#statuses.REJECTED;

        if (this.rejectedCb) {
            this.rejectedCb(value)
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
        const isValidArgs = ["function", "undefined"].includes(typeof onfulfilled) && ["function", "undefined"].includes(typeof onrejected);
        if (!isValidArgs) {
            throw "invalid args"
        }

        const newPromise = new CancelablePromise(() => {})

        newPromise.parent = this;
        this.childrens.push(newPromise);
        this.fulfilledCb = (onfulfilled || (v => v))

        if (onrejected) {
            newPromise.rejectedCb = onrejected;
            this.rejectedCb = onrejected;
        }

        if (this.isCanceled) {
            newPromise.isCanceled = true;
        }

        if (this.state === this.#statuses.FULFILLED) {
            this.onResolve(this.value)
        }

        return newPromise;
    }

    cancel() {
        this.parent?.cancel()
        this.isCanceled = true;
    }
}
