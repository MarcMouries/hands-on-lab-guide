(function () {
    /* Role-based landing.
     *
     * Facilitator is checked FIRST and wins: anyone holding both app roles
     * must land on the facilitator dashboard, not the participant plan list.
     * This widget is authoritative for the redirect so the outcome does not
     * depend on whether the sp_page_route_map resolves for a bare /holg
     * request with no explicit ?id.
     *
     * Roles are asked for through LabApi.holdsAppRole, which reports what has
     * been GRANTED rather than what gs.hasRole makes of an admin. One
     * definition of "holds the role" for the whole app: a landing page that
     * disagreed with the REST layer would send an admin to a dashboard that
     * then refuses them. */
    var api = new x_snc_holg.LabApi();

    if (api.holdsAppRole('x_snc_holg.facilitator')) {
        data.redirectToPage = 'facilitator';
    } else if (api.holdsAppRole('x_snc_holg.participant')) {
        data.redirectToPage = 'plans';
    } else {
        data.redirectToPage = '';
    }
})();
