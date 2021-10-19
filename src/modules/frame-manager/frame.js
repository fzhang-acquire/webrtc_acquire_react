import MicroEmitter from 'core/helpers/micro_emitter';

export default class Frame extends MicroEmitter {
    constructor(doc= null) {
        super();
        this.id = null;
        this.manager = null;

        this._iframe = null;

        this.iframe = (frame = 'NA') => {
            if(frame === 'NA'){
                return this._iframe;
            }
            return this.change(frame);
        }

        this.window = doc ? doc.defaultView : null;
        this.document = doc;
        this.trigger('document-update');
    }

    reloadFromWindow() {
        window.location.href = window.location.href;
    }

    reload(url= null) {
        if (this.window()) {
            this.window().location.href = url || this.window().location.href;
        }
    }

    static isInTree(element) {
        if (!element || !element.parentNode) { // fail fast
            return false;
        }
        if (element.contains && element.ownerDocument) {
            return element.ownerDocument.body.contains(element);
        }
        // @ts-ignore
        const id = element.id || generateRandomId();
        element.id = id;
        return element.ownerDocument.getElementById(id) !== null;
    }


    static onLoad(iframe, cb) {
        // we need iframe document asap no matter its loaded or not..

        const check = () => {
            if (!Frame.isInTree(iframe)) {
                return;
                // return console.error('non-tree iframe onload event');
            }

            const win = iframe.contentWindow;

            // console.log("iframe onload");
            const checkDoc = () => {
                if (win.document.readyState == 'complete' || win.document.readyState == 'complete') {
                    // console.log("iframe onload ccc");
                    cb(win, win.document);
                } else {
                    /// console.log("iframe onload");
                    win.document.addEventListener('DOMContentLoaded', event => {
                        // console.log("iframe onload later");
                        cb(win, win.document);
                    });
                }
            };
            try {
                if (win && win.document) {
                    // @ts-ignore
                    checkDoc(win.document);
                }

                if (win) {
                    const fn = () => {
                        cb(null, null);
                        // console.error('iframe beforeunload');
                        // console.error(win.document);
                    }
                    win.addEventListener('beforeunload', fn);
                    win.addEventListener('unload', fn);
                }
            } catch (e) {
                console.error('iframe access denied');
                console.error(e);
                cb(null, null);
            }
        };

        iframe.addEventListener('load', check);
        check();
    }

    // return doc always..
    doc(cb) {
        if (this.document) {
            cb(this.document);
        }
        return this.on('document-update', cb);
    }

    change(iframe, allow_about_blank= false) {

        if (iframe == null) {
            return;
        }

        if (iframe.__binded_frame_manager) {
            return;
        }// console.error("changing same iframe:");

        iframe.__binded_frame_manager = true;

        // console.log('Switching iframe: '+iframe.getAttribute('src'));
        // skip_aboutblank=iframe.getAttribute('src')!=='about:blank';
        // console.error("changing iframe");

        if (this._iframe() !== iframe) {
            this.window(null);
            this.document = null;
            this._iframe = iframe;
            this.trigger('document-update');
        }

        Frame.onLoad(iframe, (win, doc) => {
            if ((!win || win.location.href === 'about:blank') && !allow_about_blank) {
                this.window._deferUpdates = false;
                this.document._deferUpdates = false;
                this.window = null;
                this.document = null;
                this.trigger('document-update');
                return;
            }
            // console.log("FRMAE: LOAD : Location: "+win.location.href);

            if (this._iframe !== iframe) {
                this._iframe = iframe;
            }
            if (this.document !== doc) {
                this.document = doc;
                this.trigger('document-update');
            }
            if (this.window !== win) {
                this.window = win;
            }
            this.trigger('load', this);
        });
    }
}
