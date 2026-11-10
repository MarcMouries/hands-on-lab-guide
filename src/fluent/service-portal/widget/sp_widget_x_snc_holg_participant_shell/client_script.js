api.controller = function ($location, $element, $timeout) {
    var c = this;

    // Pass the portal page's URL parameters (and the configured page label)
    // through to the React app. The React entry reads window.__X_SNC_HOLG__
    // first, then the data-holg attribute on the root node.
    var context = {
        page: (c.options && c.options.page_name) || 'Participant Lab',
        params: $location.search() || {}
    };

    window.__X_SNC_HOLG__ = context;

    $timeout(function () {
        var root = $element[0].querySelector('#react-root');
        if (root) {
            root.setAttribute('data-holg', JSON.stringify(context));
        }

        var script = document.createElement('script');
        script.type = 'module';
        script.src = '/uxasset/externals/x_snc_holg/participant.jsdbx?uxpcb=' + new Date().getTime();
        document.head.appendChild(script);
    });
};
