import MicroEmitter from 'core/helpers/micro_emitter';
import Frame from './frame';


export default class FrameMananger extends MicroEmitter {

    constructor(app) {
        super();
        this.app = app;

        this.main_frame = new Frame(document); // id=>viewframe
        this.main_frame.manager = this;
        // this.view_frames=ko.observableArray(); // id=>viewframe

        this.inside_frame = false;
    }

    alert(text) {

    }
    confirm(text, cb) {

    }

    showMinPopup() {
        const $f = document.createElement('div');
        $f.innerHTML = '<iframe ' +
                'style="opacity: 0;z-index: 10000000; position: fixed; left: -100%" ' +
                'id="tg_uipopupalert_frame" ' +
                'src="about:blank"></iframe>';


        $f.querySelector('frame').addEventListener('load', e => {

            try {
                const doc = $f.contentWindow.document;
                doc.querySelector('*');
            } catch (e) {
                this.app.clientStorage.set('tagove-iframe-load-disabled', 1);
                if (type === 'cobrowse')
                    this.trigger('frame-load-cobrowse', true);

                console.error('iframes not supported');
                console.error(e);
                return;
            }
        });

        document.querySelector('body').append($f);
    }

    getBlankFrame() {
        const x = new Frame();
        x.manager = this;
        return  x;
    }

    // uiShouldUseUI
    canLoadInFrame(type= 'cobrowse') {
        if (this.app.accountId === '25fa1')
            return false;

        if (this.app.clientStorage.get('tagove-iframe-load-disabled', 0) === '1')
            return false;

        if (this.app.type === 'backend' || typeof window.acquire_iso !== 'undefined')
            return false;

        if (this.app.parserResult && this.app.parserResult.browser.name === 'Mobile Safari')
            return false;

        if (this.app.iframeClient())
            return false;
        return true;
    }

    // uiPageLoaded
    isItFrameWindow() {
        return this.inside_frame === true;
    }

    // uiCheckUiReload
    checkOperation(type= 'webrtc', cb, force= false) {
        if ((!force && !this.canLoadInFrame(type)) || this.inside_frame === true)
            return cb(false);

        if (type === 'webrtc')
            cb(false);
        else
            this.once('frame-load-' + type, cb);



        if (this.inside_frame === null)
            return;
        this.inside_frame = null;

        let url =  window.location.href.split('#')[0];
        const urlhash = window.location.hash;
        url = url.replace('&_f=1', '').replace('?_f=1', '');
        url = (url.split('#')[0].indexOf('?') >= 0 ? url + '&_f=1' : url + '?_f=1') + (urlhash);

        const $f = document.createElement('iframe');
        $f.setAttribute('style', 'opacity: 0;z-index: 10000000;display:block; position: fixed; left: -100%');
        $f.setAttribute('id', 'tg_ui_frame');
        $f.setAttribute('src', `${url}`);


        let state_pop_skip = 0;

        window.onpopstate = event => {
            if (event.state && event.state._tagove && $f) {
                state_pop_skip++;
                $f.setAttribute('src', event.state._tagove);
            }
        };
        if (this.app.isIOS) {
            $f.style.overflow = this.app.isIOS ? 'auto' : 'hidden';
            $f.style['-webkit-overflow-scrolling'] = 'touch'
        }
        $f.src = url;

        if (type === 'webrtc')
            this.trigger('frame-load-webrtc', true);

        let aboutblank = false;
        const on_load = e => {
            if (aboutblank)
                return;

            const on_read_load = (allowBlank= false) => {
                this.main_frame.change($f[0], allowBlank);
                this.main_frame.doc(doc => {
                    // console.error("main frame doc load event..."+doc);
                    if (doc) {
                        const win = doc.defaultView;
                        if (window.history) {
                            if (state_pop_skip === 0) {
                                document.title = doc.title;
                                const ud = win.location.href.replace('&_f=1', '').replace('?_f=1', '');
                                try {
                                    history.pushState({_tagove: ud}, doc.title, ud);
                                } catch (e) {}
                            } else state_pop_skip--;
                        }

                        try {

                            document.querySelectorAll('body :not(' + [
                                '#tagove-base' ,
                                '.tagove_frame' ,
                                '.aio-widget-frame',
                                '.cobrowsing-secure-border',
                                '.cobrowsing-secure-border *',
                                '#tagove-new',
                                '#acquire-layout',
                                '#acquire-layout *',
                                '#acquire-rtc',
                                '#acquire-rtc *',
                                '#acquire-launcher--unread',
                                '#acquire-launcher--unread *',
                                '.acquire-livechat-widget',
                                '.acquire-livechat-widget *',
                                '#tagove-standard',
                                '.tgStyle',
                                '#tgStyle',
                                '#tgStyle *',
                                '.tgCobClose',
                                '.tgCobClose *',
                                '.tg-url.bar',
                                '.tg-url.bar *',
                                '.tagove-livechat-widget-popup' ,
                                '.tagove-citibank' ,
                                '.tagove-livechat-widget-popup *' ,
                                '#tg_ui_frame',
                                '#tagove-base *' ,
                                '.tagove-livechat-widget' ,
                                '.tagove-livechat-widget *' ,
                                '.tagove_cookie' ,
                                '.tagove_cookie *' ,
                                '#tagove-self-developed' ,
                                '#tagove-self-developed *' ,
                                '#tagove-new' ,
                                '#tagove-new *',
                            ].join(', ') + ')').forEach((elem) => elem.remove());

                        } catch (e) {
                            console.log(e);
                        }

                        // remove comments
                        let i = document.body.childNodes.length;
                        while (i--) {
                            const e = document.body.childNodes[i];
                            if (e && e.nodeType === 3) {
                                document.body.removeChild(e);
                            }
                        }

                        document.querySelectorAll('body, html').forEach((elem) => {
                            let bodyCss = {
                                'min-height' : window.innerHeight,
                                height: '100%',
                                width: '100%',
                                margin: 0,
                                padding: 0,
                                border: 'none',
                                overflow: this.app.isIOS ? 'auto' : 'hidden',
                                '-webkit-overflow-scrolling': 'touch',
                            };

                            for (let prop in bodyCss) {
                                $f.style[prop] = bodyCss[prop];
                                elem.style[prop] = bodyCss[prop];
                            }

                        });

                        if($f) {
                            $f.style.opacity = '1';
                            $f.style.position = 'static';
                            $f.style.height = window.innerHeight + ' !important';
                            $f.style.width = window.innerWidth + ' !important';
                        }

                        const resizeHandler = () => {
                            if ($f && $f.classList.contains('tgnoresizecheck'))
                                return;
                            if($f) {
                                $f.style.height = window.innerHeight + ' !important';
                                $f.style.width =  window.innerWidth + ' !important';
                            }
                        };

                        window.addEventListener('resize', resizeHandler);
                        resizeHandler();
                        if (this.app.isIOS) {
                            document.querySelectorAll('body, html').forEach((elem) => {
                                elem.style.overflow = this.app.isIOS ? 'auto' : 'hidden';
                                elem.style['-webkit-overflow-scrolling'] = 'touch';
                            });
                        }

                        this.trigger('frame-load', false);
                        this.inside_frame = true;
                    }
                });

                if (type === 'cobrowse')
                    this.trigger('frame-load-cobrowse', true);

                $f.removeEventListener('load', on_load);
            };

            const on_error = () => {
                console.error('iframes not supported');
                console.error(e);
                this.app.clientStorage.set('tagove-iframe-load-disabled', 1);
                if (type === 'cobrowse')
                    this.trigger('frame-load-cobrowse', true);
                $f.removeEventListener('load', on_load);
            };
            try {
                const doc = $f.contentWindow.document;
                doc.querySelector('*');
                on_read_load();
            } catch (e) {
                if (!force) {
                    this.app.clientStorage.set('tagove-iframe-load-disabled', 1);
                    if (type === 'cobrowse')
                        this.trigger('frame-load-cobrowse', true);

                    console.error('iframes not supported');
                    console.error(e);
                    return;
                }
                if (!aboutblank) {
                    aboutblank = true;
                    console.error('iframes not supported, switching to about:blank');
                    console.error(e);

                    $f.setAttribute('src', 'about:blank');
                    setTimeout(() => {
                        let fine;
                        try {
                            fine = $f.contentDocument;
                        } catch (e) {
                            on_error();
                            return;
                        }
                        if (fine) {
                            on_read_load(true);
                        }
                    }, 1000);
                } else on_error();
            }
        };
        $f.addEventListener('load', on_load);
        document.querySelector('body').appendChild($f);
    }


    getPopUP(name, body, cb, width= 600, height= 490) {

        const frame = document.querySelector('#tgpop-' + name);

        if (frame) {
            cb(frame, frame.contentWindow.document.querySelector('body'));
        } else {

            const css = {
                border: 'none',
                position: 'fixed',
                display: 'none',
                background: 'transparent',
                zIndex: '2147483647',
                'z-index': '2147483647',
            };
            const xx = document.createElement('iframe');
            xx.setAttribute('id', `tgpop-${name}`);
            xx.src = 'about:blank';
            xx.setAttribute('style',)

            for (let prop in css) {
                xx.style[prop] = css[prop];
            }
            document.querySelector('body').appendChild(xx);
            const doc = xx.contentWindow.document;
            doc.open();
            doc.write(body);
            doc.close();
            cb(xx, doc.querySelector('body'));

            const onresize = () => {
                let w = width;
                let h = height;

                if (window.innerWidth < width)
                    w = window.innerWidth;
                if (window.innerHeight < height)
                    h = window.innerHeight;

                const top = window.innerHeight === h ? 0 : (window.innerHeight - (h)) / 2;
                const left = window.innerWidth === w ? 0 : (window.innerWidth - (w)) / 2;

                const rzCss = {
                    top: top + 'px',
                    left: left + 'px',
                    width: w,
                    height: h,
                };
                for (let prop in rzCss) {
                    xx.style[prop] = rzCss[prop];
                }
            };
            window.addEventListener('resize', onresize, false);
            onresize();
        }
    }

    uiPageUrlGetWithoutUI() {
        const url = window.location.href;
        return url.replace('?_ui_tg_sync', '').replace('&_ui_tg_sync', '')
                .replace('?_ui_tg_loaded', '').replace('&_ui_tg_loaded', '');
    }

    uiPageUrlGetWithUI() {

        return window.location.href;

        const url = window.location.href;
        if (url.indexOf('_ui_tg_sync') >= 0)
            return url;
        if (url.indexOf('?') > 0)
            return url + '&_ui_tg_sync';
        else
            return url + '?_ui_tg_sync';
    }

}
