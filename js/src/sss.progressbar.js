SSS.ProgressBar = SSS.util.class.create({
    init: function(prefix) {
        var that = this;
        var pr   = new SSS.Presentation();

        // max page
        this.max = pr.size;

        // label prefix
        this.prefix = prefix || 'NEXT';

        $([
            '<div id="progress-container">',
            '<div id="progress-bar"></div>',
            '<div id="progress-label"></div>',
            '</div>'
        ].join('')).hide().insertAfter(pr.container);

        this.container = $('#progress-container')[0];
        this.bar       = $('#progress-bar')[0];
        this.label     = $('#progress-label')[0];

        this.effect = new SSS.Effect(this.container);
        this.effect.in();

        var handler = function(event, pr) {
            that.render(pr.currentIndex, pr);
        };

        // event listener
        SSS.util.event.addListener(window, 'SSSPresentationStart', handler);
        SSS.util.event.addListener(window, 'SSSPresentationNext',  handler);
        SSS.util.event.addListener(window, 'SSSPresentationPrev',  handler);
        SSS.util.event.addListener(window, 'SSSPresentationFirst', handler);
        SSS.util.event.addListener(window, 'SSSPresentationLast',  handler);
        SSS.util.event.addListener(window, 'SSSPresentationChangePage', handler);
    },

    render: function(index, pr) {
        // adjust bar width
        var size = Math.round(100 / (this.max - 1) * index);
        $(this.bar).css({ width: size + '%' });

        var page = pr.getPage(index + 1);

        var text = '[' + (index + 1) + '/' + this.max + ']';
        text += index < this.max && page ? ' [' +  this.prefix + '] ' + page.title : '';
        $(this.label).text(text);
    }
});
SSS.ProgressBar = SSS.util.class.singleton(SSS.ProgressBar);
