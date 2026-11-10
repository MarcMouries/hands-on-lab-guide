api.controller = function ($location, $timeout) {
    var c = this;

    // Participants are sent to their plan list. Facilitators never get here:
    // the role-scoped sp_page_route_map redirects them before this renders.
    if (c.data && c.data.redirectToPage) {
        $timeout(function () {
            $location.search('id', c.data.redirectToPage);
        });
    }
};
