/*import PopUpFrameHTML from '../../../views/popup/frame_popup.html';
import popupCSS from '../../../views/popup/popup.css';
import PopUpHTML from '../../../views/popup/popup.html';
import Templates from '../../../views/templates.html';*/
import appendStyle from 'core/helpers/appendStyle';
import MicroEmitter from 'core/helpers/micro_emitter';

export default class PopupMananger extends MicroEmitter {
    constructor(app) {
        super();
        this.app = app;

        this.sections = [];
        this.active = null;
        this.bare_ui = false;

        /*this.sections.subscribe(() => {
            if (this.sections().length > 0) {
                this.openPopup();
                //  if (this.active()==null || this.sections().indexOf(this.active())<0)
                this.active(this.sections()[this.sections().length - 1]);
            } else {
                this.closePopup();
            }
        });*/
        this.popup_iframe = null;
    }

    openPopup() {

        if (this.popup_main == null) {
            this.popup_main = document.createElement('div');
            this.popup_main.classList.add('tagove-livechat-widget-popup');
            this.popup_main.classList.add((
                    'pos_' +
                    (this.app.settings() && this.app.settings().widget_position ? this.app.settings().widget_position : 'br')
            ));

            //this.popup_main.innerHTML = PopUpFrameHTML;

            this.popup_iframe = this.popup_main.querySelector('iframe');

            let loaded = false;
            this.popup_iframe.addEventListener('load', () => {
                this.popup_window = this.popup_iframe.contentWindow;
                this.popup_document = this.popup_iframe.contentDocument || this.popup_iframe.contentWindow.document;
                if (this.popup_window && this.popup_document) {
                    if (loaded) {
                        return;
                    }
                    loaded = true;
                    this.popup_document.querySelector('head').innerHTML = '<meta http-equiv="X-UA-Compatible" content="IE=edge">';
                    this.popup_document.querySelector('body').innerHTML = PopUpHTML + '<br/>' + Templates;

                    const doc = document.createElement('link');
                    doc.href = 'https://' + this.app.nodeServer() + '/cobrowse/cobrowse.css';
                    doc.rel = 'stylesheet';
                    this.popup_document.head.appendChild(doc);

                    appendStyle(popupCSS + this.app.settings().custom_css, this.popup_document.querySelector('body'), this.popup_document);

                    //applyBindings(this.app, this.popup_document.body);
                }
            });

            const loadTheme = () => {
                document.body.appendChild(this.popup_main);
            };

            // this.app.frameMananger.isItFrameWindow()) {
            //    setTimeout(loadTheme, 1000);
            // } else {
            loadTheme();
            // }
        }
    }

    closePopup() {
        if (this.popup_window) {
            delete this.popup_window;
        }
        if (this.popup_document) {
            delete this.popup_document;
        }
        if (this.popup_iframe && this.popup_iframe.parentNode) {
            this.popup_iframe.parentNode.removeChild(this.popup_iframe);
            delete this.popup_iframe;
        }
        if (this.popup_main && this.popup_main.parentNode) {
            this.popup_main.parentNode.removeChild(this.popup_main);
            delete this.popup_main;
        }
    }

    addSection(section) {
        this.sections.push(section);
    }
    removeSection(section) {
        this.sections.remove(section);
    }

}
