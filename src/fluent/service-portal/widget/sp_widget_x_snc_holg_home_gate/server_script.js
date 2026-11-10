(function () {
    /* Role-based landing.
     *
     * Facilitator is checked FIRST and wins: an admin (or anyone holding both
     * app roles) must land on the facilitator dashboard, not the participant
     * plan list. This widget is authoritative for the redirect so the outcome
     * does not depend on whether the sp_page_route_map resolves for a bare
     * /holg request with no explicit ?id. */
    if (gs.hasRole('x_snc_holg.facilitator')) {
        data.redirectToPage = 'facilitator';
    } else if (gs.hasRole('x_snc_holg.participant')) {
        data.redirectToPage = 'plans';
    } else {
        data.redirectToPage = '';
    }
})();
