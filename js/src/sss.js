if (!window.console) {
    window.console = {
        info:  function() {},
        warn:  function() {},
        error: function() {},
        log:   function() {},
        debug: function() {},
        dir:   function() {},
    };
}

/*
    SSS
*/
var SSS = SSS || {};
/*
    SSS Utility Object
*/
SSS.util = {
    merge: function(first, second) {
        return $.extend({}, first, second);
    },

    camelize: function(name) {
        return name.replace(/\-(\w)/g, function(m, c) { return c.toUpperCase() });
    },


    percent2Pixel: function(value, target) {
        return target / 100 * value;
    },

    truncate: function(str, num) {
        if (!str) return;
        if (str.length <= 100) return str;
        return str.slice(0, num || 100) + '...';
    },
};
SSS.util.class = {
    create: function(props) {
        props = props || {};
        if (!props.init) props.init = function() {};

        var Klass = function() { this.init.apply(this, arguments) };
        for (var i in props) {
            Klass.prototype[i] = props[i];
        }

        Klass.prototype.constructor = Klass;
        return Klass;
    },

    singleton: function(BaseKlass) {
        var Klass, TmpKlass = function() {};
        Klass = function() {
            if (typeof Klass.__instance__ === 'object') return Klass.__instance__;
            Klass.prototype.init.apply(this, arguments);
            Klass.__instance__ = this;
        };

        TmpKlass.prototype          = BaseKlass.prototype;
        Klass.prototype             = new TmpKlass();
        Klass.prototype.constructor = Klass;

        return Klass;
    }
};
SSS.util.event = {
    map: {
        key: {
            // via: http://w3g.jp/blog/tools/jquery_browser_sniffing
            // TODO: 他でクロスブラウザ対応が必要な場合は切り出す
            type: $.support.checkOn && $.support.noCloneEvent && window.globalStorage ? 'keypress' : 'keydown',
            code: {
                ENTER:  13,
                HOME:   36,
                END:    35,
                LEFT:   37,
                TOP:    38,
                RIGHT:  39,
                BOTTOM: 40,
            },
        },
    },

    addListener: function(target, type, detail, handler) {
        target = target || document;

        // keyboard event
        if (type === 'key') {
            type = this.map.key.type;

            var keyCodes = detail.split('-');
            var isShift = isCtrl = isAlt = false;
            while (keyCodes.length > 1) {
                var w = keyCodes.shift().toUpperCase();
                if (w === 'SHIFT') isShift = true;
                if (w === 'CTRL')  isCtrl  = true;
                if (w === 'ALT')   isAlt   = true;
            }
            var keyCode = keyCodes.shift();
            keyCode = keyCode.match(/[0-9]+/) ? keyCode : this.map.key.code[keyCode.toUpperCase()];

            (function(isShift, isCtrl, isAlt, keyCode) {
                $(target).bind(type, function(event) {
                    // via: http://stackoverflow.com/questions/1900117/how-can-i-get-auto-repeated-keydown-events-in-firefox-when-arrow-keys-are-held-do
                    if (event.shiftKey !== isShift ||
                        event.ctrlKey  !== isCtrl  ||
                        event.altKey   !== isAlt   ||
                        (event.which || event.keyCode) !== keyCode) return;
                    handler.apply(this, arguments);
                });
            })(isShift, isCtrl, isAlt, keyCode);
        }
        // native event
        else {
            handler = $.isFunction(detail) ? detail : handler;
            $(target).bind(type, function(event) {
                handler.apply(this, arguments);
            });
        }

        return handler;
    },

    removeListener: function(target, type, witch, hander) {
        $(target).unbind(type, handler);
        return handler;
    },

    dispatch: function(target, type, data) {
        target = target || window;
        data   = $.isArray(data) ? data : [data];
        $(target).trigger(type, data);
    }
};

/*
    SSS Effect Class
*/
SSS.Effect = SSS.util.class.create({
    _defaultOption: {
        fade: {
            in:  { prop: { opacity: 'show' }, duration: 'fast' },
            out: { prop: { opacity: 'hide' }, duration: 'fast' },
        },
    },

    init: function(element, type, option) {
        this.element = element;
        this.type    = type || 'fade';
        this.option  = SSS.util.merge(this._defaultOption[this.type], option);
    },

    _animate: function(option) {
        $(this.element).animate(option.prop, option);
    },

    in: function(option) {
        this._animate(SSS.util.merge(this.option.in, option));
    },

    out: function(option) {
        this._animate(SSS.util.merge(this.option.out, option));
    }
});

/*
    SSS Page Class
*/
SSS.Page = SSS.util.class.create({
    init: function(id, content, presentation, effect) {
        this.id           = id;
        this.content      = content;
        this.presentation = presentation;

        if ($(this.content).hasClass('headline')) {
            this.type = 'headline';
        }
        else if ($(this.content).hasClass('subhead')) {
            this.type = 'subhead';
        }
        else if ($(this.content).hasClass('takahashi')) {
            this.type = 'takahashi';
        }
        else if ($(this.content).hasClass('code')) {
            this.type = 'code';
        }
        else if ($(this.content).hasClass('blank')) {
            this.type = 'blank';
        }
        else {
            this.type = 'default';
        }

        this.title    = $('h1, h2, h3, h4, h5, h6', this.content).text() || SSS.util.truncate($(this.content).text()) || '';

        this.disabled = $(this.content).hasClass('disabled') ? true : false;

        // effect instance
        this.effect = new SSS.Effect(this.content, effect);

        // render時のサイズ調整用
        // TODO: 外からsizeを指定できるようにする
        this.size = 10;
        this.render();

        $(this.content).hide();
    },

    render: function() {
        if (this.type === 'blank') return;

        this._adjustTextSize(this._size);
        this._adjustPosition();
    },

    // via: http://piro.sakura.ne.jp/xul/applications/takahashi-r/
    _adjustTextSize: function(size) {
        var content   = $(this.content);
        var container = $(this.presentation.container);
        var offset    = this.presentation.offset;

        if (this.type === 'code') {
            offset = { top: 0, right: 0, bottom: 0, left: 0 };
        }

        // 10pxだとブラウザの最小フォントサイズに引っかかりやすいので30pxを基準にした
        content.removeAttr('style').css({ fontSize: '30px' });

        var containerW = container.width() - (offset.left + offset.right);
        var contentW   = content.width();

        var fontSize = Math.round(containerW / (contentW / 3) * (this.size));
        content.css({ fontSize: fontSize + 'px' });

        var containerH = container.height() - (offset.top + offset.bottom);
        var contentH   = content.height();
        if (contentH >= containerH) {
            var fontSize = Math.round(containerH / contentH * fontSize);
            content.css({ fontSize: fontSize + 'px' });
        }
    },

    _adjustPosition: function() {
        var content   = $(this.content);
        var container = $(this.presentation.container);

        var x, y;
        if (this.type === 'headline' || this.type === 'subhead' || this.type === 'takahashi' || this.type === 'code') {
            var containerW = container.width();
            var contentW   = content.width();
            var x          = Math.round((containerW - contentW) / 2);

            var containerH = container.height();
            var contentH   = content.height();
            var y          = Math.round((containerH - contentH) / 2);
        }
        else if (this.type === 'default') {
            var offset = this.presentation.offset;
            var x      = offset.left;
            var y      = offset.top;
        }

        content.css({ left: x + 'px', top: y + 'px' });
    },

    active: function(effectOption) {
        var that = this;

        effectOption = effectOption || {};
        var complete = effectOption.complete || function() {};
        effectOption.complete = function() {
            $(that.content).addClass('current');
            complete();
        };

        this.effect.in(effectOption);
        return this;
    },

    inactive: function(effectOption) {
        var that = this;

        effectOption = effectOption || {};
        var complete = effectOption.complete || function() {};
        effectOption.complete = function() {
            $(that.content).removeClass('current');
            complete();
        };

        this.effect.out(effectOption);
        return this;
    }
});

/*
    SSS Presentation Class (Singleton)
*/
SSS.Presentation = SSS.util.class.create({
    init: function(startIndex, pageElements, containerElement, offset) {
        var that = this;

        // index
        this.currentIndex = this.prevIndex = startIndex || 0;

        // container element
        this.container = $(containerElement || 'div#content')[0];

        var containerW = $(this.container).width();
        var containerH = $(this.container).height();

        // offset
        this.offset        = offset || {};
        this.offset.top    = this.offset.top || SSS.util.percent2Pixel(6, containerH);
        this.offset.right  = this.offset.right || SSS.util.percent2Pixel(2, containerW);
        this.offset.bottom = this.offset.bottom || SSS.util.percent2Pixel(10, containerH);
        this.offset.left   = this.offset.left || SSS.util.percent2Pixel(2, containerW);

        // page elements
        this._pages = [];
        $(pageElements || 'div#content > div.page').each(function() {
            var page = new SSS.Page(that._pages.length, this, that);
            that.addPage(page);
        });
        this.size = this._pages.length;

        SSS.util.event.dispatch(window, 'SSSPresentationInitialize', this);
    },

    start: function() {
        this._pages[this.currentIndex].active();
        SSS.util.event.dispatch(window, 'SSSPresentationStart', [this, this._pages[this.currentIndex]]);
    },

    addPage: function(page) {
        if (page.disabled) return;
        this._pages.push(page);
        return this;
    },

    getPage: function(index) {
        return this._pages[index];
    },

    removePage: function() {
        // TODO: ページの削除ロジックを書く（index調整も含む）
    },

    addListener: function(type, label, method) {
        var that = this;

        if (!method) {
            method = label;
            label  = undefined;
        }
        if (!this[method]) return;

        return SSS.util.event.addListener(window, type, label, function() {
            that[method].apply(that, arguments);
        });
    },

    first: function() {
        var page = this.go(0);
        SSS.util.event.dispatch(window, 'SSSPresentationFirst', [this, page]);
    },

    last: function() {
        var page = this.go(this.size - 1);
        SSS.util.event.dispatch(window, 'SSSPresentationLast', [this, page]);
    },

    next: function() {
        var page = this.go(this.currentIndex + 1);
        SSS.util.event.dispatch(window, 'SSSPresentationNext', [this, page]);
    },

    prev: function() {
        var page = this.go(this.currentIndex - 1);
        SSS.util.event.dispatch(window, 'SSSPresentationPrev', [this, page]);
    },

    go: function(next) {
        this.prevIndex = this.currentIndex;
        if (next <= 0) {
            next = 0;
        }
        else if (next >= this.size) {
            next = this.size - 1;
        }
        if (this.prevIndex === next) return;

        this.action(this.prevIndex, next);

        this.currentIndex = next;
        SSS.util.event.dispatch(window, 'SSSPresentationChangePage', [this]);

        return this._pages[this.currentIndex];
    },

    action: function(prev, next) {
        prev = this._pages[prev];
        prev.inactive(function() {});

        next = this._pages[next];
        next.active(function() {});
    }
});
SSS.Presentation = SSS.util.class.singleton(SSS.Presentation);
