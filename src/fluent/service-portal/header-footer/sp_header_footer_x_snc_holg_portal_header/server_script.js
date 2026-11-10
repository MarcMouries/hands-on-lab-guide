// HOLG Portal Header - server script.
//
// Copied from the live OOTB "Stock Header" server script
// (sp_header_footer bf5ec2f2cb10120000f8d856634c9c0c, queried with run_query).
//
// CRITICAL: no IIFE wrapper - header/footer server scripts bind `data` directly.
//
// Scoped-app exception (service-portal-advanced-guide / ootb-reference):
// the OOTB line
//     data.langSelector = pm.isActive('com.glide.i18n') ? $sp.getWidget('sp-lang-selector') : "";
// is omitted. `pm` is global-scope only and throws '"pm" is not defined' in
// x_snc_holg on every page load. The template therefore renders no language
// selector either.
//
// The app title is NOT produced here - the template binds the platform-provided
// ::portal.title scope value (same binding the OOTB Stock Header uses).

// Defines the support queue ID that will be linked to by the Live Chat link in header
data.connect_support_queue_id = $sp.getValue('sp_chat_queue');
data.login_page = $sp.getValue('login_page');
data.profileBtnMsg = gs.getMessage('User options');
data.toggleMsg = gs.getMessage('Toggle navigation');

var menu = $sp.getValue('sp_rectangle_menu');
data.menu = $sp.getWidgetFromInstance(menu);

data.hasMenuItems = false;
data.hasLogin = false;

if (data.menu && data.menu.data) {
    data.menu.data.replace = true;
    // Hide login if menu already has link to login
    if (data.menu.data.menu && data.menu.data.menu.items) {
        data.hasMenuItems = data.menu.data.menu.items.length > 0;
        for (var i in data.menu.data.menu.items) {
            var item = data.menu.data.menu.items[i];
            if (item.type == 'page' && item.sp_page == data.login_page)
                data.hasLogin = true;
        }
    }
}
