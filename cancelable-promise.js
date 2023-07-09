export default class CancelablePromise {
    constructor(executor) {
        this.fulfilledCb = null;
        this.rejectedCb = null;

        this.isFulfilled = false;
        this.isCanceled = false;

        this.childrens = [];
        this.parent = null;
        this.resolvesByPromise = false;

        executor(this.onResolve.bind(this), this.onReject.bind(this));
    }

    onResolve(value) {
        this.isFulfilled = true;
        this.value = value;

        if (this.isCanceled) {
            this.onReject({isCanceled: true})
            return;
        }

        const cbResult = this.fulfilledCb?.(value);

        if (cbResult instanceof Promise) {
            this.childrens.forEach(child => child.resolvesByPromise = true)
            cbResult
                .then(res => this.childrens?.forEach(children => children.onResolve(res)))
                .catch(reason => (
                    this.childrens.forEach(children => children.onResolve(children.rejectedCb(reason)))
                ))
        } else {
            this.childrens
                .filter(({resolvesByPromise}) => !resolvesByPromise)
                .forEach(children => children.onResolve(cbResult))
        }
    }

    onReject(value) {
        this.rejectedCb && this.rejectedCb(value)
        this.childrens.forEach(child => child.onResolve(value))
    }

    then(onfulfilled, onrejected) {
        this.#checkValidThenArguments({onfulfilled, onrejected})
        const newPromise = this.#createChild(onrejected);

        this.fulfilledCb = (onfulfilled || (v => v));
        this.rejectedCb = onrejected ?? null;

        if (this.isFulfilled) {
            this.onResolve(this.value);
        }

        return newPromise;
    }

    cancel() {
        this.parent?.cancel();
        this.isCanceled = true;
    }

    #createChild(onReject) {
        const child = new CancelablePromise(() => {
        });
        child.parent = this;
        child.rejectedCb = onReject;

        this.childrens.push(child);
        return child;
    }

    #checkValidThenArguments(args) {
        Object.values(args).forEach(arg => {
            if (!["function", "undefined"].includes(typeof arg)) throw "invalid arguments"
        })
    }
}
